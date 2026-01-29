# Twitter Read MCP Server

<!-- mcp-name: twitter-read -->

An MCP (Model Context Protocol) server for reading Twitter/X engagement data and metrics. Enables AI agents to measure tweet performance, track mentions, analyze replies, and search tweets with engagement metrics.

## Features

- **Get Tweet Metrics**: Fetch likes, retweets, replies, quotes, bookmarks, and impressions for any tweet
- **Get Mentions**: Retrieve recent @mentions with engagement data
- **Get Replies**: Access all replies to a specific tweet with metrics
- **Search Tweets**: Search Twitter with engagement metrics included
- **Built-in Rate Limiting**: Enforces Twitter API limits (500 requests per 15 minutes)
- **OAuth 2.0 Support**: Compatible with Twitter API v2 authentication

## Installation

### Prerequisites

- Node.js 18 or higher
- Twitter API credentials (Bearer Token or API Key + Secret)

### From Source

```bash
git clone <repository-url>
cd twitter-read-mcp
npm install
npm run build
```

### From npm (future)

```bash
npm install -g @polsia/twitter-read-mcp
```

## Configuration

### Twitter API Credentials

You need Twitter API access. Get credentials from [Twitter Developer Portal](https://developer.twitter.com/):

1. Create a Twitter Developer account
2. Create a new App
3. Generate credentials

### Environment Variables

Create a `.env` file or set environment variables:

```bash
# Option 1: Bearer Token (recommended for read-only access)
TWITTER_BEARER_TOKEN=your_bearer_token_here

# Option 2: API Key + Secret (for OAuth 2.0)
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
```

**Note**: Bearer token is simpler for read-only operations. API Key + Secret is required for user-context operations like getting your own mentions.

### MCP Configuration

Add to your MCP settings file (e.g., Claude Desktop config):

```json
{
  "mcpServers": {
    "twitter-read": {
      "command": "twitter-read-mcp",
      "env": {
        "TWITTER_BEARER_TOKEN": "your_bearer_token_here"
      }
    }
  }
}
```

Or if installed from source:

```json
{
  "mcpServers": {
    "twitter-read": {
      "command": "node",
      "args": ["/path/to/twitter-read-mcp/build/index.js"],
      "env": {
        "TWITTER_BEARER_TOKEN": "your_bearer_token_here"
      }
    }
  }
}
```

## Usage

### Available Tools

#### 1. `get_tweet_metrics`

Get engagement metrics for a specific tweet.

**Parameters:**
- `tweet_id` (required): The ID of the tweet

**Returns:**
```json
{
  "tweet_id": "1234567890",
  "text": "Tweet content here",
  "created_at": "2026-01-25T00:00:00.000Z",
  "author_id": "1234567890",
  "metrics": {
    "likes": 42,
    "retweets": 8,
    "replies": 5,
    "quotes": 2,
    "bookmarks": 10,
    "impressions": 5000
  },
  "requestsRemaining": 498
}
```

**Example:**
```
Get metrics for tweet 1882163408476512603
```

#### 2. `get_mentions`

Get recent @mentions of your account.

**Parameters:**
- `since_date` (optional): ISO 8601 date (e.g., "2026-01-20T00:00:00Z")
- `max_results` (optional): Number of mentions to return (5-100, default: 10)

**Returns:**
```json
{
  "mentions": [
    {
      "tweet_id": "1234567890",
      "text": "@yourhandle great work!",
      "created_at": "2026-01-25T00:00:00.000Z",
      "author_id": "9876543210",
      "metrics": {
        "likes": 5,
        "retweets": 1,
        "replies": 0,
        "quotes": 0
      }
    }
  ],
  "count": 1,
  "requestsRemaining": 497
}
```

**Example:**
```
Show me mentions from the last 24 hours
```

#### 3. `get_replies`

Get all replies to a specific tweet.

**Parameters:**
- `tweet_id` (required): The ID of the tweet
- `max_results` (optional): Number of replies to return (5-100, default: 10)

**Returns:**
```json
{
  "replies": [
    {
      "tweet_id": "1234567891",
      "text": "This is a reply",
      "created_at": "2026-01-25T01:00:00.000Z",
      "author_id": "9876543210",
      "metrics": {
        "likes": 2,
        "retweets": 0,
        "replies": 1,
        "quotes": 0
      }
    }
  ],
  "count": 1,
  "requestsRemaining": 496
}
```

**Example:**
```
Get all replies to tweet 1882163408476512603
```

#### 4. `search_tweets`

Search for tweets matching a query with engagement metrics.

**Parameters:**
- `query` (required): Search query (supports [Twitter search operators](https://developer.twitter.com/en/docs/twitter-api/tweets/search/integrate/build-a-query))
- `max_results` (optional): Number of tweets to return (10-100, default: 10)
- `start_time` (optional): ISO 8601 date for earliest tweet

**Returns:**
```json
{
  "tweets": [
    {
      "tweet_id": "1234567890",
      "text": "Tweet matching your query",
      "created_at": "2026-01-25T00:00:00.000Z",
      "author_id": "1234567890",
      "metrics": {
        "likes": 100,
        "retweets": 20,
        "replies": 10,
        "quotes": 5
      }
    }
  ],
  "count": 1,
  "query": "from:polsiaHQ",
  "requestsRemaining": 495
}
```

**Example:**
```
Search for tweets from @polsiaHQ in the last week
```

## Rate Limiting

The server enforces Twitter API v2 rate limits:
- **500 requests per 15-minute window**
- Each tool response includes `requestsRemaining` field
- Requests beyond the limit return a rate limit error

## Development

### Building

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Testing Locally

Run the MCP server directly:

```bash
export TWITTER_BEARER_TOKEN=your_token
npm run dev
```

The server communicates via stdio, so you'll need an MCP client to interact with it.

## Architecture

- **Language**: TypeScript
- **MCP SDK**: `@modelcontextprotocol/sdk` v1.x
- **Twitter Client**: `twitter-api-v2` for Twitter API v2
- **Transport**: stdio (standard MCP transport)
- **Authentication**: Bearer Token or OAuth 2.0 PKCE

## Error Handling

All tools return structured error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "requestsRemaining": 499
}
```

Common errors:
- `Rate limit exceeded`: Too many requests in 15-minute window
- `Missing Twitter API credentials`: Environment variables not set
- `Invalid tweet ID`: Tweet doesn't exist or is private
- `Search query too complex`: Simplify your search query

## Contributing

This project is part of the Polsia ecosystem. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Roadmap

- [ ] OAuth 2.0 PKCE flow for user authentication
- [ ] Caching layer for frequently accessed tweets
- [ ] Batch operations for multiple tweets
- [ ] Historical data fetching (7-day window)
- [ ] User profile metrics
- [ ] List management tools

## License

MIT License - See LICENSE file for details

## Support

- **Documentation**: [Twitter API v2 Docs](https://developer.twitter.com/en/docs/twitter-api)
- **MCP Specification**: [Model Context Protocol](https://modelcontextprotocol.io/)
- **Issues**: Report bugs and feature requests on GitHub

## Credits

Built by Polsia for measuring marketing performance on Twitter/X. Powered by the Model Context Protocol from Anthropic.
