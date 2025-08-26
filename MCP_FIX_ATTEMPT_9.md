# MCP Fix Attempt #9 - Status (2025-08-22)

## Problem Summary
MCP servers haven't been running since 2025-08-19. Servers were disconnecting with "Method not found" errors.

## Investigation Findings
1. **Log Analysis** (from mcp.log):
   - Servers last disconnected on 2025-08-19 at 23:55:13
   - Errors showed "Method not found" for resources/list and prompts/list
   - Servers closed unexpectedly indicating process exited early

2. **Manual Testing Results**:
   - npx is available at `/c/nvm4w/nodejs/npx` 
   - Package @modelcontextprotocol/server-filesystem@2025.8.21 exists and downloads
   - Server runs but requires directory as command-line argument
   - Error message: "Usage: mcp-server-filesystem [allowed-directory]"

## Root Cause
The filesystem server configuration was missing the required directory argument. It was only set as an environment variable (FILESYSTEM_ROOT) but the server expects it as a command-line argument.

## Fix Applied
Updated `C:\Users\Owner\AppData\Roaming\Claude\claude_desktop_config.json`:

### Before:
```json
"filesystem": {
  "command": "C:\\nvm4w\\nodejs\\npx.cmd",
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem@2025.8.21"
  ],
  "env": {
    "FILESYSTEM_ROOT": "C:\\Users\\Owner\\claude code projects",
    "PATH": "C:\\nvm4w\\nodejs;C:\\Windows\\System32;C:\\Windows"
  }
}
```

### After:
```json
"filesystem": {
  "command": "C:\\nvm4w\\nodejs\\npx.cmd",
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem@2025.8.21",
    "C:\\Users\\Owner\\claude code projects"
  ],
  "env": {
    "PATH": "C:\\nvm4w\\nodejs;C:\\Windows\\System32;C:\\Windows"
  }
}
```

## Manual Verification
Tested the server manually with:
```bash
echo '{"jsonrpc":"2.0","method":"initialize"...}' | /c/nvm4w/nodejs/npx -y @modelcontextprotocol/server-filesystem@2025.8.21 "/c/Users/Owner/claude code projects"
```
Result: Server responded (with an error about missing clientInfo, but it's running)

## Required Action
**RESTART CLAUDE DESKTOP** to apply the configuration changes

## If This Doesn't Work
1. Check new logs in `C:\Users\Owner\AppData\Roaming\Claude\logs\mcp.log`
2. Look for different error messages
3. Possible next steps:
   - Check if other MCP servers (memory, playwright) have similar issues
   - Verify Windows Defender/antivirus isn't blocking npx
   - Test with absolute paths instead of npx.cmd
   - Check if Node.js version compatibility is an issue

## Files Modified
- `C:\Users\Owner\AppData\Roaming\Claude\claude_desktop_config.json` (filesystem server configuration)