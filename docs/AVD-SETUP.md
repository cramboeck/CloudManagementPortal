# Azure Virtual Desktop (AVD) Setup Guide

## Overview

To enable AVD features in the Cloud Management Portal, you need:

1. An Azure subscription with AVD resources
2. Proper RBAC permissions for your Azure AD App
3. AVD configuration in `appsettings.json`

---

## Prerequisites

### 1. Azure Virtual Desktop Environment

You need at least one AVD Host Pool in your Azure subscription:

- **Host Pool**: The container for session hosts
- **Session Hosts**: VMs that users connect to
- **Resource Group**: Azure resource group containing AVD resources

If you don't have AVD set up yet, follow Microsoft's guide:
https://learn.microsoft.com/azure/virtual-desktop/create-host-pools-azure-marketplace

### 2. Azure RBAC Permissions

Your Azure AD App Registration needs the following RBAC roles on the **Subscription** or **Resource Group** level:

#### Required Roles:

| Role | Purpose | Scope |
|------|---------|-------|
| **Desktop Virtualization Reader** | Read host pools, session hosts, sessions | Subscription or RG |
| **Desktop Virtualization Contributor** | Manage host pools, drain mode, sessions | Subscription or RG |
| **Virtual Machine Contributor** | Start/Stop/Restart session host VMs | Subscription or RG |

#### How to Assign Roles:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Subscriptions** → Select your subscription
3. Click **Access control (IAM)** → **Add role assignment**
4. Select role (e.g., "Desktop Virtualization Contributor")
5. Click **Members** tab
6. Search for your App Registration by **Client ID** or name
7. Select the app and click **Review + assign**

Repeat for each role.

---

## Configuration

### 1. Get Required Information

You need:

- **Subscription ID**: From Azure Portal → Subscriptions → Overview
- **Resource Group Name**: The RG containing your AVD resources
- **(Optional) Host Pool Name**: Name of a default host pool

### 2. Update `config/appsettings.json`

Edit the AVD section:

```json
{
  "AVD": {
    "SubscriptionId": "12345678-1234-1234-1234-123456789abc",
    "ResourceGroup": "rg-avd-production",
    "DefaultHostPool": "my-hostpool-name"
  },
  "Features": {
    "EnableAVD": true
  }
}
```

### 3. Verify Configuration

Restart the portal and check the AVD page:

```bash
# Stop the portal
docker-compose down

# Start with new config
docker-compose up -d

# Check logs
docker-compose logs -f cloud-portal
```

You should see:
```
✓ AVD Management initialized
```

---

## Testing AVD Features

### 1. List Host Pools

Navigate to **Azure Virtual Desktop** page in the portal.

You should see:
- List of host pools
- Number of session hosts
- Active sessions count

### 2. View Session Hosts

Select a host pool from the dropdown.

You should see:
- Session host names
- Status (Available, Unavailable)
- Active sessions
- Drain mode status

### 3. Manage Session Hosts

Available actions:
- **Start/Stop/Restart** - Power management
- **Enable/Disable Drain Mode** - Prevent new sessions
- **View Sessions** - See active user sessions

### 4. Manage User Sessions

Go to **AVD Sessions** page:
- View all active sessions
- Disconnect users
- Send messages to users
- Log off users

---

## Troubleshooting

### "No host pools found" or "AVD not configured"

**Possible causes:**

1. **Missing configuration**
   - Check `appsettings.json` has valid `SubscriptionId` and `ResourceGroup`
   - Restart the portal after config changes

2. **RBAC permissions missing**
   - Verify the Azure AD App has the required roles (see above)
   - It may take 5-10 minutes for RBAC assignments to propagate

3. **No host pools in resource group**
   - Check that the resource group contains AVD host pools
   - Verify resource group name is correct (case-sensitive)

4. **Wrong subscription or resource group**
   - Double-check subscription ID (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - Ensure resource group exists in that subscription

### Check Logs

```bash
# Docker
docker-compose logs -f cloud-portal

# Local
tail -f logs/portal.log
```

Look for errors like:
- `403 Forbidden` → Missing RBAC permissions
- `404 Not Found` → Wrong subscription ID or resource group
- `401 Unauthorized` → Token issue (check Azure AD App secret)

### Test Azure Access Manually

Use PowerShell to verify access:

```powershell
# Install Az module
Install-Module -Name Az -AllowClobber -Scope CurrentUser

# Connect with Service Principal
$clientSecret = ConvertTo-SecureString "your-secret" -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential("your-client-id", $clientSecret)
Connect-AzAccount -ServicePrincipal -Credential $credential -Tenant "your-tenant-id"

# Test access
Get-AzWvdHostPool -ResourceGroupName "your-rg"
```

If this fails, the issue is with Azure permissions, not the portal.

---

## Security Best Practices

1. **Least Privilege**: Only assign required RBAC roles
2. **Resource Group Scope**: Assign roles to specific RG instead of entire subscription
3. **Separate Environments**: Use different resource groups for production/test
4. **Audit Logging**: Enable Azure Activity Log for all AVD operations
5. **Client Secret Rotation**: Rotate the Azure AD App secret regularly (recommended: every 90 days)

---

## Multi-Resource Group Support

If you have host pools in multiple resource groups, you can:

### Option 1: Multiple Deployments

Deploy separate portal instances with different configs:

```bash
# Production
cd portal-prod
# Configure with production RG
docker-compose up -d

# Test
cd portal-test
# Configure with test RG
docker-compose up -d
```

### Option 2: Single Portal with Broader Permissions

Assign RBAC roles at **Subscription level** instead of Resource Group level.

Then update config to list resource groups:

```json
{
  "AVD": {
    "SubscriptionId": "...",
    "ResourceGroups": ["rg-avd-prod", "rg-avd-test", "rg-avd-dev"]
  }
}
```

**Note:** This requires code changes to support multiple RGs (not implemented yet).

---

## Next Steps

Once AVD is configured:

1. ✅ View and monitor host pools
2. ✅ Manage session hosts (start/stop/restart)
3. ✅ Control drain mode
4. ✅ Manage user sessions
5. ✅ Create images from session hosts (requires VM Contributor role)

For more information:
- [Microsoft AVD Documentation](https://learn.microsoft.com/azure/virtual-desktop/)
- [Azure RBAC Documentation](https://learn.microsoft.com/azure/role-based-access-control/)
