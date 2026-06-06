#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { TwitterApi, TwitterApiReadOnly, TweetV2, UserV2 } from 'twitter-api-v2';

/**
 * Rate limiter to enforce Twitter API limits (500 requests per 15 minutes)
 */
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 500;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes

  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove requests outside the current window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  getRequestsRemaining(): number {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }
}

/**
 * Twitter Read MCP Server
 * Provides tools for reading Twitter/X engagement data and metrics
 */
class TwitterReadServer {
  private server: Server;
  private twitterClient: TwitterApiReadOnly | null = null;
  private readonly xquikApiKey = process.env.XQUIK_API_KEY || process.env.HERMES_TWEET_API_KEY;
  private readonly xquikBaseUrl = (process.env.XQUIK_BASE_URL || 'https://xquik.com').replace(/\/$/, '');
  private rateLimiter: RateLimiter;

  constructor() {
    this.server = new Server(
      {
        name: 'twitter-read-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.rateLimiter = new RateLimiter();

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private initializeTwitterClient(): void {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;

    if (bearerToken) {
      // Use bearer token for app-only authentication
      this.twitterClient = new TwitterApi(bearerToken).readOnly;
    } else if (apiKey && apiSecret) {
      // Use API key/secret for OAuth 2.0
      this.twitterClient = new TwitterApi({ appKey: apiKey, appSecret: apiSecret }).readOnly;
    } else {
      throw new Error(
        'Missing Twitter API credentials. Set TWITTER_BEARER_TOKEN or (TWITTER_API_KEY + TWITTER_API_SECRET)'
      );
    }
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;

      if (!this.canUseXquik(toolName) && !this.twitterClient) {
        this.initializeTwitterClient();
      }

      if (!this.rateLimiter.canMakeRequest()) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Rate limit exceeded',
                message: 'Maximum 500 requests per 15 minutes. Please try again later.',
                requestsRemaining: 0,
              }),
            },
          ],
        };
      }

      try {
        const result = await this.handleToolCall(toolName, request.params.arguments || {});
        this.rateLimiter.recordRequest();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.message || 'Unknown error',
                code: error.code,
                requestsRemaining: this.rateLimiter.getRequestsRemaining(),
              }),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'get_tweet_metrics',
        description: 'Get engagement metrics for a specific tweet including likes, retweets, replies, and impressions',
        inputSchema: {
          type: 'object',
          properties: {
            tweet_id: {
              type: 'string',
              description: 'The ID of the tweet to fetch metrics for',
            },
          },
          required: ['tweet_id'],
        },
      },
      {
        name: 'get_mentions',
        description: 'Get recent @mentions of the authenticated account',
        inputSchema: {
          type: 'object',
          properties: {
            since_date: {
              type: 'string',
              description: 'ISO 8601 date string (e.g., 2026-01-20T00:00:00Z). Only tweets after this date will be returned.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of mentions to return (5-100, default: 10)',
              default: 10,
            },
          },
        },
      },
      {
        name: 'get_replies',
        description: 'Get replies to a specific tweet',
        inputSchema: {
          type: 'object',
          properties: {
            tweet_id: {
              type: 'string',
              description: 'The ID of the tweet to fetch replies for',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of replies to return (5-100, default: 10)',
              default: 10,
            },
          },
          required: ['tweet_id'],
        },
      },
      {
        name: 'search_tweets',
        description: 'Search for tweets matching a query and return results with engagement metrics',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string (supports Twitter search operators)',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of tweets to return (10-100, default: 10)',
              default: 10,
            },
            start_time: {
              type: 'string',
              description: 'ISO 8601 date string for earliest tweet (e.g., 2026-01-20T00:00:00Z)',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  private async handleToolCall(name: string, args: any): Promise<any> {
    if (!this.canUseXquik(name) && !this.twitterClient) {
      throw new Error('Twitter client not initialized');
    }

    switch (name) {
      case 'get_tweet_metrics':
        return await this.getTweetMetrics(args.tweet_id);

      case 'get_mentions':
        return await this.getMentions(args.since_date, args.max_results);

      case 'get_replies':
        return await this.getReplies(args.tweet_id, args.max_results);

      case 'search_tweets':
        return await this.searchTweets(args.query, args.max_results, args.start_time);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Get metrics for a specific tweet
   */
  private async getTweetMetrics(tweetId: string): Promise<any> {
    if (this.xquikApiKey) {
      const tweet = this.normalizeXquikTweet(await this.xquikRequest(`/api/v1/x/tweets/${tweetId}`));

      return {
        ...tweet,
        requestsRemaining: this.rateLimiter.getRequestsRemaining(),
      };
    }

    const tweet = await this.twitterClient!.v2.singleTweet(tweetId, {
      'tweet.fields': [
        'public_metrics',
        'non_public_metrics',
        'organic_metrics',
        'promoted_metrics',
        'created_at',
        'author_id',
      ],
    });

    return {
      tweet_id: tweet.data.id,
      text: tweet.data.text,
      created_at: tweet.data.created_at,
      author_id: tweet.data.author_id,
      metrics: {
        likes: tweet.data.public_metrics?.like_count || 0,
        retweets: tweet.data.public_metrics?.retweet_count || 0,
        replies: tweet.data.public_metrics?.reply_count || 0,
        quotes: tweet.data.public_metrics?.quote_count || 0,
        bookmarks: tweet.data.public_metrics?.bookmark_count || 0,
        impressions: tweet.data.public_metrics?.impression_count ||
                     tweet.data.non_public_metrics?.impression_count ||
                     tweet.data.organic_metrics?.impression_count || 0,
      },
      requestsRemaining: this.rateLimiter.getRequestsRemaining(),
    };
  }

  /**
   * Get recent mentions of the authenticated user
   */
  private async getMentions(sinceDate?: string, maxResults: number = 10): Promise<any> {
    if (!this.twitterClient) {
      this.initializeTwitterClient();
    }

    // Get authenticated user's ID
    const me = await this.twitterClient!.v2.me();

    const options: any = {
      'tweet.fields': ['created_at', 'author_id', 'public_metrics'],
      'user.fields': ['username', 'name'],
      max_results: Math.min(Math.max(maxResults, 5), 100),
    };

    if (sinceDate) {
      options.start_time = sinceDate;
    }

    const mentions = await this.twitterClient!.v2.userMentionTimeline(me.data.id, options);

    return {
      mentions: mentions.data.data?.map((tweet: TweetV2) => ({
        tweet_id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        author_id: tweet.author_id,
        metrics: {
          likes: tweet.public_metrics?.like_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          replies: tweet.public_metrics?.reply_count || 0,
          quotes: tweet.public_metrics?.quote_count || 0,
        },
      })) || [],
      count: mentions.data.data?.length || 0,
      requestsRemaining: this.rateLimiter.getRequestsRemaining(),
    };
  }

  /**
   * Get replies to a specific tweet
   */
  private async getReplies(tweetId: string, maxResults: number = 10): Promise<any> {
    if (this.xquikApiKey) {
      const query = `conversation_id:${tweetId}`;
      const tweets = await this.xquikSearch(query, maxResults);

      return {
        replies: tweets,
        count: tweets.length,
        requestsRemaining: this.rateLimiter.getRequestsRemaining(),
      };
    }

    // Search for tweets that are in reply to the target tweet
    const replies = await this.twitterClient!.v2.search(`conversation_id:${tweetId}`, {
      'tweet.fields': ['created_at', 'author_id', 'public_metrics', 'referenced_tweets'],
      'user.fields': ['username', 'name'],
      max_results: Math.min(Math.max(maxResults, 10), 100),
    });

    return {
      replies: replies.data.data?.map((tweet: TweetV2) => ({
        tweet_id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        author_id: tweet.author_id,
        metrics: {
          likes: tweet.public_metrics?.like_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          replies: tweet.public_metrics?.reply_count || 0,
          quotes: tweet.public_metrics?.quote_count || 0,
        },
      })) || [],
      count: replies.data.data?.length || 0,
      requestsRemaining: this.rateLimiter.getRequestsRemaining(),
    };
  }

  /**
   * Search tweets with engagement metrics
   */
  private async searchTweets(query: string, maxResults: number = 10, startTime?: string): Promise<any> {
    if (this.xquikApiKey) {
      const queryWithStartTime = startTime ? `${query} since:${startTime.slice(0, 10)}` : query;
      const tweets = await this.xquikSearch(queryWithStartTime, maxResults);

      return {
        tweets,
        count: tweets.length,
        query,
        requestsRemaining: this.rateLimiter.getRequestsRemaining(),
      };
    }

    const options: any = {
      'tweet.fields': ['created_at', 'author_id', 'public_metrics'],
      'user.fields': ['username', 'name'],
      max_results: Math.min(Math.max(maxResults, 10), 100),
    };

    if (startTime) {
      options.start_time = startTime;
    }

    const results = await this.twitterClient!.v2.search(query, options);

    return {
      tweets: results.data.data?.map((tweet: TweetV2) => ({
        tweet_id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        author_id: tweet.author_id,
        metrics: {
          likes: tweet.public_metrics?.like_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          replies: tweet.public_metrics?.reply_count || 0,
          quotes: tweet.public_metrics?.quote_count || 0,
        },
      })) || [],
      count: results.data.data?.length || 0,
      query,
      requestsRemaining: this.rateLimiter.getRequestsRemaining(),
    };
  }

  private canUseXquik(toolName: string): boolean {
    return Boolean(
      this.xquikApiKey &&
        ['get_tweet_metrics', 'get_replies', 'search_tweets'].includes(toolName)
    );
  }

  private async xquikRequest(path: string, query: Record<string, string | number | undefined> = {}): Promise<any> {
    if (!this.xquikApiKey) {
      throw new Error('Missing Xquik credentials. Set XQUIK_API_KEY or HERMES_TWEET_API_KEY');
    }

    const url = new URL(path, this.xquikBaseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.xquikApiKey}`,
        'X-API-Key': this.xquikApiKey,
      },
    });

    const text = await response.text();
    const data = this.parseJson(text);

    if (!response.ok) {
      const message = this.firstValue(data, ['message', 'error', 'detail']) || text;
      throw new Error(`Xquik API ${response.status}: ${message}`);
    }

    return data;
  }

  private async xquikSearch(query: string, maxResults: number): Promise<any[]> {
    const data = await this.xquikRequest('/api/v1/x/tweets/search', {
      q: query,
      limit: Math.min(Math.max(maxResults, 10), 100),
    });

    return this.findTweetList(data).map(tweet => this.normalizeXquikTweet(tweet));
  }

  private parseJson(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  private findTweetList(value: any): any[] {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];

    for (const key of ['tweets', 'results', 'items', 'data']) {
      const candidate = value[key];
      if (Array.isArray(candidate)) return candidate;

      const nested = this.findTweetList(candidate);
      if (nested.length > 0) return nested;
    }

    return [];
  }

  private firstValue(value: any, keys: string[]): string | undefined {
    if (!value || typeof value !== 'object') return undefined;

    for (const key of keys) {
      const candidate = value[key];
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        return String(candidate);
      }
    }

    for (const child of Object.values(value)) {
      const nested = this.firstValue(child, keys);
      if (nested) return nested;
    }

    return undefined;
  }

  private numericValue(value: any, keys: string[]): number {
    const raw = this.firstValue(value, keys);
    if (!raw) return 0;

    const parsed = Number(raw.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeXquikTweet(tweet: any): any {
    return {
      tweet_id: this.firstValue(tweet, ['tweet_id', 'tweetId', 'id', 'id_str', 'rest_id']) || '',
      text: this.firstValue(tweet, ['text', 'full_text', 'fullText', 'content']) || '',
      created_at: this.firstValue(tweet, ['created_at', 'createdAt', 'creation_date', 'creationDate', 'date']),
      author_id: this.firstValue(tweet, ['author_id', 'authorId', 'user_id', 'userId', 'username', 'handle']),
      metrics: {
        likes: this.numericValue(tweet, ['like_count', 'likeCount', 'favorite_count', 'favoriteCount', 'likes']),
        retweets: this.numericValue(tweet, ['retweet_count', 'retweetCount', 'retweets']),
        replies: this.numericValue(tweet, ['reply_count', 'replyCount', 'replies']),
        quotes: this.numericValue(tweet, ['quote_count', 'quoteCount', 'quotes']),
        bookmarks: this.numericValue(tweet, ['bookmark_count', 'bookmarkCount', 'bookmarks']),
        impressions: this.numericValue(tweet, ['impression_count', 'impressionCount', 'views', 'view_count', 'viewCount']),
      },
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Twitter Read MCP server running on stdio');
  }
}

// Start the server
const server = new TwitterReadServer();
server.run().catch(console.error);
