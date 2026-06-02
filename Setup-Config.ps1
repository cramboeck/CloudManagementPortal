#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Interactive configuration setup for Cloud Management Portal

.DESCRIPTION
    Guides you through setting up the appsettings.json configuration file
    with your Azure AD app credentials.

.EXAMPLE
    .\Setup-Config.ps1

    Runs the interactive setup wizard
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ConfigPath = "config/appsettings.json"
)

Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║   Cloud Management Portal - Configuration Setup          ║
╚═══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

# Check if config already exists
if (Test-Path $ConfigPath) {
    Write-Host "⚠️  Configuration file already exists: $ConfigPath" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne 'y' -and $overwrite -ne 'Y') {
        Write-Host "Setup cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host @"

This wizard will help you set up the Cloud Management Portal.

You'll need:
  • Azure AD Tenant ID
  • Azure AD App Registration (Client ID)
  • Client Secret
  • Azure Subscription ID (for AVD features)

If you haven't created an Azure AD App yet, follow this guide:
https://learn.microsoft.com/entra/identity-platform/quickstart-register-app

Required API Permissions for the App:
  Microsoft Graph:
    • User.ReadWrite.All
    • Group.ReadWrite.All
    • Directory.Read.All
    • DeviceManagementManagedDevices.ReadWrite.All
    • DeviceManagementConfiguration.ReadWrite.All
    • AuditLog.Read.All

  Azure Management:
    • user_impersonation

Azure RBAC Roles (for AVD):
    • Desktop Virtualization Contributor
    • Virtual Machine Contributor (for image creation)

"@ -ForegroundColor Gray

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Collect configuration values
Write-Host "📝 Azure AD Configuration" -ForegroundColor Cyan
Write-Host ""

$tenantId = Read-Host "  Azure AD Tenant ID"
$clientId = Read-Host "  App Client ID (Application ID)"
$clientSecret = Read-Host "  Client Secret (App Password)" -AsSecureString
$clientSecretPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret)
)

Write-Host ""
Write-Host "📝 Azure Subscription (for AVD)" -ForegroundColor Cyan
Write-Host ""

$subscriptionId = Read-Host "  Subscription ID (leave empty to skip AVD)"
$resourceGroup = Read-Host "  AVD Resource Group (leave empty to skip)"

Write-Host ""
Write-Host "📝 Server Configuration" -ForegroundColor Cyan
Write-Host ""

$port = Read-Host "  Server Port (default: 8080)"
if ([string]::IsNullOrEmpty($port)) { $port = 8080 }

# Build configuration object
$config = @{
    Azure = @{
        TenantId      = $tenantId
        ClientId      = $clientId
        ClientSecret  = $clientSecretPlain
        RedirectUri   = "http://localhost:$port/auth/callback"
    }
    Server = @{
        Port          = [int]$port
        Host          = "localhost"
        EnableHttps   = $false
        CertificatePath = ""
        CertificatePassword = ""
    }
    Cache = @{
        EnableCaching         = $true
        DefaultTTLMinutes     = 5
        UserCacheTTLMinutes   = 15
        DeviceCacheTTLMinutes = 10
    }
    Logging = @{
        LogLevel      = "Information"
        LogPath       = "logs/portal.log"
        EnableAuditLog = $true
        AuditLogPath  = "logs/audit.log"
    }
    Features = @{
        EnableIntune     = $true
        EnableAVD        = (-not [string]::IsNullOrEmpty($subscriptionId))
        EnableOffice365  = $true
        EnableAutomation = $true
    }
    AVD = @{
        SubscriptionId = if ($subscriptionId) { $subscriptionId } else { "" }
        ResourceGroup  = if ($resourceGroup) { $resourceGroup } else { "" }
        DefaultHostPool = ""
    }
}

# Ensure config directory exists
$configDir = Split-Path $ConfigPath -Parent
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

# Save configuration
try {
    $config | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigPath -Encoding UTF8
    Write-Host ""
    Write-Host "✅ Configuration saved successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration file: $ConfigPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1. Start the portal:" -ForegroundColor White
    Write-Host "     pwsh src/API/Server.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "     OR with Docker:" -ForegroundColor White
    Write-Host "     docker-compose up -d" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Open your browser:" -ForegroundColor White
    Write-Host "     http://localhost:$port" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Monitor logs:" -ForegroundColor White
    Write-Host "     tail -f logs/portal.log" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "❌ Failed to save configuration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""
