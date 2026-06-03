#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Status check for Cloud Management Portal

.DESCRIPTION
    Checks the current status of all portal features and configuration
#>

Write-Host @"

╔═══════════════════════════════════════════════════════════╗
║   Cloud Management Portal - Status Check                 ║
╚═══════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

$configPath = "config/appsettings.json"

# Check if config exists
Write-Host "📋 Configuration Status:" -ForegroundColor Yellow
if (Test-Path $configPath) {
    Write-Host "  ✅ Config file exists: $configPath" -ForegroundColor Green

    try {
        $config = Get-Content $configPath | ConvertFrom-Json

        # Check Azure AD
        Write-Host "`n🔐 Azure AD Configuration:" -ForegroundColor Yellow
        if ($config.Azure.TenantId -and $config.Azure.TenantId -ne "your-tenant-id-here") {
            Write-Host "  ✅ Tenant ID configured" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Tenant ID missing" -ForegroundColor Red
        }

        if ($config.Azure.ClientId -and $config.Azure.ClientId -ne "your-app-client-id-here") {
            Write-Host "  ✅ Client ID configured" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Client ID missing" -ForegroundColor Red
        }

        if ($config.Azure.ClientSecret -and $config.Azure.ClientSecret -ne "your-app-client-secret-here") {
            Write-Host "  ✅ Client Secret configured" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Client Secret missing" -ForegroundColor Red
        }

        # Check features
        Write-Host "`n🎯 Enabled Features:" -ForegroundColor Yellow
        if ($config.Features.EnableOffice365) {
            Write-Host "  ✅ Microsoft 365" -ForegroundColor Green
        }
        if ($config.Features.EnableIntune) {
            Write-Host "  ✅ Intune Device Management" -ForegroundColor Green
        }
        if ($config.Features.EnableAVD) {
            Write-Host "  ✅ Azure Virtual Desktop (enabled in config)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Azure Virtual Desktop (disabled)" -ForegroundColor Yellow
        }

        # Check AVD config
        Write-Host "`n🖥️  AVD Configuration:" -ForegroundColor Yellow
        if ($config.AVD.SubscriptionId -and $config.AVD.SubscriptionId -ne "your-subscription-id-here" -and $config.AVD.SubscriptionId -ne "") {
            Write-Host "  ✅ Subscription ID configured" -ForegroundColor Green
            Write-Host "     $($config.AVD.SubscriptionId)" -ForegroundColor Gray
        } else {
            Write-Host "  ❌ Subscription ID missing or placeholder" -ForegroundColor Red
        }

        if ($config.AVD.ResourceGroup -and $config.AVD.ResourceGroup -ne "your-avd-resource-group" -and $config.AVD.ResourceGroup -ne "") {
            Write-Host "  ✅ Resource Group configured" -ForegroundColor Green
            Write-Host "     $($config.AVD.ResourceGroup)" -ForegroundColor Gray
        } else {
            Write-Host "  ❌ Resource Group missing or placeholder" -ForegroundColor Red
        }

        # Server config
        Write-Host "`n🌐 Server Configuration:" -ForegroundColor Yellow
        Write-Host "  Port: $($config.Server.Port)" -ForegroundColor Gray
        Write-Host "  Host: $($config.Server.Host)" -ForegroundColor Gray
        Write-Host "  HTTPS: $($config.Server.EnableHttps)" -ForegroundColor Gray

    }
    catch {
        Write-Host "  ❌ Error reading config: $($_.Exception.Message)" -ForegroundColor Red
    }
}
else {
    Write-Host "  ❌ Config file not found!" -ForegroundColor Red
    Write-Host "     Run: pwsh Setup-Config.ps1" -ForegroundColor Yellow
}

# Check if server is running
Write-Host "`n🚀 Server Status:" -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  ✅ Portal is running" -ForegroundColor Green
    Write-Host "     Version: $($healthCheck.version)" -ForegroundColor Gray
    Write-Host "     URL: http://localhost:8080" -ForegroundColor Gray
}
catch {
    Write-Host "  ❌ Portal is not running or not reachable" -ForegroundColor Red
    Write-Host "     Start with: docker-compose up -d" -ForegroundColor Yellow
    Write-Host "     Or: pwsh src/API/Server.ps1" -ForegroundColor Yellow
}

# Check authentication
Write-Host "`n🔑 Authentication Status:" -ForegroundColor Yellow
try {
    $authStatus = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/status" -Method Get -TimeoutSec 2 -ErrorAction Stop
    if ($authStatus.authenticated) {
        Write-Host "  ✅ Authentication successful" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Authentication failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "  ❌ Cannot check authentication (server not running or config error)" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "     Error: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Summary and next steps
$allGood = $true
if (-not (Test-Path $configPath)) { $allGood = $false }

Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host ""

if ($allGood) {
    Write-Host "  Everything looks good! You can:" -ForegroundColor Green
    Write-Host ""
    Write-Host "  1. Open the portal: http://localhost:8080" -ForegroundColor White
    Write-Host "  2. Test M365 features (Users, Groups, Licenses)" -ForegroundColor White
    Write-Host "  3. Test Intune features (Device Management)" -ForegroundColor White
    if ($config.Features.EnableAVD -and $config.AVD.SubscriptionId) {
        Write-Host "  4. Test AVD features (Host Pools, Sessions)" -ForegroundColor White
    }
}
else {
    Write-Host "  Fix the issues marked with ❌ above, then:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. Run: pwsh Setup-Config.ps1  (if config is missing)" -ForegroundColor White
    Write-Host "  2. Update config/appsettings.json (fill in real values)" -ForegroundColor White
    Write-Host "  3. Restart: docker-compose restart" -ForegroundColor White
    Write-Host "  4. Check again: pwsh Check-Status.ps1" -ForegroundColor White
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""
