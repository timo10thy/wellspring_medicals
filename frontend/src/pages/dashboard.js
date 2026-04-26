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
        <div id="stats-row" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
          ${[1,2,3,4,5].map(() => `
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

        <!-- Product Search -->
        <div class="card" style="overflow:hidden;margin-bottom:20px;">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);">
            <span style="font-size:13px;font-weight:500;color:var(--text)">🔍 Product Stock Lookup</span>
          </div>
          <div style="padding:16px 18px;">
            <div style="display:flex;gap:10px;margin-bottom:16px;">
              <input class="field-input" id="product-search-input" type="text"
                placeholder="Search product name…" style="flex:1;"/>
              <button id="product-search-btn" class="btn btn-primary" style="white-space:nowrap;">Search</button>
            </div>
            <div id="product-search-results"></div>
          </div>
        </div>

        <!-- Stock Valuation Report -->
        <div class="card" style="overflow:hidden;margin-bottom:20px;">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:13px;font-weight:500;color:var(--text)">📊 Stock Valuation Report</span>
            <button id="valuation-toggle-btn" class="btn btn-ghost" style="font-size:11px;padding:5px 10px;">Load Report</button>
          </div>
          <div id="valuation-summary" style="display:none;padding:16px 18px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">
            <div class="stat-card" style="padding:14px;">
              <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">TOTAL UNITS</div>
              <div id="val-units" style="font-size:22px;font-weight:700;color:var(--text);font-family:var(--font-head);">—</div>
            </div>
            <div class="stat-card" style="padding:14px;">
              <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">COST VALUE</div>
              <div id="val-cost" style="font-size:22px;font-weight:700;color:#f87171;font-family:var(--font-head);">—</div>
            </div>
            <div class="stat-card" style="padding:14px;">
              <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">SELLING VALUE</div>
              <div id="val-selling" style="font-size:22px;font-weight:700;color:var(--accent-lt);font-family:var(--font-head);">—</div>
            </div>
            <div class="stat-card" style="padding:14px;">
              <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">POTENTIAL PROFIT</div>
              <div id="val-profit" style="font-size:22px;font-weight:700;font-family:var(--font-head);">—</div>
            </div>
          </div>
          <div id="valuation-table-wrap" style="display:none;overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units</th>
                  <th>Sell Price</th>
                  <th>Cost Value</th>
                  <th>Selling Value</th>
                  <th>Potential Profit</th>
                </tr>
              </thead>
              <tbody id="valuation-tbody"></tbody>
            </table>
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

        <div style="display:grid;grid-template-columns:1fr;gap:16px;">

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
    initProductSearch();
    initStockValuation();
  } else {
    loadUserStats();
    loadRecentSalesBasic();
  }
}

// ── Admin: single analytics call ──────────────────────────────────────────────
async function loadAnalytics() {
  try {
    const d = await api.get('/dashboard/analytics');

    document.getElementById('stats-row').innerHTML = `
      ${statCard('Sales Today',     `₦${fmt(d.sales_today)}`,        '💰', 'var(--accent)')}
      ${statCard('Transactions',    d.sales_today_count,              '🧾', 'var(--info)')}
      ${statCard('Total Stock',     d.total_stock,                    '📦', 'var(--accent-lt)')}
      ${statCard('Low Stock Items', d.low_stock_count,                '⚠️', 'var(--warn)')}
      ${statCard('Out of Stock',    d.out_of_stock_count,             '🚨', 'var(--danger)')}`;

    const profitColor = d.profit_estimate >= 0 ? 'var(--accent-lt)' : '#f87171';
    document.getElementById('profit-card').innerHTML =
      `<span style="color:${profitColor};">₦${fmt(d.profit_estimate)}</span>`;
    document.getElementById('profit-breakdown').innerHTML = `
      <span>Revenue: <strong style="color:var(--text)">₦${fmt(d.total_revenue)}</strong></span>
      <span>Expenses: <strong style="color:#f87171">₦${fmt(d.total_expenses)}</strong></span>
      <span>Purchases: <strong style="color:#f87171">₦${fmt(d.total_purchases)}</strong></span>`;

    document.getElementById('purchases-card').innerHTML = `₦${fmt(d.total_purchases)}`;

    if (d.low_stock_alerts.length) {
      document.getElementById('low-stock-section').style.display = 'block';
      document.getElementById('low-stock-tbody').innerHTML = d.low_stock_alerts.map(s => `
        <tr>
          <td style="font-weight:500">${s.product_name}</td>
          <td><strong style="color:var(--warn)">${s.total_quantity}</strong></td>
          <td><span class="badge badge-yellow">Low Stock</span></td>
        </tr>`).join('');
    }

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

// ── Expiry alerts ─────────────────────────────────────────────────────────────
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

// ── Product Search ────────────────────────────────────────────────────────────
function initProductSearch() {
  const input  = document.getElementById('product-search-input');
  const btn    = document.getElementById('product-search-btn');
  const result = document.getElementById('product-search-results');
  if (!input || !btn || !result) return;

  async function doSearch() {
    const name = input.value.trim();
    if (!name) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    result.innerHTML = `<p style="font-size:13px;color:var(--muted);">Searching…</p>`;

    try {
      const data = await api.get(`/dashboard/product-search?name=${encodeURIComponent(name)}`);

      if (!data.length) {
        result.innerHTML = `<p style="font-size:13px;color:var(--muted);">No products found for "<strong>${name}</strong>".</p>`;
        return;
      }

      result.innerHTML = `
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Initial Qty</th>
                <th>Qty Sold</th>
                <th>Available</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(p => {
                const badge = p.stock_level === 'In Stock'  ? 'badge-green'
                            : p.stock_level === 'Low Stock' ? 'badge-yellow'
                            : 'badge-red';
                return `<tr>
                  <td style="font-weight:500">${p.product_name}</td>
                  <td>${p.initial_quantity}</td>
                  <td style="color:#f87171">${p.quantity_sold}</td>
                  <td style="color:var(--accent-lt);font-weight:600">${p.available}</td>
                  <td><span class="badge ${badge}">${p.stock_level}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      result.innerHTML = `<p style="font-size:13px;color:#f87171;">Error: ${err.message}</p>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Search';
    }
  }

  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
}

// ── Stock Valuation ───────────────────────────────────────────────────────────
function initStockValuation() {
  const btn       = document.getElementById('valuation-toggle-btn');
  const summary   = document.getElementById('valuation-summary');
  const tableWrap = document.getElementById('valuation-table-wrap');
  if (!btn) return;

  let loaded = false;

  btn.addEventListener('click', async () => {
    if (loaded) {
      const visible = summary.style.display === 'grid';
      summary.style.display   = visible ? 'none' : 'grid';
      tableWrap.style.display = visible ? 'none' : 'block';
      btn.textContent = visible ? 'Show Report' : 'Hide Report';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Loading…';

    try {
      const data = await api.get('/dashboard/stock-valuation');
      const s    = data.summary;

      document.getElementById('val-units').textContent   = s.total_units.toLocaleString();
      document.getElementById('val-cost').textContent    = `₦${fmt(s.total_cost_value)}`;
      document.getElementById('val-selling').textContent = `₦${fmt(s.total_selling_value)}`;

      const profitEl = document.getElementById('val-profit');
      profitEl.textContent = `₦${fmt(s.potential_profit)}`;
      profitEl.style.color = s.potential_profit >= 0 ? 'var(--accent-lt)' : '#f87171';

      const tbody = document.getElementById('valuation-tbody');
      if (!data.products.length) {
        tbody.innerHTML = tableEmptyRow(6, 'No stock data available.');
      } else {
        tbody.innerHTML = data.products.map(p => {
          const profitColor = p.potential_profit >= 0 ? 'var(--accent-lt)' : '#f87171';
          return `<tr>
            <td style="font-weight:500">${p.product_name}</td>
            <td>${p.total_quantity.toLocaleString()}</td>
            <td>₦${fmt(p.selling_price)}</td>
            <td style="color:#f87171">₦${fmt(p.total_cost_value)}</td>
            <td style="color:var(--accent-lt)">₦${fmt(p.total_selling_value)}</td>
            <td style="color:${profitColor};font-weight:600">₦${fmt(p.potential_profit)}</td>
          </tr>`;
        }).join('');
      }

      summary.style.display   = 'grid';
      tableWrap.style.display = 'block';
      btn.textContent = 'Hide Report';
      loaded = true;

    } catch (err) {
      btn.textContent = 'Load Report';
      alert(`Could not load valuation: ${err.message}`);
    } finally {
      btn.disabled = false;
    }
  });
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