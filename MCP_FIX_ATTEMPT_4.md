# MCP Server Fix - Attempt #4 (2025-08-22)

## Problem
MCP servers (filesystem, memory, magicui, context7) were disconnecting when using `cmd /c npx` approach with nvm4w on Windows.

## Solution Applied
Replaced all `cmd /c npx` commands with direct `node.exe` execution using `npx-cli.js`.

## Configuration Changes

### Before (FAILING):
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-filesystem", "C:\\"]
    },
    "memory": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-memory"]
    }
  }
}
```

### After (FIXED):
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "C:\\nvm4w\\nodejs\\node.exe",
      "args": [
        "C:\\nvm4w\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
        "-y",
        "@modelcontextprotocol/server-filesystem@0.6.4"
      ],
      "env": {
        "FILESYSTEM_ROOT": "C:\\Users\\Owner\\claude code projects",
        "PATH": "C:\\nvm4w\\nodejs;C:\\Windows\\System32;C:\\Windows"
      }
    },
    "memory": {
      "command": "C:\\nvm4w\\nodejs\\node.exe",
      "args": [
        "C:\\nvm4w\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
        "-y",
        "@modelcontextprotocol/server-memory@0.1.2"
      ],
      "env": {
        "PATH": "C:\\nvm4w\\nodejs;C:\\Windows\\System32;C:\\Windows"
      }
    },
    "magicui": {
      "command": "C:\\nvm4w\\nodejs\\node.exe",
      "args": [
        "C:\\nvm4w\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
        "-y",
        "@21st-dev/magic@latest"
      ],
      "env": {
        "TWENTY_FIRST_API_KEY": "YOUR_API_KEY_HERE",
        "PATH": "C:\\nvm4w\\nodejs;C:\\Windows\\System32;C:\\Windows"
      }
    },
    "context7": {
      "command": "C:\\nvm4w\\nodejs\\node.exe",
      "args": [
        "C:\\nvm4w\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
        "-y",
        "@context7/mcp-server@latest"
      ],
      "env": {
        "PATH": "C:\\nvm4w\\nodejs;C:\\Windows\\System32;C:\\Windows"
      }
    }
  }
}
```

## Key Pattern for All Servers
```json
{
  "command": "C:\\nvm4w\\nodejs\\node.exe",
  "args": [
    "C:\\nvm4w\\nodejs\\node_modules\\npm\\bin\\npx-cli.js",
    "-y",
    "@package-name@version"
  ],
  "env": {
    "PATH": "C:\\nvm4w\\nodejs;C:\\Windows\\System32;C:\\Windows"
  }
}
```

## Why This Works
1. **Bypasses cmd.exe shell issues** - Direct node execution avoids shell interpretation problems
2. **Uses working pattern** - Same approach as the playwright server that was already working
3. **Compatible with nvm4w** - Works with Node Version Manager for Windows setup
4. **Avoids npx.cmd wrapper problems** - Goes directly to npx-cli.js

## Files Modified
- `C:\Users\Owner\AppData\Roaming\Claude\claude_desktop_config.json`

## How to Apply This Fix
1. Open `C:\Users\Owner\AppData\Roaming\Claude\claude_desktop_config.json`
2. Replace all `"command": "cmd"` entries with the pattern above
3. Restart Claude Code completely

## Previous Attempts
- Attempt 1-3: Various approaches with cmd wrappers and npx.cmd
- Attempt 4: Direct node.exe approach (THIS ONE)

## Testing
After applying fix:
1. Close Claude Code completely
2. Reopen Claude Code
3. Check if servers connect (should show in UI)
4. Test filesystem operations
5. If servers disconnect, check logs at: `C:\Users\Owner\AppData\Roaming\Claude\logs\mcp.log`

## Notes
- User has nvm4w installed at `C:\nvm4w\nodejs`
- This is the 4th attempt to fix MCP disconnection issues
- Pieces server uses SSE transport (different type, not modified)