# PowerShell Script to Configure Selenium MCP Server Globally
# Run this script to make the MCP server available in all VS Code workspaces

Write-Host "🚀 Configuring Selenium MCP Server Globally..." -ForegroundColor Cyan

# Get VS Code settings path
$settingsPath = "$env:APPDATA\Code\User\settings.json"
Write-Host "📁 Settings path: $settingsPath" -ForegroundColor Yellow

# Current MCP server path
$mcpServerPath = "C:\Users\kiran\OneDrive\Desktop\kiran_selenium_mcp_server\dist\index.js"

# Verify MCP server exists
if (-not (Test-Path $mcpServerPath)) {
    Write-Host "❌ ERROR: MCP server not found at: $mcpServerPath" -ForegroundColor Red
    Write-Host "Please ensure the server is built (npm run build)" -ForegroundColor Red
    exit 1
}

Write-Host "✅ MCP server found at: $mcpServerPath" -ForegroundColor Green

# Read existing settings or create new
if (Test-Path $settingsPath) {
    Write-Host "📖 Reading existing settings..." -ForegroundColor Yellow
    try {
        $settingsContent = Get-Content $settingsPath -Raw
        if ([string]::IsNullOrWhiteSpace($settingsContent)) {
            $settings = @{}
        } else {
            $settings = $settingsContent | ConvertFrom-Json
        }
    } catch {
        Write-Host "⚠️  Invalid JSON in settings, creating backup..." -ForegroundColor Yellow
        Copy-Item $settingsPath "$settingsPath.backup"
        $settings = @{}
    }
} else {
    Write-Host "📝 Creating new settings file..." -ForegroundColor Yellow
    $settings = @{}
}

# Convert to hashtable for easier manipulation
$settingsHash = @{}
if ($settings) {
    $settings.PSObject.Properties | ForEach-Object {
        $settingsHash[$_.Name] = $_.Value
    }
}

# Add MCP configuration
if (-not $settingsHash."github.copilot.chat.mcp.servers") {
    $settingsHash."github.copilot.chat.mcp.servers" = @{}
}

# Convert the nested object to hashtable if needed
if ($settingsHash."github.copilot.chat.mcp.servers" -is [PSCustomObject]) {
    $mcpServers = @{}
    $settingsHash."github.copilot.chat.mcp.servers".PSObject.Properties | ForEach-Object {
        $mcpServers[$_.Name] = $_.Value
    }
    $settingsHash."github.copilot.chat.mcp.servers" = $mcpServers
}

$settingsHash."github.copilot.chat.mcp.servers"."selenium-mcp-server" = @{
    "type" = "stdio"
    "command" = "node"
    "args" = @($mcpServerPath)
}

Write-Host "🔧 Adding Selenium MCP Server configuration..." -ForegroundColor Yellow

# Ensure directory exists
$settingsDir = Split-Path $settingsPath
if (-not (Test-Path $settingsDir)) {
    New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null
}

# Save settings
try {
    $settingsHash | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8
    Write-Host "✅ Configuration saved successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Failed to save settings: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Selenium MCP Server is now configured globally!" -ForegroundColor Green
Write-Host "📍 Configuration Location: $settingsPath" -ForegroundColor Cyan
Write-Host "🔧 Server Path: $mcpServerPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart VS Code completely" -ForegroundColor White
Write-Host "2. Open any workspace/folder" -ForegroundColor White
Write-Host "3. Open GitHub Copilot Chat" -ForegroundColor White
Write-Host "4. Look for 'selenium-mcp-server' in the MCP servers section" -ForegroundColor White
Write-Host "5. Test with: @selenium-mcp-server start browser" -ForegroundColor White
Write-Host ""
Write-Host "🌍 Your Selenium MCP server is now available in ALL VS Code workspaces!" -ForegroundColor Green
