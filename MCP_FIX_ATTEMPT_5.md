# MCP Server Fix - Attempt #5 (2025-08-22)

## Problem
MCP servers not loading at all when starting Claude Code. Previous attempt #4 used direct node.exe execution but servers still don't appear.

## Current Status
- MCP logs show last activity on 2025-08-19 (3 days ago)
- Servers disconnected and haven't reconnected since
- No recent entries in mcp.log indicating servers aren't even trying to start

## Solution Applied (Attempt #5)
Changed from direct node.exe execution to using npx.cmd with forward slashes for better path compatibility.

### Configuration Changes

#### Before (Attempt #4 - NOT WORKING):
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "C:\\nvm4w\\nodejs\\node.exe",
      "args": [
        "C:\\nvm4w\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
        "-y",
        "@modelcontextprotocol/server-filesystem@0.6.4"
      ]
    }
  }
}
```

#### After (Attempt #5 - TESTING):
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "C:/nvm4w/nodejs/npx.cmd",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem@0.6.4"
      ],
      "env": {
        "FILESYSTEM_ROOT": "C:/Users/Owner/claude code projects",
        "PATH": "C:/nvm4w/nodejs;C:/Windows/System32;C:/Windows"
      }
    },
    "memory": {
      "command": "C:/nvm4w/nodejs/npx.cmd",
      "args": [
        "-y",
        "@modelcontextprotocol/server-memory@0.1.2"
      ],
      "env": {
        "PATH": "C:/nvm4w/nodejs;C:/Windows/System32;C:/Windows"
      }
    }
  }
}
```

## Key Changes in Attempt #5
1. **Direct npx.cmd usage** - Using `C:/nvm4w/nodejs/npx.cmd` instead of node.exe + npx-cli.js
2. **Forward slashes** - Changed all paths to use `/` instead of `\\` for better compatibility
3. **Simplified command** - Removed intermediate node.exe layer

## Testing Results
- [ ] Claude Code restarted
- [ ] MCP servers visible in UI
- [ ] Can use MCP tools

## If This Doesn't Work - Next Steps for Attempt #6

### 1. Check if Claude Code is even trying to start MCP servers
```bash
# Check if there are any new entries in the log after restart
tail -f "C:\Users\Owner\AppData\Roaming\Claude\logs\mcp.log"
```

### 2. Try PowerShell approach
```json
{
  "command": "powershell.exe",
  "args": [
    "-NoProfile",
    "-Command",
    "& 'C:/nvm4w/nodejs/npx.cmd' -y @modelcontextprotocol/server-filesystem@0.6.4"
  ]
}
```

### 3. Try using full Node.js path with npx as module
```json
{
  "command": "C:/nvm4w/nodejs/node.exe",
  "args": [
    "C:/nvm4w/nodejs/node_modules/npm/node_modules/npx/index.js",
    "-y",
    "@modelcontextprotocol/server-filesystem@0.6.4"
  ]
}
```

### 4. Check if it's a permission issue
- Run Claude Code as Administrator
- Check Windows Defender or antivirus logs

### 5. Try installing MCP servers globally
```bash
npm install -g @modelcontextprotocol/server-filesystem@0.6.4
npm install -g @modelcontextprotocol/server-memory@0.1.2
```

Then use:
```json
{
  "command": "C:/nvm4w/nodejs/mcp-server-filesystem.cmd",
  "args": []
}
```

### 6. Debug with a simple test server
Create a test batch file at `C:/test-mcp.bat`:
```batch
@echo off
echo MCP Test Server Starting >> C:\mcp-test.log
C:\nvm4w\nodejs\node.exe --version >> C:\mcp-test.log
pause
```

Then configure:
```json
{
  "testserver": {
    "command": "C:/test-mcp.bat",
    "args": []
  }
}
```

## Files Modified
- `C:\Users\Owner\AppData\Roaming\Claude\claude_desktop_config.json`
- Backup created: `claude_desktop_config_backup_attempt5.json`

## Diagnostic Information
- Node version: Working (npx --version returns 10.8.2)
- npx location: `C:/nvm4w/nodejs/npx.cmd`
- Last MCP activity: 2025-08-19T23:55:13
- Log files location: `C:\Users\Owner\AppData\Roaming\Claude\logs\`

## Previous Attempts Summary
- Attempt 1-3: Various cmd wrapper approaches (failed)
- Attempt 4: Direct node.exe + npx-cli.js with backslashes (failed)
- Attempt 5: Direct npx.cmd with forward slashes (current)

## Notes
- User has nvm4w (Node Version Manager for Windows) installed
- Playwright server configuration wasn't included but should follow same pattern
- Pieces server uses SSE transport (different type, working separately)