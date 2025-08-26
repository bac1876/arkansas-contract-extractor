# MCP Fix Attempt #14 - Windows Claude Code CLI MCP Server Issue

## Problem Statement
MCP servers are configured but don't load in Claude Code CLI on Windows. The `/mcp` command shows "No MCP servers configured" even after configuration.

## Current Status (As of Attempt 14)
- ✅ MCP servers ARE configured in `C:\Users\Owner\.claude.json`
- ✅ `claude mcp list` shows all servers as connected:
  - filesystem: ✓ Connected
  - memory: ✓ Connected  
  - playwright: ✓ Connected
  - pieces: ✓ Connected
- ❌ `/mcp` command in Claude Code session shows "No MCP servers configured"
- ❌ Restarting Claude Code CLI doesn't load the servers

## What We've Discovered

### 1. Configuration Files
- **Claude Desktop Config**: `C:\Users\Owner\AppData\Roaming\Claude\claude_desktop_config.json`
  - Has MCP servers configured
  - Works for Claude Desktop app
  - NOT used by Claude Code CLI

- **Claude Code CLI Config**: `C:\Users\Owner\.claude.json`
  - Successfully added MCP servers using `claude mcp add` commands
  - File is 4.3MB with 1031 lines (contains project history)
  - Has mcpServers section properly configured

### 2. Platform Limitations
- `claude mcp add-from-claude-desktop` doesn't work on Windows (only macOS and WSL)
- Must manually add each server on Windows

### 3. The Disconnect
- `claude mcp list` reads from the config file and shows servers as connected
- `/mcp` command checks in-memory state of current CLI session
- Current session doesn't pick up config changes without restart
- BUT: Even after restart, servers still don't load

## Commands That Were Used (Successful Configuration)

```bash
# Added filesystem server
claude mcp add filesystem "C:\\nvm4w\\nodejs\\npx.cmd" -- "-y" "@modelcontextprotocol/server-filesystem@2025.8.21" "C:\\Users\\Owner\\claude code projects"

# Added memory server  
claude mcp add memory "C:\\nvm4w\\nodejs\\npx.cmd" -- "-y" "@modelcontextprotocol/server-memory@2025.8.4"

# Added playwright server
claude mcp add playwright "C:\\nvm4w\\nodejs\\npx.cmd" -- "-y" "@playwright/mcp@0.0.34"

# Added pieces server (SSE transport)
claude mcp add pieces "http://localhost:39300/model_context_protocol/2024-11-05/sse" -t sse

# Verify configuration
claude mcp list
# Shows: All servers ✓ Connected
```

## The Core Issue
There appears to be a bug or disconnect where:
1. MCP servers can be configured successfully (proven by `claude mcp list`)
2. But the Claude Code CLI session itself doesn't load them on startup
3. The `/mcp` command always shows "No MCP servers configured"

## Potential Root Causes
1. **Session initialization bug**: CLI might not be reading MCP config on startup
2. **Windows-specific issue**: MCP loading might have Windows path/process issues
3. **Config scope mismatch**: Servers might be saved in wrong scope (local vs user vs project)
4. **Version incompatibility**: CLI version might not fully support MCP on Windows yet

## What DOESN'T Work
- ❌ Restarting Claude Code CLI
- ❌ Using `claude mcp add-from-claude-desktop` (not supported on Windows)
- ❌ The servers being "connected" according to `claude mcp list`

## Next Steps to Try
1. Check if there's a Claude Code CLI update available
2. Try different config scopes: `claude mcp add -s user` vs `-s project` vs `-s local`
3. Check if running from WSL instead of native Windows works
4. File a bug report as this appears to be a Windows-specific CLI issue

## For Future Claude Sessions
When you read this file, know that:
- The MCP servers ARE properly configured
- `claude mcp list` will show them as connected
- But `/mcp` won't recognize them in the session
- This is attempt #14 - the issue persists across restarts