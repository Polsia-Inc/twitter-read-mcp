# Quick Start Guide

Get the Twitter Read MCP Server running in 5 minutes.

## Prerequisites

- Node.js 18+
- Twitter Bearer Token ([get one here](https://developer.twitter.com/en/portal/dashboard))

## Installation

```bash
# 1. Navigate to the directory
cd twitter-read-mcp

# 2. Install dependencies
npm install

# 3. Build the server
npm run build
```

## Configuration

Create a `.env` file:

```bash
TWITTER_BEARER_TOKEN=your_bearer_token_here
```

## Usage with Claude Desktop

### 1. Edit Claude Config

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "twitter-read": {
      "command": "node",
      "args": ["/full/path/to/twitter-read-mcp/build/index.js"],
      "env": {
        "TWITTER_BEARER_TOKEN": "your_token_here"
      }
    }
  }
}
```

### 2. Restart Claude Desktop

Fully quit and reopen Claude Desktop.

### 3. Test It

Try this prompt in Claude:

```
Get metrics for tweet 1882163408476512603
```

## Available Tools

| Tool | Description | Example |
|------|-------------|---------|
| `get_tweet_metrics` | Get engagement metrics for any tweet | "Get metrics for tweet 1234567890" |
| `get_mentions` | Track recent @mentions | "Show mentions from yesterday" |
| `get_replies` | Get all replies to a tweet | "Get replies to tweet 1234567890" |
| `search_tweets` | Search with engagement data | "Search tweets from @polsiaHQ" |

## Example Queries

**Track your tweet performance**:
```
Get metrics for my latest tweet (ID: 1234567890)
```

**Monitor brand mentions**:
```
Show me all mentions from the last 24 hours
```

**Analyze a thread**:
```
Get all replies to tweet 1234567890 and summarize the sentiment
```

**Find viral content**:
```
Search for tweets from @polsiaHQ with more than 100 likes
```

## Troubleshooting

**Server not showing up in Claude**:
- Check config file path is correct
- Use ABSOLUTE path to index.js (not relative)
- Restart Claude Desktop completely

**"Missing credentials" error**:
- Verify Bearer Token is in config
- Test token at https://api.twitter.com/2/tweets/1234567890

**Rate limit errors**:
- You have 500 requests per 15 minutes
- Each response shows `requestsRemaining`

## Next Steps

- Read [README.md](README.md) for full documentation
- See [EXAMPLES.md](EXAMPLES.md) for marketing use cases
- Check [TESTING.md](TESTING.md) for advanced testing

## Get Help

- Issues: https://github.com/Polsia-Inc/polsiaos/issues
- Email: support@polsia.com
- Twitter: @polsiaHQ

Built by Polsia with ❤️
