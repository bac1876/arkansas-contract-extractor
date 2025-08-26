# Claude Code CLI - MCP Status (2025-08-22)

## IMPORTANT: This is for Claude Code CLI, NOT Claude Desktop

**User is running Claude Code (the CLI tool), not Claude Desktop application.**

## Current Situation
- User is using Claude Code CLI
- MCP servers are configured in `claude_desktop_config.json` but that's for Claude Desktop
- Claude Code CLI does NOT use the same MCP configuration as Claude Desktop

## Key Finding
**Claude Code CLI and Claude Desktop are separate applications with separate MCP configurations.**

The `claude_desktop_config.json` file only affects Claude Desktop, not Claude Code CLI.

## For Claude Code CLI
Claude Code CLI currently does not have built-in MCP server support in the same way Claude Desktop does. The MCP tools you see in Claude Desktop are not available in Claude Code CLI by default.

## What This Means
- The MCP server configuration in `claude_desktop_config.json` is irrelevant for Claude Code CLI
- Testing npx commands manually shows the servers CAN run, but Claude Code CLI isn't configured to use them
- The "mcp__" prefixed tools are not available in Claude Code CLI sessions

## Current Status for Claude Code CLI
- ❌ MCP servers are NOT integrated with Claude Code CLI
- ❌ No mcp__ tools available in CLI sessions
- ✅ Regular Claude Code tools (Bash, Read, Write, etc.) work fine

## Note to Self
Stop trying to fix Claude Desktop MCP configuration when user is using Claude Code CLI. These are completely different systems.