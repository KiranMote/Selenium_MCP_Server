# Simple MCP Server Global Configuration Script
Write-Host "🚀 Configuring Selenium MCP Server Globally..." -ForegroundColor Cyan

$settingsPath = "$env:APPDATA\Code\User\settings.json"
$mcpServerPath = "C:\Users\kiran\OneDrive\Desktop\kiran_selenium_mcp_server\dist\index.js"

# Check if server exists
if (-not (Test-Path $mcpServerPath)) {
    Write-Host "❌ ERROR: MCP server not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ MCP server found" -ForegroundColor Green

# Create the configuration JSON
$configJson = @"
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
"@

# Check if settings file exists and has content
if (Test-Path $settingsPath) {
    $existingContent = Get-Content $settingsPath -Raw
    if ($existingContent -and $existingContent.Trim() -ne "") {
        try {
            $existing = $existingContent | ConvertFrom-Json
            $config = $configJson | ConvertFrom-Json
            
            # Add MCP servers configuration
            $existing | Add-Member -MemberType NoteProperty -Name "github.copilot.chat.mcp.servers" -Value $config."github.copilot.chat.mcp.servers" -Force
            
            # Save back
            $existing | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8
        } catch {
            Write-Host "⚠️  Error reading existing settings, backing up and creating new..." -ForegroundColor Yellow
            Copy-Item $settingsPath "$settingsPath.backup"
            $configJson | Set-Content $settingsPath -Encoding UTF8
        }
    } else {
        $configJson | Set-Content $settingsPath -Encoding UTF8
    }
} else {
    New-Item -Path (Split-Path $settingsPath) -ItemType Directory -Force | Out-Null
    $configJson | Set-Content $settingsPath -Encoding UTF8
}

Write-Host "✅ MCP server configured successfully!" -ForegroundColor Green
Write-Host "🔄 Please restart VS Code completely for changes to take effect." -ForegroundColor Yellow
