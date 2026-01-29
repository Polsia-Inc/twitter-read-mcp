# Contributing to Twitter Read MCP Server

Thank you for your interest in contributing! This project is part of the Polsia ecosystem and follows open-source best practices.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Install dependencies**: `npm install`
4. **Build the project**: `npm run build`
5. **Make your changes**
6. **Test your changes**
7. **Submit a pull request**

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Twitter API credentials for testing

### Build Commands

```bash
# Build once
npm run build

# Watch mode (rebuild on changes)
npm run watch

# Run the MCP server locally
npm run dev
```

### Project Structure

```
twitter-read-mcp/
├── src/
│   └── index.ts          # Main MCP server implementation
├── build/                # Compiled JavaScript output
├── README.md            # User documentation
├── EXAMPLES.md          # Usage examples
├── CONTRIBUTING.md      # This file
└── package.json         # Project metadata
```

## Code Style

- **TypeScript**: Use strict type checking
- **Formatting**: Consistent indentation (2 spaces)
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Comments**: Document complex logic and public APIs

## Testing

Before submitting a PR:

1. **Build succeeds**: `npm run build` completes without errors
2. **TypeScript compiles**: No type errors
3. **Manual testing**: Test with an MCP client (e.g., Claude Desktop)

### Testing Locally

Create a `.env` file with your Twitter credentials:

```bash
TWITTER_BEARER_TOKEN=your_token_here
```

Run the server:

```bash
npm run dev
```

Test with an MCP client by adding to your config:

```json
{
  "mcpServers": {
    "twitter-read-dev": {
      "command": "node",
      "args": ["/path/to/twitter-read-mcp/build/index.js"],
      "env": {
        "TWITTER_BEARER_TOKEN": "your_token"
      }
    }
  }
}
```

## Making Changes

### Adding a New Tool

1. Add tool definition to `getTools()` method
2. Add handler case to `handleToolCall()` method
3. Implement the tool method (e.g., `private async myNewTool()`)
4. Update README.md with tool documentation
5. Add examples to EXAMPLES.md

### Example: Adding a new tool

```typescript
// 1. Add to getTools()
{
  name: 'get_user_profile',
  description: 'Get user profile information',
  inputSchema: {
    type: 'object',
    properties: {
      username: {
        type: 'string',
        description: 'Twitter username (without @)',
      },
    },
    required: ['username'],
  },
}

// 2. Add handler case
case 'get_user_profile':
  return await this.getUserProfile(args.username);

// 3. Implement method
private async getUserProfile(username: string): Promise<any> {
  const user = await this.twitterClient!.v2.userByUsername(username, {
    'user.fields': ['public_metrics', 'description', 'created_at'],
  });

  return {
    user_id: user.data.id,
    username: user.data.username,
    name: user.data.name,
    description: user.data.description,
    metrics: {
      followers: user.data.public_metrics?.followers_count || 0,
      following: user.data.public_metrics?.following_count || 0,
      tweets: user.data.public_metrics?.tweet_count || 0,
    },
    requestsRemaining: this.rateLimiter.getRequestsRemaining(),
  };
}
```

## Pull Request Process

1. **Branch naming**: `feature/your-feature-name` or `fix/your-bug-fix`
2. **Commit messages**: Clear and descriptive
   - Good: "Add get_user_profile tool for fetching user metrics"
   - Bad: "Update code"
3. **PR description**: Explain what and why
   - What problem does this solve?
   - How does it work?
   - Any breaking changes?
4. **Documentation**: Update README.md and EXAMPLES.md if needed

## Roadmap

Current priorities:

- [ ] OAuth 2.0 PKCE flow implementation
- [ ] Response caching layer
- [ ] Batch operations support
- [ ] Historical data fetching (7-day window)
- [ ] User profile metrics
- [ ] Unit tests
- [ ] Integration tests

## Questions?

- **GitHub Issues**: For bug reports and feature requests
- **Discussions**: For questions and ideas
- **Email**: support@polsia.com

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Assume good intentions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

All contributors will be recognized in the project README. Thank you for making this project better! 🚀
