# MCP Fix Attempt #12 - Default Settings Configuration (2025-08-22)

## What Was Done

### 1. Identified the Root Cause
- Claude Code automatically loads MCP servers from `~/.claude/settings.local.json`
- The existing config there was outdated/incomplete
- This is why typing just `claude` wasn't loading MCP servers

### 2. Created Batch File Wrappers
To solve Windows path escaping issues, created:
- `C:\Users\Owner\mcp-filesystem.bat`
- `C:\Users\Owner\mcp-memory.bat`
- `C:\Users\Owner\mcp-playwright.bat`

### 3. Updated Default Settings
Updated `C:\Users\Owner\.claude\settings.local.json` with all 4 MCP servers:

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
    },
    "pieces": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:39300/model_context_protocol/2024-11-05/sse"
      }
    }
  }
}
```

## Current Status
- ❌ `/mcp` command still shows "No MCP servers configured"
- ⚠️ **Claude Code needs to be restarted for changes to take effect**

## After Restart - Expected Behavior

### How to Start
Simply type:
```bash
claude
```

No need for `--mcp-config` parameter anymore!

### Expected MCP Tools
After restart, `/mcp` should show:

**filesystem server:**
- mcp__filesystem__list_directory
- mcp__filesystem__read_file
- mcp__filesystem__write_file
- mcp__filesystem__create_directory
- mcp__filesystem__move_file
- mcp__filesystem__search_files

**memory server:**
- mcp__memory__create_entities
- mcp__memory__create_relations
- mcp__memory__search_entities
- mcp__memory__open_nodes
- mcp__memory__read_graph

**playwright server:**
- mcp__playwright__browser_navigate
- mcp__playwright__browser_screenshot
- mcp__playwright__browser_click
- mcp__playwright__browser_fill
- mcp__playwright__browser_select
- mcp__playwright__browser_evaluate

**pieces server:** (if Pieces OS is running)
- mcp__pieces__save_material
- mcp__pieces__search
- Various other Pieces tools

## Troubleshooting If It Doesn't Work

### 1. Verify Batch Files Exist
```bash
ls -la C:/Users/Owner/*.bat | grep mcp
```

### 2. Test Batch Files Manually
```bash
echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"1.0.0","clientInfo":{"name":"test","version":"1.0"},"capabilities":{}},"id":1}' | "C:/Users/Owner/mcp-filesystem.bat"
```
Should output: "Secure MCP Filesystem Server running on stdio"

### 3. Check Claude Settings Are Being Read
```bash
claude --debug
```
Look for lines about loading settings from ~/.claude/settings.local.json

### 4. Try Explicit Config (temporary workaround)
```bash
claude --mcp-config "C:\Users\Owner\claude-mcp-config.json"
```

### 5. Check for Permission Issues
Run as Administrator:
```bash
# In elevated command prompt
claude
```

### 6. Verify Node/NPX Works
```bash
"C:/nvm4w/nodejs/npx.cmd" -v
```
Should output version number (e.g., 10.8.2)

## Alternative Approaches If Still Not Working

### Option 1: Environment Variable
Set CLAUDE_MCP_CONFIG environment variable:
```bash
set CLAUDE_MCP_CONFIG=C:\Users\Owner\claude-mcp-config.json
```

### Option 2: Create Alias
Add to your shell profile:
```bash
alias claude='claude --mcp-config "C:\Users\Owner\claude-mcp-config.json"'
```

### Option 3: Direct Node Execution
Update settings.local.json to use node.exe directly instead of batch files:
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

## File Locations Reference

### Configuration Files
- Main settings: `C:\Users\Owner\.claude\settings.local.json`
- Backup config: `C:\Users\Owner\claude-mcp-config.json`

### Batch File Wrappers
- `C:\Users\Owner\mcp-filesystem.bat`
- `C:\Users\Owner\mcp-memory.bat`
- `C:\Users\Owner\mcp-playwright.bat`

### Helper Scripts
- `C:\Users\Owner\test-mcp-servers.bat` - Test all servers
- `C:\Users\Owner\start-claude-mcp.bat` - Start with explicit config

## Server Versions Used
- filesystem: @modelcontextprotocol/server-filesystem@2025.8.21
- memory: @modelcontextprotocol/server-memory@2025.8.4
- playwright: @playwright/mcp@0.0.34
- pieces: SSE connection to http://localhost:39300

## Next Steps
1. **Restart Claude Code**
2. Type just `claude` to start
3. Run `/mcp` to verify servers are loaded
4. If not working, follow troubleshooting steps above
5. Document results in MCP_FIX_ATTEMPT_13.md if needed