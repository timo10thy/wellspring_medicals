// ── Dashboard Page ────────────────────────────────────────────────────────────

import { api }                                        from '../js/api.js';
import { auth }                                       from '../js/auth.js';
import { renderSidebar, renderTopbar, bindSidebar,
         fmtDate, fmtDateTime, fmt,
         tableLoadingRow, tableEmptyRow }              from '../js/ui.js';

export function renderDashboard() {
  const user    = auth.user();
  const isAdmin = auth.isAdmin();

  return `
  <div class="page-enter app-layout">
    ${renderSidebar('dashboard')}
    <div class="main-content">
      ${renderTopbar(
        `Good ${getGreeting()}, ${user?.name?.split(' ')[0] || 'there'} 👋`,
        isAdmin ? 'Admin Dashboard' : 'User Dashboard'
      )}

      <div class="page-body">

        <!-- Stat cards -->
        <div id="stats-row" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:28px;">
          ${[1,2,3,4].map(() => `
            <div class="stat-card">
              <div class="skeleton" style="height:32px;width:80px;margin-bottom:8px;"></div>
              <div class="skeleton" style="height:12px;width:120px;"></div>
            </div>`).join('')}
        </div>

        ${isAdmin ? `
        <!-- Profit + Purchases row -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:28px;">
          <div class="card" style="padding:20px;">
            <div style="font-size:11px;font-weight:500;color:var(--muted);margin-bottom:8px;">THIS MONTH — PROFIT ESTIMATE</div>
            <div id="profit-card" style="font-family:var(--font-head);font-size:28px;color:var(--accent-lt);">
              <div class="skeleton" style="height:32px;width:140px;"></div>
            </div>
            <div id="profit-breakdown" style="margin-top:10px;font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:4px;"></div>
          </div>
          <div class="card" style="padding:20px;">
            <div style="font-size:11px;font-weight:500;color:var(--muted);margin-bottom:8px;">THIS MONTH — PURCHASES</div>
            <div id="purchases-card" style="font-family:var(--font-head);font-size:28px;color:var(--text);">
              <div class="skeleton" style="height:32px;width:140px;"></div>
            </div>
          </div>
        </div>

        <!-- Low stock alerts -->
        <div id="low-stock-section" class="card" style="overflow:hidden;margin-bottom:20px;display:none;">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:13px;font-weight:500;color:var(--text)">⚠️ Low Stock Alerts</span>
            <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;" data-nav="stock">Manage Stock</button>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead><tr><th>Product</th><th>Units Remaining</th><th>Status</th></tr></thead>
              <tbody id="low-stock-tbody"></tbody>
            </table>
          </div>
        </div>` : ''}

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
              <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;" data-nav="stock">View all</button>
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

  if (isAdmin) {
    await Promise.allSettled([
      loadAnalytics(),
      loadExpiry(),
    ]);
  } else {
    loadUserStats();
    loadRecentSalesBasic();
  }
}

// ── Admin: single analytics call ──────────────────────────────────────────────
async function loadAnalytics() {
  try {
    const d = await api.get('/dashboard/analytics');

    // ── Stat cards ────────────────────────────────────────────────────────────
    document.getElementById('stats-row').innerHTML = `
      ${statCard('Sales Today',     `₦${fmt(d.sales_today)}`,        '💰', 'var(--accent)')}
      ${statCard('Transactions',    d.sales_today_count,              '🧾', 'var(--info)')}
      ${statCard('Low Stock Items', d.low_stock_count,                '⚠️', 'var(--warn)')}
      ${statCard('Out of Stock',    d.out_of_stock_count,             '🚨', 'var(--danger)')}`;

    // ── Profit card ───────────────────────────────────────────────────────────
    const profitColor = d.profit_estimate >= 0 ? 'var(--accent-lt)' : '#f87171';
    document.getElementById('profit-card').innerHTML =
      `<span style="color:${profitColor};">₦${fmt(d.profit_estimate)}</span>`;
    document.getElementById('profit-breakdown').innerHTML = `
      <span>Revenue: <strong style="color:var(--text)">₦${fmt(d.total_revenue)}</strong></span>
      <span>Expenses: <strong style="color:#f87171">₦${fmt(d.total_expenses)}</strong></span>
      <span>Purchases: <strong style="color:#f87171">₦${fmt(d.total_purchases)}</strong></span>`;

    // ── Purchases card ────────────────────────────────────────────────────────
    document.getElementById('purchases-card').innerHTML = `₦${fmt(d.total_purchases)}`;

    // ── Low stock alerts table ────────────────────────────────────────────────
    if (d.low_stock_alerts.length) {
      document.getElementById('low-stock-section').style.display = 'block';
      document.getElementById('low-stock-tbody').innerHTML = d.low_stock_alerts.map(s => `
        <tr>
          <td style="font-weight:500">${s.product_name}</td>
          <td><strong style="color:var(--warn)">${s.total_quantity}</strong></td>
          <td><span class="badge badge-yellow">Low Stock</span></td>
        </tr>`).join('');
    }

    // ── Recent sales table ────────────────────────────────────────────────────
    const tbody = document.getElementById('recent-sales');
    if (!d.recent_sales.length) {
      tbody.innerHTML = tableEmptyRow(4, 'No sales recorded yet.');
    } else {
      tbody.innerHTML = d.recent_sales.map(s => `
        <tr>
          <td style="font-weight:500">${s.product_name}</td>
          <td>${s.quantity_sold}</td>
          <td style="color:var(--accent-lt)">₦${fmt(s.total_amount)}</td>
          <td style="color:var(--muted);font-size:12px">${fmtDateTime(s.created_at)}</td>
        </tr>`).join('');
    }

  } catch (err) {
    document.getElementById('stats-row').innerHTML =
      `<p style="color:var(--muted);font-size:13px;grid-column:1/-1;">Could not load analytics: ${err.message}</p>`;
  }
}

// ── Expiry alerts (unchanged) ─────────────────────────────────────────────────
async function loadExpiry() {
  try {
    const alerts = await api.get('/stock/stocks/expiry-alerts');
    const tbody  = document.getElementById('expiry-alerts');
    if (!tbody) return;
    if (!alerts.length) { tbody.innerHTML = tableEmptyRow(3, 'No expiry alerts.'); return; }

    tbody.innerHTML = alerts.slice(0, 6).map(a => {
      const urgency = a.days_to_expire <= 30 ? 'badge-red'
                    : a.days_to_expire <= 90  ? 'badge-yellow'
                    : 'badge-blue';
      return `<tr>
        <td style="font-weight:500">${a.product_name}</td>
        <td><span class="badge ${urgency}">${a.days_to_expire}d</span></td>
        <td style="font-size:11px;color:var(--muted);max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${a.recommended_action}
        </td>
      </tr>`;
    }).join('');
  } catch {
    const tbody = document.getElementById('expiry-alerts');
    if (tbody) tbody.innerHTML = tableEmptyRow(3, 'Could not load alerts.');
  }
}

// ── User view (non-admin) ─────────────────────────────────────────────────────
function loadUserStats() {
  document.getElementById('stats-row').innerHTML = `
    ${statCard('Your Role',    'USER',     '👤', 'var(--info)')}
    ${statCard('Access Level', 'Standard', '🔑', 'var(--accent)')}`;
}

async function loadRecentSalesBasic() {
  const tbody = document.getElementById('recent-sales');
  if (!tbody) return;
  tbody.innerHTML = tableEmptyRow(4, 'Go to Sales to view transactions.');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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