#!/usr/bin/env node

/**
 * Direct test of Twitter API v2 with current credentials
 */

import { TwitterApi } from 'twitter-api-v2';

async function testTwitterAPI() {
  console.log('🧪 Testing Twitter API v2 Direct Access\n');

  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('❌ Missing TWITTER_API_KEY or TWITTER_API_SECRET');
    process.exit(1);
  }

  console.log('✅ Found credentials:');
  console.log(`   API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`   API Secret: ${apiSecret.substring(0, 10)}...\n`);

  try {
    // Test 1: App-only authentication
    console.log('📡 Test 1: Initializing Twitter client with app credentials...');
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
    });

    // Get app-only bearer token
    const appClient = await client.appLogin();
    console.log('✅ App-only authentication successful\n');

    // Test 2: Get tweet metrics
    console.log('🐦 Test 2: Fetching tweet metrics...');
    try {
      const response = await appClient.v2.singleTweet('1882163408476512603', {
        'tweet.fields': ['public_metrics', 'created_at', 'author_id'],
      });

      console.log('Raw response:', JSON.stringify(response, null, 2));

      if (response.data) {
        console.log('✅ Tweet fetched successfully:');
        console.log(`   ID: ${response.data.id}`);
        console.log(`   Text: ${response.data.text?.substring(0, 80)}...`);
        console.log(`   Likes: ${response.data.public_metrics?.like_count || 0}`);
        console.log(`   Retweets: ${response.data.public_metrics?.retweet_count || 0}`);
        console.log(`   Replies: ${response.data.public_metrics?.reply_count || 0}\n`);
      } else {
        console.log('❌ No data in response');
      }
    } catch (error) {
      console.error('❌ Failed to fetch tweet:', error.message);
      if (error.data) console.error('   Error data:', JSON.stringify(error.data, null, 2));
      console.log();
    }

    // Test 3: Search tweets
    console.log('🔍 Test 3: Searching tweets...');
    try {
      const search = await appClient.v2.search('from:polsiaHQ', {
        'tweet.fields': ['created_at', 'public_metrics'],
        max_results: 10,
      });

      console.log('✅ Search successful:');
      console.log(`   Found ${search.data.data?.length || 0} tweets`);
      if (search.data.data && search.data.data.length > 0) {
        const first = search.data.data[0];
        console.log(`   First: ${first.text?.substring(0, 60)}...`);
        console.log(`   Likes: ${first.public_metrics?.like_count || 0}\n`);
      }
    } catch (error) {
      console.error('❌ Search failed:', error.message);
      if (error.data) console.error('   Error data:', JSON.stringify(error.data, null, 2));
      console.log();
    }

    // Test 4: Check if we have user context access
    console.log('👤 Test 4: Checking user context access...');
    try {
      // This requires OAuth 1.0a user context
      const userClient = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
      });

      const me = await userClient.v2.me();
      console.log('✅ User authentication successful:');
      console.log(`   Username: @${me.data.username}`);
      console.log(`   Name: ${me.data.name}\n`);

      // Try to get mentions
      console.log('📬 Test 5: Fetching mentions...');
      const mentions = await userClient.v2.userMentionTimeline(me.data.id, {
        'tweet.fields': ['created_at', 'public_metrics'],
        max_results: 10,
      });

      console.log('✅ Mentions fetched:');
      console.log(`   Found ${mentions.data.data?.length || 0} mentions\n`);
    } catch (error) {
      console.error('❌ User context failed:', error.message);
      if (error.code === 403) {
        console.error('   Note: This requires OAuth 1.0a user tokens, not just app credentials');
      }
      if (error.data) console.error('   Error data:', JSON.stringify(error.data, null, 2));
      console.log();
    }

    console.log('=' .repeat(60));
    console.log('✅ Twitter API v2 is functional with these credentials\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    if (error.data) console.error('Error data:', JSON.stringify(error.data, null, 2));
    process.exit(1);
  }
}

testTwitterAPI().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
