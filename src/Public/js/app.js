// Cloud Management Portal - Main Application JavaScript

const API_BASE = '/api';
let currentPage = 'dashboard';

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    checkAuthStatus();
    loadDashboard();
});

// Navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show page
            const pageName = item.dataset.page;
            showPage(pageName);
        });
    });
}

function showPage(pageName) {
    currentPage = pageName;

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const pageElement = document.getElementById(`${pageName}-page`);
    if (pageElement) {
        pageElement.classList.add('active');
    }

    // Update title
    const titles = {
        'dashboard': 'Dashboard',
        'm365': 'Microsoft 365',
        'intune': 'Intune Devices',
        'avd': 'Azure Virtual Desktop',
        'sessions': 'AVD Sessions'
    };
    document.getElementById('pageTitle').textContent = titles[pageName] || pageName;

    // Load page data
    switch (pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'm365':
            loadM365Data();
            break;
        case 'intune':
            loadIntuneDevices();
            break;
        case 'avd':
            loadHostPools();
            break;
        case 'sessions':
            loadHostPoolsForSessions();
            break;
    }
}

function refreshCurrentPage() {
    showPage(currentPage);
    showToast('Refreshing data...', 'Data refresh initiated', 'success');
}

// Authentication
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE}/auth/status`);
        const data = await response.json();

        const statusElement = document.getElementById('authStatus');
        if (data.authenticated) {
            statusElement.innerHTML = '<span class="status-icon">🔓</span><span class="status-text">Authenticated</span>';
        } else {
            statusElement.innerHTML = '<span class="status-icon">🔒</span><span class="status-text">Not Authenticated</span>';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        document.getElementById('authStatus').innerHTML = '<span class="status-icon">⚠️</span><span class="status-text">Auth Error</span>';
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/dashboard`);
        const data = await response.json();

        // Update M365 stats
        document.getElementById('m365-users-total').textContent = data.m365.Users.Total;
        document.getElementById('m365-users-active').textContent = data.m365.Users.Active;

        // Update Intune stats
        document.getElementById('intune-devices-total').textContent = data.intune.Devices.Total;
        document.getElementById('intune-devices-compliant').textContent = data.intune.Devices.Compliant;

        // Update AVD stats
        document.getElementById('avd-hosts-total').textContent = data.avd.TotalHosts;
        document.getElementById('avd-hosts-active').textContent = data.avd.ActiveHosts;
        document.getElementById('avd-sessions-total').textContent = data.avd.TotalSessions;

        // Update license overview
        const licenseOverview = document.getElementById('license-overview');
        if (data.m365.Licenses.Details && data.m365.Licenses.Details.length > 0) {
            licenseOverview.innerHTML = data.m365.Licenses.Details.map(license => `
                <div class="license-item">
                    <span class="license-name">${license.Name}</span>
                    <span class="license-count">${license.Consumed} / ${license.Total}</span>
                </div>
            `).join('');
        } else {
            licenseOverview.innerHTML = '<p class="loading">No license data available</p>';
        }

        // Update host pool overview
        const hostpoolOverview = document.getElementById('hostpool-overview');
        if (data.avd.HostPools && data.avd.HostPools.length > 0) {
            hostpoolOverview.innerHTML = data.avd.HostPools.map(pool => `
                <div class="hostpool-item">
                    <span class="hostpool-name">${pool.Name}</span>
                    <span class="hostpool-stats">${pool.ActiveHosts}/${pool.TotalHosts} hosts, ${pool.ActiveSessions} sessions</span>
                </div>
            `).join('');
        } else {
            hostpoolOverview.innerHTML = '<p class="loading">No host pool data available</p>';
        }

    } catch (error) {
        console.error('Dashboard load error:', error);
        showToast('Error', 'Failed to load dashboard data', 'error');
    }
}

// M365 Management
async function loadM365Data() {
    await loadUsers();
    await loadGroups();
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/m365/users?top=50`);
        const data = await response.json();

        const tbody = document.querySelector('#users-table tbody');

        if (data.value && data.value.length > 0) {
            tbody.innerHTML = data.value.map(user => `
                <tr>
                    <td>${user.displayName || 'N/A'}</td>
                    <td>${user.userPrincipalName || 'N/A'}</td>
                    <td><span class="badge ${user.accountEnabled ? 'badge-success' : 'badge-danger'}">${user.accountEnabled ? 'Enabled' : 'Disabled'}</span></td>
                    <td>${user.assignedLicenses ? user.assignedLicenses.length : 0}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-secondary" onclick="viewUser('${user.id}')">View</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="loading">No users found</td></tr>';
        }
    } catch (error) {
        console.error('Users load error:', error);
        showToast('Error', 'Failed to load users', 'error');
    }
}

async function loadGroups() {
    try {
        const response = await fetch(`${API_BASE}/m365/groups`);
        const data = await response.json();

        const tbody = document.querySelector('#groups-table tbody');

        if (data.value && data.value.length > 0) {
            tbody.innerHTML = data.value.map(group => `
                <tr>
                    <td>${group.displayName || 'N/A'}</td>
                    <td>${group.groupTypes && group.groupTypes.includes('Unified') ? 'Microsoft 365' : 'Security'}</td>
                    <td><span class="badge ${group.mailEnabled ? 'badge-success' : 'badge-secondary'}">${group.mailEnabled ? 'Yes' : 'No'}</span></td>
                    <td><span class="badge ${group.securityEnabled ? 'badge-success' : 'badge-secondary'}">${group.securityEnabled ? 'Yes' : 'No'}</span></td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-secondary" onclick="viewGroup('${group.id}')">View</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="loading">No groups found</td></tr>';
        }
    } catch (error) {
        console.error('Groups load error:', error);
        showToast('Error', 'Failed to load groups', 'error');
    }
}

// Intune Device Management
async function loadIntuneDevices() {
    try {
        const response = await fetch(`${API_BASE}/intune/devices?top=50`);
        const data = await response.json();

        const tbody = document.querySelector('#devices-table tbody');

        if (data.value && data.value.length > 0) {
            tbody.innerHTML = data.value.map(device => `
                <tr>
                    <td>${device.deviceName || 'N/A'}</td>
                    <td>${device.userDisplayName || device.userPrincipalName || 'N/A'}</td>
                    <td>${device.operatingSystem || 'N/A'}</td>
                    <td><span class="badge ${getComplianceBadgeClass(device.complianceState)}">${device.complianceState || 'Unknown'}</span></td>
                    <td>${device.lastSyncDateTime ? new Date(device.lastSyncDateTime).toLocaleString() : 'Never'}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-secondary" onclick="syncDevice('${device.id}')">Sync</button>
                            <button class="btn btn-sm btn-warning" onclick="restartDevice('${device.id}')">Restart</button>
                            <button class="btn btn-sm btn-danger" onclick="lockDevice('${device.id}')">Lock</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">No devices found</td></tr>';
        }
    } catch (error) {
        console.error('Devices load error:', error);
        showToast('Error', 'Failed to load devices', 'error');
    }
}

function getComplianceBadgeClass(state) {
    switch (state) {
        case 'compliant': return 'badge-success';
        case 'noncompliant': return 'badge-danger';
        default: return 'badge-secondary';
    }
}

async function syncDevice(deviceId) {
    if (!confirm('Sync this device?')) return;

    try {
        await fetch(`${API_BASE}/intune/devices/${deviceId}/sync`, { method: 'POST' });
        showToast('Success', 'Device sync initiated', 'success');
    } catch (error) {
        showToast('Error', 'Failed to sync device', 'error');
    }
}

async function restartDevice(deviceId) {
    if (!confirm('Restart this device?')) return;

    try {
        await fetch(`${API_BASE}/intune/devices/${deviceId}/restart`, { method: 'POST' });
        showToast('Success', 'Device restart initiated', 'success');
    } catch (error) {
        showToast('Error', 'Failed to restart device', 'error');
    }
}

async function lockDevice(deviceId) {
    if (!confirm('Lock this device?')) return;

    try {
        await fetch(`${API_BASE}/intune/devices/${deviceId}/lock`, { method: 'POST' });
        showToast('Success', 'Device lock initiated', 'success');
    } catch (error) {
        showToast('Error', 'Failed to lock device', 'error');
    }
}

// ============================================================
// AVD Host Pool Dashboard
// ============================================================
const expandedPools = new Set();
let avdState = { pools: [], hostsByPool: {}, isDemo: false };

const MOCK_HOSTPOOLS = [
    {
        name: 'hp-prod-frankfurt',
        location: 'westeurope',
        properties: { hostPoolType: 'Pooled', loadBalancerType: 'DepthFirst', maxSessionLimit: 8 }
    },
    {
        name: 'hp-engineering-eu',
        location: 'westeurope',
        properties: { hostPoolType: 'Pooled', loadBalancerType: 'BreadthFirst', maxSessionLimit: 6 }
    },
    {
        name: 'hp-finance-personal',
        location: 'northeurope',
        properties: { hostPoolType: 'Personal', loadBalancerType: 'Persistent', maxSessionLimit: 1 }
    },
    {
        name: 'hp-support-na',
        location: 'eastus',
        properties: { hostPoolType: 'Pooled', loadBalancerType: 'BreadthFirst', maxSessionLimit: 10 }
    }
];

function mockSessionHostsFor(poolName) {
    const seed = poolName.length;
    const vmSizes = ['Standard_D4s_v5', 'Standard_D8s_v5', 'Standard_E4s_v5', 'Standard_D2s_v5'];
    const statuses = ['Available', 'Available', 'Available', 'Unavailable', 'Shutdown'];
    const hosts = [];
    const count = 3 + (seed % 4);
    for (let i = 0; i < count; i++) {
        const status = statuses[(seed + i) % statuses.length];
        const isPremium = (seed + i) % 3 !== 0;
        const allowNew = !((seed + i) % 5 === 0);
        const sessions = status === 'Available' ? (i + 1) % 5 : 0;
        hosts.push({
            name: `${poolName}/sh-${String(i).padStart(2, '0')}.contoso.local`,
            properties: {
                status,
                sessions,
                allowNewSession: allowNew,
                vmSize: vmSizes[(seed + i) % vmSizes.length],
                osDiskType: isPremium ? 'Premium_LRS' : 'Standard_LRS',
                lastHeartBeat: new Date(Date.now() - (i + 1) * 60000).toISOString()
            }
        });
    }
    return { value: hosts };
}

function renderHostpoolSkeletons(count = 4) {
    const grid = document.getElementById('hostpool-grid');
    if (!grid) return;
    grid.innerHTML = Array.from({ length: count }, () => `
        <div class="skeleton-card">
            <div class="skeleton-line w-60"></div>
            <div class="skeleton-line w-40"></div>
            <div class="skeleton-line h-32 w-80"></div>
            <div class="skeleton-line w-60"></div>
            <div class="skeleton-line w-40"></div>
        </div>
    `).join('');
}

async function loadHostPools() {
    const grid = document.getElementById('hostpool-grid');
    if (!grid) return;

    renderHostpoolSkeletons();

    let pools = [];
    let isDemo = false;

    try {
        const response = await fetch(`${API_BASE}/avd/hostpools`);
        if (response.ok) {
            const data = await response.json();
            if (data && Array.isArray(data.value) && data.value.length > 0) {
                pools = data.value;
            } else {
                isDemo = true;
            }
        } else {
            isDemo = true;
        }
    } catch (err) {
        console.warn('Host pools API unreachable — falling back to demo data.', err);
        isDemo = true;
    }

    if (isDemo) pools = MOCK_HOSTPOOLS;

    const hostsByPool = {};
    await Promise.all(pools.map(async (pool) => {
        const name = pool.name;
        if (isDemo) {
            hostsByPool[name] = mockSessionHostsFor(name).value;
            return;
        }
        try {
            const r = await fetch(`${API_BASE}/avd/hostpools/${encodeURIComponent(name)}/sessionhosts`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const d = await r.json();
            hostsByPool[name] = Array.isArray(d.value) ? d.value : [];
        } catch (err) {
            console.warn(`Session hosts for ${name} failed — using demo data.`, err);
            hostsByPool[name] = mockSessionHostsFor(name).value;
        }
    }));

    avdState = { pools, hostsByPool, isDemo };

    document.getElementById('avd-demo-banner').style.display = isDemo ? 'flex' : 'none';

    renderHostpoolGrid();
    updateTopbarMetrics();
}

function renderHostpoolGrid() {
    const grid = document.getElementById('hostpool-grid');
    const { pools, hostsByPool } = avdState;

    if (!pools.length) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <h4>No host pools found</h4>
                <div>Once host pools are deployed in your subscription they will show up here.</div>
            </div>`;
        return;
    }

    grid.innerHTML = pools.map(pool => renderHostpoolCard(pool, hostsByPool[pool.name] || [])).join('');
}

function renderHostpoolCard(pool, hosts) {
    const name = pool.name;
    const type = pool.properties?.hostPoolType || 'Unknown';
    const lb = pool.properties?.loadBalancerType || '—';
    const location = pool.location || '—';
    const total = hosts.length;
    const available = hosts.filter(h => h.properties?.status === 'Available').length;
    const offline = hosts.filter(h => ['Unavailable', 'Shutdown', 'NoHeartbeat'].includes(h.properties?.status)).length;
    const activeSessions = hosts.reduce((s, h) => s + (h.properties?.sessions || 0), 0);
    const maxSession = pool.properties?.maxSessionLimit || 0;
    const capacity = maxSession * total;
    const usagePct = capacity > 0 ? Math.min(100, Math.round((activeSessions / capacity) * 100)) : 0;
    const usageClass = usagePct >= 85 ? 'crit' : usagePct >= 60 ? 'warn' : '';
    const isExpanded = expandedPools.has(name);
    const safeId = `pool-${cssEscape(name)}`;

    return `
        <div class="hostpool-card${isExpanded ? ' expanded' : ''}" id="${safeId}">
            <div class="hostpool-card-body">
                <div class="hostpool-card-header">
                    <div>
                        <div class="hostpool-name">${escapeHtml(name)}</div>
                        <div class="hostpool-meta">
                            <span class="tag accent">${escapeHtml(type)}</span>
                            <span class="tag violet">${escapeHtml(lb)}</span>
                            <span class="tag">📍 ${escapeHtml(location)}</span>
                        </div>
                    </div>
                    <button class="expand-btn" onclick="togglePool('${jsEscape(name)}')" aria-expanded="${isExpanded}" title="${isExpanded ? 'Collapse' : 'Expand session hosts'}">
                        <span class="chev">⌄</span>
                    </button>
                </div>

                <div class="hostpool-stats">
                    <div class="hp-stat"><div class="label">Total</div><div class="value">${total}</div></div>
                    <div class="hp-stat success"><div class="label">Available</div><div class="value">${available}</div></div>
                    <div class="hp-stat danger"><div class="label">Offline</div><div class="value">${offline}</div></div>
                    <div class="hp-stat accent"><div class="label">Sessions</div><div class="value">${activeSessions}</div></div>
                </div>

                <div class="usage-row">
                    <span>Capacity utilization</span>
                    <span><strong>${usagePct}%</strong>${capacity ? ` · ${activeSessions}/${capacity}` : ''}</span>
                </div>
                <div class="usage-bar">
                    <div class="usage-fill ${usageClass}" style="width:${usagePct}%;"></div>
                </div>
            </div>

            <div class="sessionhosts-region">
                <div class="sessionhosts-inner">
                    <div class="sh-toolbar">
                        <span><strong>${total}</strong> session host${total === 1 ? '' : 's'}</span>
                        <button class="btn btn-sm btn-ghost" onclick="refreshPool('${jsEscape(name)}')">🔄 Refresh</button>
                    </div>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Host</th>
                                    <th>VM Size</th>
                                    <th>Sessions</th>
                                    <th>Drain</th>
                                    <th>OS Disk</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${hosts.length === 0
                                    ? `<tr><td colspan="6" class="empty">No session hosts in this pool.</td></tr>`
                                    : hosts.map(h => renderSessionHostRow(name, h)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;
}

function renderSessionHostRow(poolName, host) {
    const fullName = host.name || 'unknown';
    const shortName = fullName.split('/').pop();
    const status = host.properties?.status || 'Unknown';
    const sessions = host.properties?.sessions ?? 0;
    const allowNew = host.properties?.allowNewSession !== false;
    const drainOn = !allowNew;
    const vmSize = host.properties?.vmSize || '—';
    const diskType = host.properties?.osDiskType || '';
    const dotClass = status.toLowerCase().replace(/[^a-z]/g, '');
    const disk = renderDiskPill(diskType);

    return `
        <tr>
            <td>
                <div class="host-name-cell">
                    <span class="status-dot ${dotClass}" title="${escapeHtml(status)}"></span>
                    <span class="host-name-text">${escapeHtml(shortName)}</span>
                </div>
            </td>
            <td><span class="badge badge-secondary">${escapeHtml(vmSize)}</span></td>
            <td>${sessions}</td>
            <td><span class="badge ${drainOn ? 'badge-warning' : 'badge-success'}">${drainOn ? 'On' : 'Off'}</span></td>
            <td>${disk}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-success" onclick="startSessionHost('${jsEscape(poolName)}','${jsEscape(shortName)}')">Start</button>
                    <button class="btn btn-sm btn-danger"  onclick="confirmStopHost('${jsEscape(poolName)}','${jsEscape(shortName)}')">Stop</button>
                    <button class="btn btn-sm btn-warning" onclick="confirmDrainMode('${jsEscape(poolName)}','${jsEscape(shortName)}', ${drainOn})">${drainOn ? 'Resume' : 'Drain'}</button>
                    <button class="btn btn-sm btn-ghost"   onclick="restartSessionHost('${jsEscape(poolName)}','${jsEscape(shortName)}')">Restart</button>
                </div>
            </td>
        </tr>`;
}

function renderDiskPill(diskType) {
    if (!diskType) return `<span class="disk-pill standard"><span class="dot"></span>Unknown</span>`;
    const isPremium = /premium/i.test(diskType);
    const label = isPremium ? 'Premium SSD' : 'Standard HDD';
    return `<span class="disk-pill ${isPremium ? 'premium' : 'standard'}"><span class="dot"></span>${label}</span>`;
}

function togglePool(poolName) {
    if (expandedPools.has(poolName)) {
        expandedPools.delete(poolName);
    } else {
        expandedPools.add(poolName);
    }
    renderHostpoolGrid();
}

function updateTopbarMetrics() {
    const { pools, hostsByPool } = avdState;
    const allHosts = pools.flatMap(p => hostsByPool[p.name] || []);
    const total = allHosts.length;
    const offline = allHosts.filter(h => ['Unavailable', 'Shutdown', 'NoHeartbeat'].includes(h.properties?.status)).length;
    const sessions = allHosts.reduce((s, h) => s + (h.properties?.sessions || 0), 0);
    setText('metric-pools', pools.length);
    setText('metric-hosts', total);
    setText('metric-sessions', sessions);
    setText('metric-offline', offline);
}

async function refreshPool(poolName) {
    if (avdState.isDemo) {
        avdState.hostsByPool[poolName] = mockSessionHostsFor(poolName).value;
        renderHostpoolGrid();
        updateTopbarMetrics();
        showToast('Refreshed', `Reloaded ${poolName}`, 'info');
        return;
    }
    try {
        const r = await fetch(`${API_BASE}/avd/hostpools/${encodeURIComponent(poolName)}/sessionhosts`);
        const d = await r.json();
        avdState.hostsByPool[poolName] = Array.isArray(d.value) ? d.value : [];
        renderHostpoolGrid();
        updateTopbarMetrics();
        showToast('Refreshed', `Reloaded ${poolName}`, 'info');
    } catch (err) {
        showToast('Error', `Failed to refresh ${poolName}`, 'error');
    }
}

// Legacy entry kept for any future host-pool-select usage; defers to grid view.
async function loadSessionHosts() {
    await loadHostPools();
}

// ---------- Session-host actions ----------
async function startSessionHost(hostPool, hostName) {
    try {
        const r = await fetch(`${API_BASE}/avd/hostpools/${encodeURIComponent(hostPool)}/sessionhosts/${encodeURIComponent(hostName)}/start`, { method: 'POST' });
        if (!r.ok && !avdState.isDemo) throw new Error(`HTTP ${r.status}`);
        showToast('Starting', `${hostName} is starting up`, 'success');
        setTimeout(() => refreshPool(hostPool), 1500);
    } catch (err) {
        showToast('Error', `Failed to start ${hostName}`, 'error');
    }
}

async function restartSessionHost(hostPool, hostName) {
    try {
        const r = await fetch(`${API_BASE}/avd/hostpools/${encodeURIComponent(hostPool)}/sessionhosts/${encodeURIComponent(hostName)}/restart`, { method: 'POST' });
        if (!r.ok && !avdState.isDemo) throw new Error(`HTTP ${r.status}`);
        showToast('Restarting', `${hostName} is restarting`, 'warning');
        setTimeout(() => refreshPool(hostPool), 1500);
    } catch (err) {
        showToast('Error', `Failed to restart ${hostName}`, 'error');
    }
}

function confirmStopHost(hostPool, hostName) {
    document.getElementById('stop-host-name').textContent = hostName;
    const btn = document.getElementById('stop-host-confirm');
    btn.onclick = async () => {
        closeModal('stop-host-modal');
        try {
            const r = await fetch(`${API_BASE}/avd/hostpools/${encodeURIComponent(hostPool)}/sessionhosts/${encodeURIComponent(hostName)}/stop`, { method: 'POST' });
            if (!r.ok && !avdState.isDemo) throw new Error(`HTTP ${r.status}`);
            showToast('Stopping', `${hostName} is shutting down. Disk optimization tip applied.`, 'success');
            setTimeout(() => refreshPool(hostPool), 1500);
        } catch (err) {
            showToast('Error', `Failed to stop ${hostName}`, 'error');
        }
    };
    openModal('stop-host-modal');
}

function confirmDrainMode(hostPool, hostName, currentlyDraining) {
    const willEnable = !currentlyDraining;
    const verb = willEnable ? 'Enable drain mode' : 'Disable drain mode';
    document.getElementById('drain-mode-title').textContent = `${verb}?`;
    document.getElementById('drain-mode-subtitle').innerHTML = willEnable
        ? `Stop routing new sessions to <strong>${escapeHtml(hostName)}</strong>. Existing users remain connected.`
        : `Allow new sessions on <strong>${escapeHtml(hostName)}</strong> again.`;
    const btn = document.getElementById('drain-mode-confirm');
    btn.textContent = willEnable ? 'Enable Drain' : 'Disable Drain';
    btn.className = `btn ${willEnable ? 'btn-warning' : 'btn-success'}`;
    btn.onclick = async () => {
        closeModal('drain-mode-modal');
        try {
            const r = await fetch(`${API_BASE}/avd/hostpools/${encodeURIComponent(hostPool)}/sessionhosts/${encodeURIComponent(hostName)}/drainmode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enable: willEnable })
            });
            if (!r.ok && !avdState.isDemo) throw new Error(`HTTP ${r.status}`);
            showToast('Drain mode', `${willEnable ? 'Enabled' : 'Disabled'} for ${hostName}`, willEnable ? 'warning' : 'success');
            setTimeout(() => refreshPool(hostPool), 800);
        } catch (err) {
            showToast('Error', `Failed to toggle drain mode`, 'error');
        }
    };
    openModal('drain-mode-modal');
}

// Deprecated direct toggle kept as a thin wrapper for backwards compatibility.
function toggleDrainMode(hostPool, hostName, currentAllowNewSession) {
    confirmDrainMode(hostPool, hostName, !currentAllowNewSession);
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'Available': return 'badge-success';
        case 'Unavailable': return 'badge-danger';
        default: return 'badge-secondary';
    }
}

// ---------- Modal helpers ----------
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
});

// ---------- Small utilities ----------
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function jsEscape(str) {
    return String(str ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function cssEscape(str) {
    return String(str ?? '').replace(/[^a-zA-Z0-9_-]/g, '-');
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// AVD Sessions
async function loadHostPoolsForSessions() {
    try {
        const response = await fetch(`${API_BASE}/avd/hostpools`);
        const data = await response.json();

        const select = document.getElementById('sessions-hostpool-select');

        if (data.value && data.value.length > 0) {
            select.innerHTML = '<option value="">Select Host Pool...</option>' +
                data.value.map(pool => `<option value="${pool.name}">${pool.name}</option>`).join('');
        } else {
            select.innerHTML = '<option value="">No host pools found</option>';
        }
    } catch (error) {
        console.error('Host pools load error:', error);
    }
}

async function loadUserSessions() {
    const hostPool = document.getElementById('sessions-hostpool-select').value;
    if (!hostPool) return;

    try {
        const response = await fetch(`${API_BASE}/avd/hostpools/${hostPool}/sessions`);
        const data = await response.json();

        const tbody = document.querySelector('#sessions-table tbody');

        if (data.value && data.value.length > 0) {
            tbody.innerHTML = data.value.map(session => `
                <tr>
                    <td>${session.properties.userPrincipalName || 'N/A'}</td>
                    <td>${session.name ? session.name.split('/')[1] : 'N/A'}</td>
                    <td><span class="badge ${getSessionStateBadgeClass(session.properties.sessionState)}">${session.properties.sessionState || 'Unknown'}</span></td>
                    <td>${session.properties.applicationType || 'N/A'}</td>
                    <td>${session.properties.createTime ? new Date(session.properties.createTime).toLocaleString() : 'N/A'}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-warning" onclick="disconnectSession('${hostPool}', '${session.name}', '${session.id}')">Disconnect</button>
                            <button class="btn btn-sm btn-danger" onclick="logoffSession('${hostPool}', '${session.name}', '${session.id}')">Logoff</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">No active sessions found</td></tr>';
        }
    } catch (error) {
        console.error('Sessions load error:', error);
        showToast('Error', 'Failed to load sessions', 'error');
    }
}

function getSessionStateBadgeClass(state) {
    switch (state) {
        case 'Active': return 'badge-success';
        case 'Disconnected': return 'badge-warning';
        default: return 'badge-secondary';
    }
}

async function disconnectSession(hostPool, sessionName, sessionId) {
    if (!confirm('Disconnect this user session?')) return;

    const hostName = sessionName.split('/')[1];

    try {
        await fetch(`${API_BASE}/avd/hostpools/${hostPool}/sessionhosts/${hostName}/sessions/${sessionId}/disconnect`, { method: 'POST' });
        showToast('Success', 'Session disconnected', 'success');
        setTimeout(() => loadUserSessions(), 1000);
    } catch (error) {
        showToast('Error', 'Failed to disconnect session', 'error');
    }
}

async function logoffSession(hostPool, sessionName, sessionId) {
    if (!confirm('Logoff this user? This will end their session immediately.')) return;

    const hostName = sessionName.split('/')[1];

    try {
        await fetch(`${API_BASE}/avd/hostpools/${hostPool}/sessionhosts/${hostName}/sessions/${sessionId}`, { method: 'DELETE' });
        showToast('Success', 'User logged off', 'success');
        setTimeout(() => loadUserSessions(), 1000);
    } catch (error) {
        showToast('Error', 'Failed to logoff user', 'error');
    }
}

// Toast Notifications
function showToast(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Placeholder functions
function viewUser(userId) {
    showToast('Info', 'User details view coming soon', 'success');
}

function viewGroup(groupId) {
    showToast('Info', 'Group details view coming soon', 'success');
}

function showModal(modalType) {
    showToast('Info', 'Create forms coming soon', 'success');
}
