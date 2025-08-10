# 🔧 MCP Server Global Configuration Troubleshooting

## Current Status Check ✅
Your MCP server is correctly configured in global settings:
- ✅ Location: `C:\Users\kiran\AppData\Roaming\Code\User\settings.json`
- ✅ Format: Correct GitHub Copilot Chat MCP format
- ✅ Path: Valid path to compiled server

## 🚨 Troubleshooting Steps

### Step 1: Complete VS Code Restart
**CRITICAL**: Close ALL VS Code windows and restart completely
```
1. Close all VS Code windows (File → Exit)
2. Wait 5 seconds
3. Open VS Code fresh
4. Open any new folder/workspace
5. Check GitHub Copilot Chat for MCP servers
```

### Step 2: Verify GitHub Copilot Chat Extension
```
1. Press Ctrl+Shift+X (Extensions)
2. Search for "GitHub Copilot Chat"
3. Ensure it's enabled and up to date
4. If needed, disable and re-enable the extension
```

### Step 3: Check Extension Settings
```
1. Press Ctrl+Shift+P
2. Type: "Preferences: Open Settings (JSON)"
3. Verify this configuration exists:
```

```json
{
  "github.copilot.chat.mcp.servers": {
    "selenium-mcp-server": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\Users\\kiran\\OneDrive\\Desktop\\kiran_selenium_mcp_server\\dist\\index.js"
      ]
    }
  }
}
```

### Step 4: Alternative Configuration Methods

#### Method A: User Settings UI
```
1. File → Preferences → Settings
2. Search: "github.copilot.chat.mcp"
3. Add server manually in UI
```

#### Method B: Workspace Override (if global fails)
Create `.vscode/settings.json` in any workspace:
```json
{
  "github.copilot.chat.mcp.servers": {
    "selenium-mcp-server": {
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\Users\\kiran\\OneDrive\\Desktop\\kiran_selenium_mcp_server\\dist\\index.js"
      ]
    }
  }
}
```

### Step 5: Verify Server Functionality
Test the server directly:
```powershell
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node "C:\Users\kiran\OneDrive\Desktop\kiran_selenium_mcp_server\dist\index.js"
```

### Step 6: GitHub Copilot Chat Reload
```
1. Press Ctrl+Shift+P
2. Type: "Developer: Reload Window"
3. Or: "GitHub Copilot: Restart Language Server"
```

## 🔍 How to Verify It's Working

### In GitHub Copilot Chat:
1. Look for **"MCP Servers"** section at bottom of chat
2. Should show: **"selenium-mcp-server"** with green status
3. Test with: `@selenium-mcp-server start_browser`

### Visual Confirmation:
- MCP servers appear in chat interface
- Server shows as "Connected" or "Active"
- You can use @ syntax to reference tools

## 🚨 If Still Not Working

### Check VS Code Version
```
Help → About
Ensure VS Code is recent version (1.85+)
```

### Check Node.js Path
```
node --version
which node  # (or 'where node' on Windows)
```

### Reset GitHub Copilot
```
1. Disable GitHub Copilot Chat extension
2. Restart VS Code
3. Re-enable extension
4. Check MCP servers again
```

### Alternative: Per-Project Setup
If global doesn't work, use workspace-specific:
```
1. In each project: Create .vscode/settings.json
2. Add the MCP configuration there
3. This ensures it works per project
```

## 🎯 Expected Behavior After Fix
- ✅ Open any new VS Code workspace
- ✅ GitHub Copilot Chat shows MCP servers section
- ✅ "selenium-mcp-server" appears in list
- ✅ Can use @selenium-mcp-server commands
- ✅ Works across ALL workspaces without per-project setup

## 📞 Final Check Command
Run this to verify everything:
```powershell
Write-Host "MCP Server Status:"
Write-Host "✅ Server file exists: " -NoNewline
Test-Path "C:\Users\kiran\OneDrive\Desktop\kiran_selenium_mcp_server\dist\index.js"
Write-Host "✅ Settings file exists: " -NoNewline  
Test-Path "$env:APPDATA\Code\User\settings.json"
Write-Host "✅ Node.js available: " -NoNewline
node --version
```

The most common issue is VS Code not fully restarting. **Complete restart is essential!**
