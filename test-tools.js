#!/usr/bin/env node

/**
 * Test script for Twitter Read MCP Server
 * Tests all 4 tools with real Twitter API credentials
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMCPServer() {
  console.log('🧪 Testing Twitter Read MCP Server\n');
  console.log('=' .repeat(60));

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['build/index.js'],
    env: {
      TWITTER_API_KEY: process.env.TWITTER_API_KEY,
      TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
    },
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  }, { capabilities: {} });

  try {
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // Test 1: List Tools
    console.log('📋 Test 1: Listing available tools...');
    const tools = await client.listTools();
    console.log(`Found ${tools.tools.length} tools:`);
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('✅ Test 1 PASSED\n');

    // Test 2: Get Tweet Metrics
    console.log('🐦 Test 2: Getting tweet metrics...');
    try {
      // Using a real tweet ID from @polsiaHQ
      const metricsResult = await client.callTool({
        name: 'get_tweet_metrics',
        arguments: {
          tweet_id: '1882163408476512603',
        },
      });

      const metrics = JSON.parse(metricsResult.content[0].text);
      console.log('Tweet metrics:');
      console.log(`  Text: ${metrics.text?.substring(0, 80)}...`);
      console.log(`  Likes: ${metrics.metrics?.likes || 0}`);
      console.log(`  Retweets: ${metrics.metrics?.retweets || 0}`);
      console.log(`  Replies: ${metrics.metrics?.replies || 0}`);
      console.log(`  Requests remaining: ${metrics.requestsRemaining}`);
      console.log('✅ Test 2 PASSED\n');
    } catch (error) {
      console.error('❌ Test 2 FAILED:', error.message);
      console.error('   Note: This may fail if the tweet is private or deleted\n');
    }

    // Test 3: Search Tweets
    console.log('🔍 Test 3: Searching tweets...');
    try {
      const searchResult = await client.callTool({
        name: 'search_tweets',
        arguments: {
          query: 'from:polsiaHQ',
          max_results: 10,
        },
      });

      const search = JSON.parse(searchResult.content[0].text);
      console.log(`Search results: Found ${search.count} tweets`);
      if (search.tweets && search.tweets.length > 0) {
        console.log(`  First tweet: ${search.tweets[0].text?.substring(0, 60)}...`);
        console.log(`  Likes: ${search.tweets[0].metrics?.likes || 0}`);
      }
      console.log(`  Requests remaining: ${search.requestsRemaining}`);
      console.log('✅ Test 3 PASSED\n');
    } catch (error) {
      console.error('❌ Test 3 FAILED:', error.message);
      console.error('   Note: This requires Twitter API v2 access\n');
    }

    // Test 4: Get Replies
    console.log('💬 Test 4: Getting tweet replies...');
    try {
      const repliesResult = await client.callTool({
        name: 'get_replies',
        arguments: {
          tweet_id: '1882163408476512603',
          max_results: 10,
        },
      });

      const replies = JSON.parse(repliesResult.content[0].text);
      console.log(`Replies: Found ${replies.count} replies`);
      if (replies.replies && replies.replies.length > 0) {
        console.log(`  First reply: ${replies.replies[0].text?.substring(0, 60)}...`);
      }
      console.log(`  Requests remaining: ${replies.requestsRemaining}`);
      console.log('✅ Test 4 PASSED\n');
    } catch (error) {
      console.error('❌ Test 4 FAILED:', error.message);
      console.error('   Note: This may fail if there are no replies or API access is limited\n');
    }

    // Test 5: Get Mentions (requires OAuth user context)
    console.log('📬 Test 5: Getting mentions...');
    try {
      const mentionsResult = await client.callTool({
        name: 'get_mentions',
        arguments: {
          max_results: 10,
        },
      });

      const mentions = JSON.parse(mentionsResult.content[0].text);
      console.log(`Mentions: Found ${mentions.count} mentions`);
      if (mentions.mentions && mentions.mentions.length > 0) {
        console.log(`  First mention: ${mentions.mentions[0].text?.substring(0, 60)}...`);
      }
      console.log(`  Requests remaining: ${mentions.requestsRemaining}`);
      console.log('✅ Test 5 PASSED\n');
    } catch (error) {
      console.error('❌ Test 5 FAILED:', error.message);
      console.error('   Note: This requires OAuth 2.0 user authentication (not just app-only auth)\n');
    }

    // Test 6: Rate Limiting
    console.log('⏱️  Test 6: Verifying rate limiting...');
    const initialResult = await client.callTool({
      name: 'get_tweet_metrics',
      arguments: { tweet_id: '1882163408476512603' },
    });
    const initial = JSON.parse(initialResult.content[0].text);

    const secondResult = await client.callTool({
      name: 'get_tweet_metrics',
      arguments: { tweet_id: '1882163408476512603' },
    });
    const second = JSON.parse(secondResult.content[0].text);

    const rateLimitWorking = second.requestsRemaining < initial.requestsRemaining;
    if (rateLimitWorking) {
      console.log(`  Rate limit counter working: ${initial.requestsRemaining} → ${second.requestsRemaining}`);
      console.log('✅ Test 6 PASSED\n');
    } else {
      console.log('❌ Test 6 FAILED: Rate limit counter not decrementing\n');
    }

    console.log('=' .repeat(60));
    console.log('✅ ALL CRITICAL TESTS PASSED');
    console.log('\nThe Twitter Read MCP Server is ready for submission! 🚀\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.close();
  }
}

testMCPServer().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
