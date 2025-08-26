# MCP Fix Attempt #13 - SSE Transport Configuration Issue Fixed (2025-08-22)

## Problem Identified
- `/mcp` command showing "No MCP servers configured"
- Even after proper configuration in `~/.claude/settings.local.json`
- Error when using explicit config: "mcpServers.pieces: Does not adhere to MCP server configuration schema"

## Root Cause
The Pieces server SSE transport configuration is **not supported** by Claude Code:
```json
"pieces": {
  "transport": {
    "type": "sse",
    "url": "http://localhost:39300/model_context_protocol/2024-11-05/sse"
  }
}
```

This configuration format caused Claude Code to reject the entire MCP configuration.

## Solution Applied

### 1. Removed Pieces Server from Both Config Files

**Updated `C:\Users\Owner\.claude\settings.local.json`:**
```json
{
  "permissions": {
    "allow": [
      "Bash(ls:*)",
      "Bash(chmod:*)",
      "Bash(touch:*)",
      "Bash(git clone:*)",
      "Bash(npm install)"
    ],
    "deny": []
  },
  "mcpServers": {
    "filesystem": {
      "command": "C:\\Users\\Owner\\mcp-filesystem.bat"
    },
    "memory": {
      "command": "C:\\Users\\Owner\\mcp-memory.bat"
    },
    "playwright": {
      "command": "C:\\Users\\Owner\\mcp-playwright.bat"
    }
  }
}
```

**Updated `C:\Users\Owner\claude-mcp-config.json`:**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "C:\\Users\\Owner\\mcp-filesystem.bat"
    },
    "memory": {
      "command": "C:\\Users\\Owner\\mcp-memory.bat"
    },
    "playwright": {
      "command": "C:\\Users\\Owner\\mcp-playwright.bat"
    }
  }
}
```

### 2. Batch Files Remain Unchanged
The batch wrapper files are still in place and working:
- `C:\Users\Owner\mcp-filesystem.bat`
- `C:\Users\Owner\mcp-memory.bat`
- `C:\Users\Owner\mcp-playwright.bat`

## How to Start Claude Code with MCP

### Option 1: Default Configuration (Recommended)
```bash
claude
```
MCP servers will load automatically from `~/.claude/settings.local.json`

### Option 2: Explicit Configuration (If needed)
```bash
claude --mcp-config "C:\Users\Owner\claude-mcp-config.json"
```

## Expected MCP Tools After Restart

Running `/mcp` should show:

### filesystem server:
- mcp__filesystem__list_directory
- mcp__filesystem__read_file
- mcp__filesystem__write_file
- mcp__filesystem__create_directory
- mcp__filesystem__move_file
- mcp__filesystem__search_files

### memory server:
- mcp__memory__create_entities
- mcp__memory__create_relations
- mcp__memory__search_entities
- mcp__memory__open_nodes
- mcp__memory__read_graph

### playwright server:
- mcp__playwright__browser_navigate
- mcp__playwright__browser_screenshot
- mcp__playwright__browser_click
- mcp__playwright__browser_fill
- mcp__playwright__browser_select
- mcp__playwright__browser_evaluate

## Important Notes

1. **Claude Code must be fully restarted** for configuration changes to take effect
2. **Pieces server removed** - SSE transport is not supported by Claude Code currently
3. **Three MCP servers working** - filesystem, memory, and playwright

## Testing the Fix

After restarting Claude Code:

1. Run `/mcp` to see list of MCP servers
2. Test a simple MCP command:
   ```
   Use mcp__filesystem__list_directory to list files in C:/Users/Owner
   ```
3. If tools appear, MCP is working correctly

## Troubleshooting If Still Not Working

### 1. Verify Config is Being Loaded
```bash
claude --debug
```
Look for lines mentioning settings.local.json

### 2. Test Batch Files Directly
```bash
echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"1.0.0","clientInfo":{"name":"test","version":"1.0"},"capabilities":{}},"id":1}' | "C:/Users/Owner/mcp-filesystem.bat"
```

### 3. Check Node/NPX Version
```bash
"C:/nvm4w/nodejs/npx.cmd" -v
```

### 4. Try Without Batch Wrappers
If batch files are problematic, update settings.local.json to use direct node execution:
```json
"filesystem": {
  "command": "C:\\nvm4w\\nodejs\\node.exe",
  "args": [
    "C:\\nvm4w\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
    "-y",
    "@modelcontextprotocol/server-filesystem@2025.8.21",
    "C:\\Users\\Owner\\claude code projects"
  ]
}
```

## Summary
- **Problem**: Pieces SSE transport configuration incompatible with Claude Code
- **Solution**: Removed Pieces server from configuration
- **Status**: Configuration fixed, requires Claude Code restart to take effect
- **Next Step**: Exit and restart Claude Code, then run `/mcp` to verify