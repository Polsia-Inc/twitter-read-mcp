# Usage Examples

This document provides real-world examples of using the Twitter Read MCP Server for marketing measurement and analysis.

## Marketing Performance Tracking

### Measuring Tweet Engagement

Track how your marketing tweets perform:

```
Get metrics for tweet 1882163408476512603
```

**Response:**
```json
{
  "tweet_id": "1882163408476512603",
  "text": "Introducing our new feature: AI-powered analytics! 🚀",
  "metrics": {
    "likes": 247,
    "retweets": 42,
    "replies": 18,
    "quotes": 5,
    "bookmarks": 89,
    "impressions": 12453
  },
  "requestsRemaining": 498
}
```

**Key Insights:**
- **Engagement Rate**: (247 + 42 + 18) / 12453 = 2.47%
- **Bookmark Rate**: 89 / 12453 = 0.71% (high interest)
- **RT/Like Ratio**: 42 / 247 = 17% (strong virality)

### Campaign Performance Analysis

Compare multiple tweets from a campaign:

```
Search for tweets from @polsiaHQ with "#ProductLaunch" from the last 7 days
Query: from:polsiaHQ #ProductLaunch
Max results: 50
Start time: 2026-01-18T00:00:00Z
```

**Use Case**: Analyze which messaging resonated best during your product launch.

## Community Management

### Tracking Mentions

Monitor brand mentions to respond quickly:

```
Get mentions since 2026-01-24T00:00:00Z with max 20 results
```

**Response:**
```json
{
  "mentions": [
    {
      "tweet_id": "1234567890",
      "text": "@polsiaHQ This is exactly what we needed!",
      "author_id": "9876543210",
      "metrics": {
        "likes": 12,
        "retweets": 2,
        "replies": 1
      }
    }
  ],
  "count": 1
}
```

**Action Items:**
- Respond to high-engagement mentions first (>10 likes)
- Track sentiment by analyzing reply text
- Identify brand advocates (frequent positive mentions)

### Reply Analysis

Understand conversation quality:

```
Get replies to tweet 1882163408476512603 with max 100 results
```

**Analysis Questions:**
- What % of replies are questions? → Need better documentation
- What % are positive? → Measure sentiment
- Are replies getting engagement? → Conversation quality

## Competitive Intelligence

### Competitor Monitoring

Track competitor announcements:

```
Search tweets: from:competitor OR @competitor
Max results: 100
Start time: 2026-01-01T00:00:00Z
```

**Metrics to Track:**
- Average engagement rate
- Best-performing content types
- Launch timing and messaging

### Industry Trends

Find trending topics in your space:

```
Search tweets: (#AI OR #MachineLearning) (announcement OR launch)
Max results: 100
```

**Use Case**: Identify what resonates in your industry to inform content strategy.

## Content Strategy

### Best Performing Content

Find your top tweets:

```
Search tweets: from:polsiaHQ
Max results: 100
Start time: 2026-01-01T00:00:00Z
```

**Analysis:**
1. Sort by engagement rate (likes + RTs + replies) / impressions
2. Identify patterns in top performers:
   - Time of day posted
   - Content type (announcement, tutorial, meme)
   - Media type (image, video, text)
   - Length and tone

### Engagement Timing

Track when your audience is most active:

```
Get mentions since 2026-01-01T00:00:00Z with max 100 results
```

**Analysis**: Group mentions by hour/day to find optimal posting times.

## Real-World Workflows

### Daily Marketing Report

**Goal**: Generate a daily performance summary.

**Steps:**
1. Get yesterday's tweets from your account
2. Calculate total impressions, engagement rate
3. Identify top performer
4. Check mentions for urgent responses

**Implementation:**
```typescript
// Get tweets from last 24 hours
const yesterday = new Date(Date.now() - 86400000).toISOString();
const tweets = await searchTweets(`from:polsiaHQ`, 100, yesterday);

// Calculate metrics
const totalImpressions = tweets.tweets.reduce((sum, t) => sum + t.metrics.impressions, 0);
const totalEngagement = tweets.tweets.reduce((sum, t) =>
  sum + t.metrics.likes + t.metrics.retweets + t.metrics.replies, 0);
const engagementRate = (totalEngagement / totalImpressions * 100).toFixed(2);

// Find top performer
const topTweet = tweets.tweets.sort((a, b) =>
  (b.metrics.likes + b.metrics.retweets) - (a.metrics.likes + a.metrics.retweets)
)[0];

console.log(`Daily Report:
- Total Impressions: ${totalImpressions}
- Engagement Rate: ${engagementRate}%
- Top Tweet: ${topTweet.text} (${topTweet.metrics.likes} likes)
`);
```

### Launch Day Monitoring

**Goal**: Track product launch announcement performance in real-time.

**Steps:**
1. Post launch tweet
2. Check metrics every hour
3. Monitor replies for feedback/questions
4. Track mentions for community response

**Example:**
```
Hour 1: Get metrics for launch tweet
Hour 2: Get replies - respond to questions
Hour 3: Get mentions - thank supporters
Hour 6: Get metrics again - calculate velocity
```

**Key Metrics:**
- **Engagement Velocity**: Likes/hour in first 6 hours
- **Reply Quality**: Question vs. feedback vs. praise ratio
- **Reach Expansion**: Impressions growth rate

### Influencer Outreach Tracking

**Goal**: Identify influencers engaging with your brand.

**Steps:**
1. Get all mentions
2. Check each author's tweet for engagement
3. Rank by: (follower_count * engagement_rate)
4. Prioritize outreach to high-impact accounts

**Implementation:**
```typescript
// Get mentions
const mentions = await getMentions(since_date, 100);

// For each mention, check the author's engagement
for (const mention of mentions.mentions) {
  const authorMetrics = await getTweetMetrics(mention.tweet_id);
  const engagementScore =
    authorMetrics.metrics.likes +
    authorMetrics.metrics.retweets * 2 +
    authorMetrics.metrics.replies * 3;

  if (engagementScore > 100) {
    console.log(`High-impact mention from ${mention.author_id}`);
  }
}
```

## Advanced Search Queries

### Find Viral Content

```
Search: (from:polsiaHQ) min_retweets:50
```

### Track Specific Campaign

```
Search: from:polsiaHQ (#SummerSale OR "summer sale")
Start time: 2026-06-01T00:00:00Z
```

### Monitor Customer Feedback

```
Search: @polsiaHQ (love OR hate OR bug OR issue OR feature)
```

### Find Brand Advocates

```
Search: @polsiaHQ (amazing OR awesome OR love OR best)
Max results: 100
```

## Rate Limit Management

With 500 requests per 15 minutes, plan your usage:

**High-Frequency Use Cases** (every 5 minutes):
- Mention monitoring during launch: ~180 requests/15min ✅
- Real-time reply tracking: ~180 requests/15min ✅

**Batch Operations** (hourly):
- Daily report generation: ~50 requests ✅
- Competitor analysis: ~200 requests ✅

**Avoid**:
- Polling individual tweets every minute ❌
- Fetching 100+ tweets per search repeatedly ❌

**Best Practice**: Cache results for 5-10 minutes when possible.

## Metrics Glossary

- **Likes**: Users who liked the tweet
- **Retweets**: Users who retweeted (includes quote tweets)
- **Replies**: Direct replies to the tweet
- **Quotes**: Retweets with added commentary
- **Bookmarks**: Users who saved the tweet (private action)
- **Impressions**: Total times the tweet was viewed

**Engagement Rate Formula**:
```
(Likes + Retweets + Replies + Quotes) / Impressions × 100
```

**Good Benchmarks** (varies by industry):
- **0.5-1%**: Average
- **1-3%**: Good
- **3-6%**: Excellent
- **6%+**: Viral

## Troubleshooting

### "Rate limit exceeded"

**Solution**: Wait 15 minutes or reduce request frequency. Check `requestsRemaining` in responses.

### "Invalid tweet ID"

**Cause**: Tweet deleted, private, or ID is wrong.
**Solution**: Verify the tweet exists and is public.

### "Missing impressions data"

**Cause**: Impressions require owner context (your own tweets).
**Solution**: Use OAuth 2.0 with user access token for your account.

## Next Steps

- Build a dashboard that visualizes these metrics
- Set up automated daily reports
- Create alerts for high-engagement mentions
- Track competitor performance over time

For more examples, see the [Twitter API v2 documentation](https://developer.twitter.com/en/docs/twitter-api).
