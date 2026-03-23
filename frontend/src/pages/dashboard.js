// ── Dashboard Page ────────────────────────────────────────────────────────────

import { api }                                        from '../js/api.js';
import { auth }                                       from '../js/auth.js';
import { renderSidebar, renderTopbar, bindSidebar,
         fmtDate, fmt, tableLoadingRow, tableEmptyRow } from '../js/ui.js';

export function renderDashboard() {
  const user    = auth.user();
  const isAdmin = auth.isAdmin();

  return `
  <div class="page-enter app-layout">
    ${renderSidebar('dashboard')}
    <div class="main-content">
      ${renderTopbar(`Good ${getGreeting()}, ${user?.name?.split(' ')[0] || 'there'} 👋`, isAdmin ? 'Admin Dashboard' : 'User Dashboard')}

      <div class="page-body">

        <!-- Stat cards -->
        <div id="stats-row" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:28px;">
          ${[1,2,3,4].map(() => `<div class="stat-card"><div class="skeleton" style="height:32px;width:80px;margin-bottom:8px;"></div><div class="skeleton" style="height:12px;width:120px;"></div></div>`).join('')}
        </div>

        <div style="display:grid;grid-template-columns:${isAdmin ? '1fr 1fr' : '1fr'};gap:20px;">

          <!-- Recent Sales -->
          <div class="card" style="overflow:hidden;">
            <div style="padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:13px;font-weight:500;color:var(--text)">Recent Sales</span>
              <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;" data-nav="sales">View all</button>
            </div>
            <div style="overflow-x:auto;">
              <table class="data-table">
                <thead><tr>
                  <th>Product</th><th>Qty</th><th>Amount</th><th>Date</th>
                </tr></thead>
                <tbody id="recent-sales">${tableLoadingRow(4)}</tbody>
              </table>
            </div>
          </div>

          ${isAdmin ? `
          <!-- Expiry Alerts -->
          <div class="card" style="overflow:hidden;">
            <div style="padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:13px;font-weight:500;color:var(--text)">Expiry Alerts</span>
              <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;" data-nav="reports">View all</button>
            </div>
            <div style="overflow-x:auto;">
              <table class="data-table">
                <thead><tr><th>Product</th><th>Days Left</th><th>Action</th></tr></thead>
                <tbody id="expiry-alerts">${tableLoadingRow(3)}</tbody>
              </table>
            </div>
          </div>` : ''}
        </div>
      </div>
    </div>
  </div>`;
}

export async function initDashboard() {
  bindSidebar();
  const isAdmin = auth.isAdmin();

  // Load stats
  if (isAdmin) {
    await Promise.allSettled([
      loadAdminStats(),
      loadExpiry(),
    ]);
  } else {
    loadUserStats();
  }
  loadRecentSales();
}

async function loadAdminStats() {
  try {
    const stocks = await api.get('/stock/stock/total');
    const totalProducts = stocks.length;
    const totalUnits    = stocks.reduce((s, i) => s + (i.total_quantity || 0), 0);

    document.getElementById('stats-row').innerHTML = `
      ${statCard('Total Products', totalProducts, '📦', 'var(--info)')}
      ${statCard('Total Stock Units', totalUnits.toLocaleString(), '🗃️', 'var(--accent)')}
      ${statCard('Low Stock Items', stocks.filter(s => s.total_quantity < 10).length, '⚠️', 'var(--warn)')}
      ${statCard('Out of Stock', stocks.filter(s => s.total_quantity <= 0).length, '🚨', 'var(--danger)')}`;
  } catch {
    document.getElementById('stats-row').innerHTML = `<p style="color:var(--muted);font-size:13px;grid-column:1/-1;">Could not load stats.</p>`;
  }
}

function loadUserStats() {
  document.getElementById('stats-row').innerHTML = `
    ${statCard('Your Role', 'USER', '👤', 'var(--info)')}
    ${statCard('Access Level', 'Standard', '🔑', 'var(--accent)')}`;
}

async function loadExpiry() {
  try {
    const alerts = await api.get('/stock/stocks/expiry-alerts');
    const tbody  = document.getElementById('expiry-alerts');
    if (!tbody) return;
    if (!alerts.length) { tbody.innerHTML = tableEmptyRow(3, 'No expiry alerts.'); return; }

    tbody.innerHTML = alerts.slice(0, 6).map(a => {
      const urgency = a.days_to_expire <= 30 ? 'badge-red' : a.days_to_expire <= 90 ? 'badge-yellow' : 'badge-blue';
      return `<tr>
        <td style="font-weight:500">${a.product_name}</td>
        <td><span class="badge ${urgency}">${a.days_to_expire}d</span></td>
        <td style="font-size:11px;color:var(--muted);max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.recommended_action}</td>
      </tr>`;
    }).join('');
  } catch {
    const tbody = document.getElementById('expiry-alerts');
    if (tbody) tbody.innerHTML = tableEmptyRow(3, 'Could not load alerts.');
  }
}

async function loadRecentSales() {
  // We don't have a "list sales" endpoint, so show a placeholder
  const tbody = document.getElementById('recent-sales');
  if (!tbody) return;
  tbody.innerHTML = tableEmptyRow(4, 'Go to Sales to view transactions.');
}

function statCard(label, value, emoji, color) {
  return `
    <div class="stat-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-size:20px">${emoji}</span>
        <span style="width:8px;height:8px;border-radius:50%;background:${color};opacity:.7;"></span>
      </div>
      <div class="stat-value" style="font-size:28px">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}