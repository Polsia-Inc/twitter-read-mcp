# Testing Guide

This guide explains how to test the Twitter Read MCP Server locally and prepare it for submission.

## Local Testing Setup

### 1. Get Twitter API Credentials

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app (or use existing)
3. Navigate to "Keys and tokens"
4. Copy your **Bearer Token** (recommended) or **API Key + Secret**

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
TWITTER_BEARER_TOKEN=your_actual_bearer_token_here
```

### 3. Build and Run

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Run the server
npm run dev
```

You should see:
```
Twitter Read MCP server running on stdio
```

## Testing with Claude Desktop

### Configure Claude Desktop

Edit your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the MCP server:

```json
{
  "mcpServers": {
    "twitter-read": {
      "command": "node",
      "args": ["/absolute/path/to/twitter-read-mcp/build/index.js"],
      "env": {
        "TWITTER_BEARER_TOKEN": "your_bearer_token_here"
      }
    }
  }
}
```

### Restart Claude Desktop

After saving the config, fully quit and restart Claude Desktop.

### Test the Tools

Try these prompts in Claude:

**Test 1: Get Tweet Metrics**
```
Use the twitter-read MCP to get metrics for tweet ID 1882163408476512603
```

**Expected response structure**:
```json
{
  "tweet_id": "1882163408476512603",
  "text": "...",
  "metrics": {
    "likes": 123,
    "retweets": 45,
    "replies": 12,
    "quotes": 3,
    "bookmarks": 67,
    "impressions": 5432
  },
  "requestsRemaining": 499
}
```

**Test 2: Search Tweets**
```
Search for tweets from @polsiaHQ in the last 24 hours
```

**Test 3: Get Mentions**
```
Show me recent mentions of the authenticated account
```

**Test 4: Get Replies**
```
Get replies to tweet 1882163408476512603
```

## Verification Checklist

Before submitting, verify:

- [x] ✅ TypeScript compiles without errors
- [x] ✅ All 4 tools are defined and registered
- [x] ✅ Rate limiting works (check requestsRemaining field)
- [x] ✅ Error handling returns structured errors
- [x] ✅ README.md is comprehensive
- [x] ✅ EXAMPLES.md has real use cases
- [x] ✅ LICENSE file exists (MIT)
- [x] ✅ .gitignore excludes node_modules, .env, build artifacts

## Testing Rate Limiting

The server enforces 500 requests per 15 minutes. To test:

```bash
# Make 10 rapid requests in Claude Desktop
# Each response should decrement requestsRemaining
# Request 501 should return rate limit error
```

## Testing Error Handling

### Missing Credentials

Remove your .env file and try running:

```bash
npm run dev
```

Expected error:
```
Missing Twitter API credentials. Set TWITTER_BEARER_TOKEN or (TWITTER_API_KEY + TWITTER_API_SECRET)
```

### Invalid Tweet ID

Try getting metrics for a non-existent tweet:
```
Get metrics for tweet 999999999999999999
```

Should return structured error response.

### Rate Limit Exceeded

After 500 requests in 15 minutes:
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 500 requests per 15 minutes. Please try again later.",
  "requestsRemaining": 0
}
```

## Performance Testing

Monitor response times:

```bash
# Time a single request
time node -e "
const { TwitterApi } = require('twitter-api-v2');
const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN).readOnly;
client.v2.singleTweet('1882163408476512603', {
  'tweet.fields': ['public_metrics']
}).then(console.log);
"
```

Expected: < 500ms for most requests

## Debugging

### Enable Debug Logging

Modify `src/index.ts` to add debug output:

```typescript
console.error(`[DEBUG] Handling tool call: ${name}`, args);
```

### Check MCP Communication

The MCP protocol uses JSON-RPC over stdio. You can inspect messages:

```typescript
// In setupToolHandlers()
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error('[MCP Request]', JSON.stringify(request, null, 2));
  // ... rest of handler
});
```

### Common Issues

**"Twitter client not initialized"**
- Solution: Check environment variables are set correctly

**"Rate limit exceeded" immediately**
- Solution: Wait 15 minutes or check system clock is correct

**"Cannot find module '@modelcontextprotocol/sdk'"**
- Solution: Run `npm install` again

**Tools not appearing in Claude Desktop**
- Solution: Check config file path and syntax, restart Claude Desktop

## Next Steps

Once testing passes:

1. **Create standalone repository**:
   ```bash
   # Extract to separate repo
   cd twitter-read-mcp
   git init
   git add .
   git commit -m "Initial commit: Twitter Read MCP Server"
   ```

2. **Publish to npm** (optional):
   ```bash
   npm login
   npm publish --access public
   ```

3. **Submit to Model Context Protocol**:
   - Option A: Submit PR to https://github.com/modelcontextprotocol/servers
   - Option B: Publish independently and share on MCP community

## Integration Testing

Test the MCP server with a real application:

```typescript
// test-integration.js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['build/index.js'],
  env: {
    TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN,
  },
});

const client = new Client({
  name: 'test-client',
  version: '1.0.0',
}, { capabilities: {} });

await client.connect(transport);

// List tools
const tools = await client.listTools();
console.log('Available tools:', tools);

// Call a tool
const result = await client.callTool('get_tweet_metrics', {
  tweet_id: '1882163408476512603',
});
console.log('Result:', result);

await client.close();
```

Run:
```bash
node test-integration.js
```

## Submission Checklist

Before creating PR or publishing:

- [ ] All tests pass
- [ ] Documentation is complete and accurate
- [ ] Examples work with real Twitter data
- [ ] Rate limiting is enforced
- [ ] Error handling is comprehensive
- [ ] Code follows TypeScript best practices
- [ ] No hardcoded credentials or secrets
- [ ] LICENSE file is included
- [ ] README has clear installation instructions
- [ ] CONTRIBUTING guide is helpful

## Questions?

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.
