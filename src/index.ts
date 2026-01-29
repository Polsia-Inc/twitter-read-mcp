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
      if (!this.twitterClient) {
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
        const result = await this.handleToolCall(request.params.name, request.params.arguments || {});
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
    if (!this.twitterClient) {
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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Twitter Read MCP server running on stdio');
  }
}

// Start the server
const server = new TwitterReadServer();
server.run().catch(console.error);
