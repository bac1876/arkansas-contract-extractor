# MCP Fix Attempt #11 - Claude Code CLI (2025-08-22)

## What Was Done
Updated `C:\Users\Owner\claude-mcp-config.json` to include all 4 MCP servers:
- filesystem
- memory  
- playwright
- pieces

## If This Doesn't Work

### Check 1: Verify MCP servers are loaded
When you start Claude Code, you should see MCP tools available. If not, try:

```bash
# Start with debug flag to see MCP server errors
claude --mcp-config "C:\Users\Owner\claude-mcp-config.json" --debug
```

### Check 2: Test with absolute npx path
If servers fail to start, the issue might be with npx.cmd. Try using node.exe directly:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "C:\\nvm4w\\nodejs\\node.exe",
      "args": [
        "C:\\nvm4w\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
        "-y",
        "@modelcontextprotocol/server-filesystem@2025.8.21",
        "C:\\Users\\Owner\\claude code projects"
      ]
    }
  }
}
```

### Check 3: Verify npx works
```bash
C:\nvm4w\nodejs\npx.cmd -y @modelcontextprotocol/server-filesystem@2025.8.21 "C:\Users\Owner\claude code projects"
```
Should output: "Secure MCP Filesystem Server running on stdio"

### Check 4: Try with forward slashes
Sometimes Windows path issues occur. Try:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "C:/nvm4w/nodejs/npx.cmd",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem@2025.8.21",
        "C:/Users/Owner/claude code projects"
      ]
    }
  }
}
```

### Check 5: Environment Variables
Make sure Node.js is in PATH:
```bash
echo $PATH | grep -i node
which npx
```

### Check 6: Create a batch file wrapper
Create `C:\Users\Owner\start-mcp-filesystem.bat`:
```batch
@echo off
C:\nvm4w\nodejs\npx.cmd -y @modelcontextprotocol/server-filesystem@2025.8.21 "C:\Users\Owner\claude code projects"
```

Then use in config:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "C:\\Users\\Owner\\start-mcp-filesystem.bat"
    }
  }
}
```

### Check 7: Pieces Server
If pieces server isn't working, make sure Pieces OS is running:
- Check if service is at http://localhost:39300
- Start Pieces app if needed

### Check 8: Version Compatibility
Try different versions:
- `@modelcontextprotocol/server-filesystem@latest`
- `@modelcontextprotocol/server-memory@latest`
- `@playwright/mcp@latest`

### Check 9: Permissions
Run as Administrator if getting permission errors:
```bash
# In elevated command prompt
claude --mcp-config "C:\Users\Owner\claude-mcp-config.json"
```

### Check 10: Alternative Config Location
Try placing config in different location:
```bash
claude --mcp-config "./claude-mcp-config.json"
```

### Check 11: Manual Server Test
Test each server individually:
```bash
# Test filesystem
echo '{"jsonrpc":"2.0","method":"initialize","params":{"capabilities":{}},"id":1}' | C:\nvm4w\nodejs\npx.cmd -y @modelcontextprotocol/server-filesystem@2025.8.21 "C:\Users\Owner\claude code projects"

# Test memory
echo '{"jsonrpc":"2.0","method":"initialize","params":{"capabilities":{}},"id":1}' | C:\nvm4w\nodejs\npx.cmd -y @modelcontextprotocol/server-memory@2025.8.4

# Test playwright
echo '{"jsonrpc":"2.0","method":"initialize","params":{"capabilities":{}},"id":1}' | C:\nvm4w\nodejs\npx.cmd -y @playwright/mcp@0.0.34
```

## Current Config File Location
`C:\Users\Owner\claude-mcp-config.json`

## How You Should Start Claude Code
```bash
claude --mcp-config "C:\Users\Owner\claude-mcp-config.json"
```

## If All Else Fails
1. Check if there's a `.claude` or `.claude-code` directory in your home folder with configs
2. Check environment variable `CLAUDE_MCP_CONFIG`
3. Try inline config: `claude --mcp-config '{"mcpServers":{...}}'`
4. Check Claude Code documentation for MCP setup specific to your version