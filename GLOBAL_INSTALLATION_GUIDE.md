# Global MCP Server Installation Guide

## 🌍 **Make Selenium MCP Server Available Globally**

### **Method 1: VS Code Global Settings (Recommended)**

1. **Open VS Code Global Settings**:
   - Press `Ctrl+Shift+P` (Windows)
   - Type: `Preferences: Open User Settings (JSON)`
   - This opens your global `settings.json`

2. **Add MCP Configuration**:
   Add this to your global `settings.json`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "selenium-mcp-server": {
      "type": "stdio",
      "command": "node",
      "args": ["C:\\Users\\kiran\\OneDrive\\Desktop\\kiran_selenium_mcp_server\\dist\\index.js"]
    }
  }
}
```

### **Method 2: PowerShell Script (Automated)**

Run this PowerShell script to automatically configure:

```powershell
# Get VS Code settings path
$settingsPath = "$env:APPDATA\Code\User\settings.json"

# Current MCP server path
$mcpServerPath = "C:\\Users\\kiran\\OneDrive\\Desktop\\kiran_selenium_mcp_server\\dist\\index.js"

# Read existing settings or create new
if (Test-Path $settingsPath) {
    $settings = Get-Content $settingsPath | ConvertFrom-Json
} else {
    $settings = @{}
}

# Add MCP configuration
if (-not $settings."github.copilot.chat.mcp.servers") {
    $settings | Add-Member -NotePropertyName "github.copilot.chat.mcp.servers" -NotePropertyValue @{}
}

$settings."github.copilot.chat.mcp.servers"."selenium-mcp-server" = @{
    "type" = "stdio"
    "command" = "node"
    "args" = @($mcpServerPath)
}

# Save settings
$settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath

Write-Host "✅ Selenium MCP Server configured globally!"
Write-Host "📍 Location: $settingsPath"
Write-Host "🔧 Server Path: $mcpServerPath"
```

### **Method 3: Manual Steps**

1. **Find your VS Code settings file**:
   - Windows: `%APPDATA%\Code\User\settings.json`
   - macOS: `~/Library/Application Support/Code/User/settings.json`
   - Linux: `~/.config/Code/User/settings.json`

2. **Add the MCP server configuration**:
   ```json
   {
     "github.copilot.chat.mcp.servers": {
       "selenium-mcp-server": {
         "type": "stdio",
         "command": "node",
         "args": ["C:\\Users\\kiran\\OneDrive\\Desktop\\kiran_selenium_mcp_server\\dist\\index.js"]
       }
     }
   }
   ```

3. **Restart VS Code** for changes to take effect

### **Verification Steps**

After configuration:

1. **Open any new workspace/folder in VS Code**
2. **Open GitHub Copilot Chat**
3. **Check the MCP servers section** - you should see "selenium-mcp-server" listed
4. **Test with a simple command**: "@selenium-mcp-server start browser"

### **Benefits of Global Configuration**

✅ **Available in all workspaces** - No need to configure per project
✅ **Persistent across sessions** - Always available when VS Code starts
✅ **Centralized management** - Single configuration location
✅ **Easy updates** - Change path once, affects all workspaces

### **Troubleshooting**

- **Server not appearing**: Restart VS Code completely
- **Path issues**: Ensure the path to `dist/index.js` is correct
- **Permissions**: Make sure VS Code can access the MCP server directory
- **JSON syntax**: Validate your settings.json syntax

### **Alternative: Create NPM Package (Advanced)**

For even easier global access, you could:
1. Publish as NPM package: `npm publish selenium-mcp-server`
2. Install globally: `npm install -g selenium-mcp-server`
3. Use: `"command": "selenium-mcp-server"` (no path needed)

---

**Your Selenium MCP server will now be available in every VS Code workspace!** 🌍
