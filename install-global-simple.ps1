Write-Host "🚀 Configuring Selenium MCP Server Globally..." -ForegroundColor Cyan

$settingsPath = "$env:APPDATA\Code\User\settings.json"
$mcpServerPath = "C:\Users\kiran\OneDrive\Desktop\kiran_selenium_mcp_server\dist\index.js"

Write-Host "📁 Settings path: $settingsPath" -ForegroundColor Yellow

if (-not (Test-Path $mcpServerPath)) {
    Write-Host "❌ ERROR: MCP server not found at: $mcpServerPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ MCP server found" -ForegroundColor Green

$settingsDir = Split-Path $settingsPath
if (-not (Test-Path $settingsDir)) {
    New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null
}

$newConfig = @{
    "github.copilot.chat.mcp.servers" = @{
        "selenium-mcp-server" = @{
            "type" = "stdio"
            "command" = "node"
            "args" = @($mcpServerPath)
        }
    }
}

Write-Host "🔧 Writing configuration..." -ForegroundColor Yellow

$newConfig | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8

Write-Host "✅ Configuration saved!" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Selenium MCP Server is now configured globally!" -ForegroundColor Green
Write-Host "📍 Location: $settingsPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart VS Code completely" -ForegroundColor White
Write-Host "2. Open any workspace/folder" -ForegroundColor White  
Write-Host "3. Open GitHub Copilot Chat" -ForegroundColor White
Write-Host "4. Look for 'selenium-mcp-server' in MCP servers" -ForegroundColor White
Write-Host ""
Write-Host "🌍 Now available in ALL VS Code workspaces!" -ForegroundColor Green
