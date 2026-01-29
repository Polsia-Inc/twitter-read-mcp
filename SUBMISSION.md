# MCP Registry Submission Guide

This guide documents how to publish the Twitter Read MCP Server to the official MCP Registry.

## Status

✅ **Code Complete**: All 4 tools tested and working
✅ **Documentation**: README, TESTING, EXAMPLES all complete
✅ **Rate Limiting**: Implemented and verified
✅ **Error Handling**: Comprehensive error responses
✅ **Package Structure**: Ready for npm publication

## Prerequisites

Before publishing, ensure you have:

1. **npm account** with publishing rights to `@polsia` scope
2. **GitHub repository** set up at `github.com/Polsia-Inc/twitter-read-mcp`
3. **MCP Publisher CLI** installed (see below)
4. **Namespace ownership** verified (either GitHub auth or DNS/HTTP challenge)

## Step 1: Publish to npm

```bash
# Login to npm
npm login

# Verify you're logged in as Polsia
npm whoami

# Publish the package
npm publish --access public

# Verify publication
npm info @polsia/twitter-read-mcp
```

## Step 2: Install MCP Publisher CLI

**Option A: Homebrew (macOS/Linux)**
```bash
brew tap modelcontextprotocol/mcp
brew install mcp-publisher
```

**Option B: Direct download**
```bash
# Download latest release from:
# https://github.com/modelcontextprotocol/registry/releases

# Make executable
chmod +x mcp-publisher

# Move to PATH
sudo mv mcp-publisher /usr/local/bin/
```

**Option C: Build from source**
```bash
git clone https://github.com/modelcontextprotocol/registry.git
cd registry
make publisher
```

## Step 3: Publish to MCP Registry

From the `twitter-read-mcp` directory:

```bash
# Publish to registry (will prompt for authentication)
mcp-publisher publish

# Follow the prompts:
# 1. Select namespace: @polsia
# 2. Authenticate via GitHub (login as Polsia-Inc)
# 3. Confirm server.json details
# 4. Submit
```

The CLI will:
- Read `server.json` for metadata
- Validate the npm package exists
- Verify README has the `<!-- mcp-name: twitter-read -->` comment
- Authenticate namespace ownership
- Publish to registry.modelcontextprotocol.io

## Step 4: Verify Publication

After successful submission:

1. **Check the registry**:
   ```
   https://registry.modelcontextprotocol.io/
   ```
   Search for "twitter-read" to confirm it appears

2. **Test installation**:
   ```bash
   # Others should be able to install via:
   npx @polsia/twitter-read-mcp
   ```

3. **Verify in Claude Desktop**:
   Add to config and verify tools appear:
   ```json
   {
     "mcpServers": {
       "twitter-read": {
         "command": "npx",
         "args": ["@polsia/twitter-read-mcp"],
         "env": {
           "TWITTER_BEARER_TOKEN": "your_token"
         }
       }
     }
   }
   ```

## Namespace Ownership

The MCP Registry validates namespace ownership:

**For `@polsia` scope:**
- Authenticate via GitHub as `Polsia-Inc` organization member
- Or prove ownership via DNS: `TXT record at _mcp.polsia.com`
- Or prove ownership via HTTP: `/.well-known/mcp.json` at polsia.com

**Recommended**: Use GitHub authentication (simplest).

## server.json Structure

The `server.json` file defines registry metadata:

```json
{
  "name": "twitter-read",
  "title": "Twitter Read MCP Server",
  "description": "...",
  "version": "1.0.0",
  "package": {
    "type": "npm",
    "name": "@polsia/twitter-read-mcp"
  },
  "tools": [...]
}
```

**Key fields:**
- `name`: Registry identifier (must match README comment)
- `package.name`: npm package name
- `tools`: List of available tools
- `config`: Required/optional environment variables

## Updating After Publication

To publish updates:

1. Update version in `package.json` and `server.json`
2. Publish new npm version: `npm publish`
3. Re-run: `mcp-publisher publish`

The registry will validate the new version exists on npm.

## Alternative: GitHub MCP Registry

The GitHub MCP Registry will soon sync from the official registry. Once published to registry.modelcontextprotocol.io, your server will automatically appear in GitHub's registry as well.

## Troubleshooting

**"Namespace not verified"**
- Solution: Authenticate via GitHub or set up DNS/HTTP verification

**"Package not found on npm"**
- Solution: Ensure `npm publish` succeeded, wait a few minutes for npm propagation

**"README missing mcp-name comment"**
- Solution: Add `<!-- mcp-name: twitter-read -->` to README.md

**"Version mismatch"**
- Solution: Ensure server.json version matches package.json

## Resources

- [MCP Registry Documentation](https://github.com/modelcontextprotocol/registry)
- [Official Registry](https://registry.modelcontextprotocol.io/)
- [MCP Publisher CLI Releases](https://github.com/modelcontextprotocol/registry/releases)

## Next Steps

After successful publication:

1. ✅ Monitor GitHub issues/discussions for user feedback
2. ✅ Add examples to community showcase
3. ✅ Consider adding to Polsia's portfolio of MCP servers
4. ✅ Iterate based on community usage patterns

## Contact

For publication issues or questions:
- GitHub: [Polsia-Inc/twitter-read-mcp](https://github.com/Polsia-Inc/twitter-read-mcp)
- MCP Community: [modelcontextprotocol/discussions](https://github.com/orgs/modelcontextprotocol/discussions)
