// ── Reports Page (Admin only) ─────────────────────────────────────────────────
// GET /reports/summary?period=daily|weekly|monthly|yearly
// GET /stock/stocks/expiry-alerts
// GET /stock/{stock_id}/consumption

import { api }                                     from '../js/api.js';
import { renderSidebar, renderTopbar, bindSidebar,
         fmtDate, fmt, tableLoadingRow, tableEmptyRow,
         icons }                                   from '../js/ui.js';

export function renderReports() {
  return `
  <div class="page-enter app-layout">
    ${renderSidebar('reports')}
    <div class="main-content">
      ${renderTopbar('Reports', 'Sales summaries, expiry alerts & consumption analysis')}
      <div class="page-body">

        <!-- Tab bar -->
        <div style="display:flex;gap:6px;margin-bottom:24px;border-bottom:1px solid var(--border);padding-bottom:0;flex-wrap:wrap;">
          <button class="report-tab active" data-tab="summary"
            style="background:none;border:none;padding:10px 18px;font-size:13px;
                   color:var(--accent-lt);border-bottom:2px solid var(--accent);
                   cursor:pointer;font-family:var(--font-body);">
            Sales Summary
          </button>
          <button class="report-tab" data-tab="expiry"
            style="background:none;border:none;padding:10px 18px;font-size:13px;
                   color:var(--muted);border-bottom:2px solid transparent;
                   cursor:pointer;font-family:var(--font-body);">
            Expiry Alerts
          </button>
          <button class="report-tab" data-tab="consumption"
            style="background:none;border:none;padding:10px 18px;font-size:13px;
                   color:var(--muted);border-bottom:2px solid transparent;
                   cursor:pointer;font-family:var(--font-body);">
            Consumption Report
          </button>
        </div>

        <!-- ── Sales Summary Tab ── -->
        <div id="tab-summary">

          <!-- Period selector -->
          <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
            ${['daily','weekly','monthly','yearly'].map((p, i) => `
              <button class="period-btn ${i === 0 ? 'btn btn-primary' : 'btn btn-ghost'}"
                data-period="${p}"
                style="text-transform:capitalize;font-size:13px;">
                ${p.charAt(0).toUpperCase() + p.slice(1)}
              </button>`).join('')}
          </div>

          <div id="summary-content">
            <div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;padding:40px 0;">
              <span class="spinner" style="border-top-color:var(--accent)"></span> Loading summary…
            </div>
          </div>
        </div>

        <!-- ── Expiry Alerts Tab ── -->
        <div id="tab-expiry" style="display:none;">
          <div class="card" style="overflow:hidden;">
            <div style="padding:14px 18px;border-bottom:1px solid var(--border);
                        display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:13px;font-weight:500;color:var(--text)">
                Stock Expiry Alerts
                <span style="font-size:11px;color:var(--muted)">(next 180 days)</span>
              </span>
              <button id="refresh-expiry" class="btn btn-ghost" style="font-size:11px;padding:5px 10px;">
                ${icons.refresh} Refresh
              </button>
            </div>
            <div style="overflow-x:auto;">
              <table class="data-table">
                <thead><tr>
                  <th>Stock ID</th><th>Product</th><th>Qty</th><th>Expiry Date</th>
                  <th>Days Left</th><th>Stock Value</th><th>Action Required</th>
                </tr></thead>
                <tbody id="expiry-tbody">${tableLoadingRow(7)}</tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ── Consumption Tab ── -->
        <div id="tab-consumption" style="display:none;">
          <div class="card" style="padding:20px;margin-bottom:20px;">
            <div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:14px;">
              Look Up Stock Consumption
            </div>
            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
              <div style="flex:1;min-width:160px;">
                <label class="field-label">Stock ID</label>
                <input class="field-input" id="cons-stock-id" type="number"
                  placeholder="Enter stock ID" min="1"/>
              </div>
              <button id="cons-btn" class="btn btn-primary">Analyse</button>
            </div>
            <div id="cons-result" style="margin-top:20px;display:none;"></div>
          </div>
        </div>

      </div>
    </div>
  </div>`;
}

export async function initReports() {
  bindSidebar();
  bindTabs();
  bindPeriodBtns();

  // Load default daily summary
  await loadSummary('daily');

  document.getElementById('refresh-expiry')?.addEventListener('click', loadExpiry);

  document.getElementById('cons-btn')?.addEventListener('click', async () => {
    const id = parseInt(document.getElementById('cons-stock-id').value);
    if (!id || id < 1) return;
    await loadConsumption(id);
  });
  document.getElementById('cons-stock-id')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('cons-btn')?.click();
  });
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function bindTabs() {
  document.querySelectorAll('.report-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.report-tab').forEach(t => {
        t.style.color = 'var(--muted)';
        t.style.borderBottomColor = 'transparent';
        t.classList.remove('active');
      });
      tab.style.color = 'var(--accent-lt)';
      tab.style.borderBottomColor = 'var(--accent)';
      tab.classList.add('active');

      const which = tab.getAttribute('data-tab');
      document.getElementById('tab-summary').style.display     = which === 'summary'     ? 'block' : 'none';
      document.getElementById('tab-expiry').style.display      = which === 'expiry'      ? 'block' : 'none';
      document.getElementById('tab-consumption').style.display = which === 'consumption' ? 'block' : 'none';

      // Lazy load expiry when tab first opened
      if (which === 'expiry') loadExpiry();
    });
  });
}

// ── Period button switching ───────────────────────────────────────────────────
function bindPeriodBtns() {
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.period-btn').forEach(b => {
        b.className = 'period-btn btn btn-ghost';
      });
      btn.className = 'period-btn btn btn-primary';
      await loadSummary(btn.dataset.period);
    });
  });
}

// ── Load summary ──────────────────────────────────────────────────────────────
async function loadSummary(period) {
  const container = document.getElementById('summary-content');
  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;padding:40px 0;">
      <span class="spinner" style="border-top-color:var(--accent)"></span> Loading ${period} summary…
    </div>`;

  try {
    const d = await api.get(`/reports/summary?period=${period}`);
    const profitColor = d.profit >= 0 ? 'var(--accent-lt)' : '#f87171';
    const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);

    container.innerHTML = `

      <!-- Date range label -->
      <div style="font-size:12px;color:var(--muted);margin-bottom:16px;">
        ${periodLabel} report · ${fmtDate(d.date_from)}${d.date_from !== d.date_to ? ' → ' + fmtDate(d.date_to) : ''}
      </div>

      <!-- KPI cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:24px;">
        ${kpiCard('Total Sales',    `₦${fmt(d.total_sales_amount)}`, '💰', 'var(--accent-lt)')}
        ${kpiCard('Transactions',   d.total_sales_count,             '🧾', 'var(--info)')}
        ${kpiCard('Units Sold',     d.total_units_sold,              '📦', 'var(--text)')}
        ${kpiCard('Expenses',       `₦${fmt(d.total_expenses)}`,     '💸', '#f87171')}
        ${d.total_purchases > 0
          ? kpiCard('Purchases',    `₦${fmt(d.total_purchases)}`,    '🛒', 'var(--warn)')
          : ''}
        ${kpiCard('Profit',         `₦${fmt(d.profit)}`,            '📈', profitColor)}
      </div>

      <div style="display:grid;grid-template-columns:${d.expense_breakdown.length ? '1fr 1fr' : '1fr'};gap:20px;margin-bottom:24px;flex-wrap:wrap;">

        <!-- Top selling products -->
        <div class="card" style="overflow:hidden;">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);">
            <span style="font-size:13px;font-weight:500;color:var(--text);">🏆 Top Selling Products</span>
          </div>
          ${d.top_products.length
            ? `<div style="overflow-x:auto;">
                <table class="data-table">
                  <thead><tr>
                    <th>#</th><th>Product</th><th>Units Sold</th><th>Revenue</th>
                  </tr></thead>
                  <tbody>
                    ${d.top_products.map((p, i) => `
                      <tr>
                        <td style="color:var(--muted);font-weight:600;">${i + 1}</td>
                        <td style="font-weight:500;">${p.product_name}</td>
                        <td>${p.units_sold.toLocaleString()}</td>
                        <td style="color:var(--accent-lt);">₦${fmt(p.revenue)}</td>
                      </tr>`).join('')}
                  </tbody>
                </table>
              </div>`
            : `<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px;">No sales recorded.</div>`}
        </div>

        <!-- Expense breakdown -->
        ${d.expense_breakdown.length ? `
        <div class="card" style="overflow:hidden;">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);">
            <span style="font-size:13px;font-weight:500;color:var(--text);">
              💸 ${period === 'daily' ? 'Operating ' : ''}Expense Breakdown
              ${period === 'daily' ? '<span style="font-size:11px;color:var(--muted)">(excl. goods purchase)</span>' : ''}
            </span>
          </div>
          <div style="padding:14px 18px;">
            ${d.expense_breakdown.map(e => {
              const pct = d.total_expenses > 0
                ? Math.round((e.total / d.total_expenses) * 100) : 0;
              return `
                <div style="margin-bottom:14px;">
                  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;">
                    <span style="color:var(--text);">${e.category.replace(/_/g,' ')}</span>
                    <span style="color:var(--muted);">₦${fmt(e.total)} · ${pct}%</span>
                  </div>
                  <div style="height:5px;background:var(--surface2);border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#f87171,#fb923c);border-radius:99px;"></div>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>` : ''}
      </div>

      <!-- Purchases table (weekly / monthly / yearly) -->
      ${d.purchases && d.purchases.length ? `
      <div class="card" style="overflow:hidden;">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);">
          <span style="font-size:13px;font-weight:500;color:var(--text);">
            🛒 Purchases / Restock (${d.purchase_count})
          </span>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead><tr>
              <th>Receipt No.</th><th>Supplier</th><th>Total Cost</th><th>Date</th>
            </tr></thead>
            <tbody>
              ${d.purchases.map(p => `
                <tr>
                  <td style="color:var(--accent-lt);font-weight:500;">${p.receipt_number}</td>
                  <td>${p.supplier_name}</td>
                  <td style="color:var(--warn);">₦${fmt(p.total_cost)}</td>
                  <td style="color:var(--muted);">${fmtDate(p.purchase_date)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}`;

  } catch (err) {
    container.innerHTML = `<div style="color:#f87171;font-size:13px;padding:20px 0;">${err.message}</div>`;
  }
}

// ── Expiry alerts ─────────────────────────────────────────────────────────────
async function loadExpiry() {
  const tbody = document.getElementById('expiry-tbody');
  if (!tbody) return;
  tbody.innerHTML = tableLoadingRow(7);
  try {
    const data = await api.get('/stock/stocks/expiry-alerts');
    if (!data.length) {
      tbody.innerHTML = tableEmptyRow(7, 'No expiry alerts in the next 180 days. 🎉');
      return;
    }
    tbody.innerHTML = data
      .sort((a, b) => a.days_to_expire - b.days_to_expire)
      .map(a => {
        const urgency = a.days_to_expire <= 30 ? 'badge-red'
                      : a.days_to_expire <= 90  ? 'badge-yellow'
                      : 'badge-blue';
        return `<tr>
          <td style="color:var(--muted)">#${a.stock_id}</td>
          <td style="font-weight:500">${a.product_name}</td>
          <td>${a.quantity_affected}</td>
          <td>${fmtDate(a.expire_date)}</td>
          <td><span class="badge ${urgency}">${a.days_to_expire <= 0 ? 'Expired' : a.days_to_expire + 'd'}</span></td>
          <td>₦${fmt(a.stock_value_cost)}</td>
          <td style="font-size:11px;color:var(--muted);max-width:200px;">${a.recommended_action}</td>
        </tr>`;
      }).join('');
  } catch (err) {
    tbody.innerHTML = tableEmptyRow(7, err.message);
  }
}

// ── Consumption ───────────────────────────────────────────────────────────────
async function loadConsumption(stockId) {
  const container = document.getElementById('cons-result');
  container.style.display = 'block';
  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;">
      <span class="spinner" style="border-top-color:var(--accent)"></span> Analysing…
    </div>`;

  try {
    const r   = await api.get(`/stock/${stockId}/consumption`);
    const pct = r.initial_stock_quantity > 0
      ? Math.round((r.total_quantity_sold / r.initial_stock_quantity) * 100) : 0;

    container.innerHTML = `
      <div class="card" style="padding:20px;">
        <div style="font-family:var(--font-head);font-size:16px;color:var(--text);margin-bottom:16px;">
          ${r.product_name}
          <span style="font-size:13px;color:var(--muted);font-family:var(--font-body);">— Stock #${r.stock_id}</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;">
          ${[
            ['Current Qty',    r.current_quantity.toLocaleString(),    'var(--accent)'],
            ['Initial Qty',    r.initial_stock_quantity.toLocaleString(), 'var(--info)'],
            ['Total Sold',     r.total_quantity_sold.toLocaleString(),  'var(--warn)'],
            ['Days Remaining', r.estimated_days_remaining + ' days',
              r.estimated_days_remaining < 30 ? 'var(--danger)' : 'var(--accent)'],
          ].map(([label, val, color]) => `
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;">
              <div style="font-family:var(--font-head);font-size:20px;color:${color}">${val}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">${label}</div>
            </div>`).join('')}
        </div>

        <div style="margin-bottom:4px;display:flex;justify-content:space-between;font-size:11px;color:var(--muted);">
          <span>Stock consumed</span><span>${pct}%</span>
        </div>
        <div style="height:6px;background:var(--surface2);border-radius:99px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--accent-lt));
                      border-radius:99px;transition:width .6s;"></div>
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--muted);">
          Avg daily consumption:
          <strong style="color:var(--text)">${r.average_daily_consumption}</strong> units/day
        </div>
      </div>`;
  } catch (err) {
    container.innerHTML = `<div style="color:#f87171;font-size:13px;">${err.message}</div>`;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function kpiCard(label, value, emoji, color) {
  return `
    <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:10px;padding:16px;">
      <div style="font-size:18px;margin-bottom:6px;">${emoji}</div>
      <div style="font-family:var(--font-head);font-size:22px;color:${color};margin-bottom:4px;">${value}</div>
      <div style="font-size:11px;color:var(--muted);font-weight:500;">${label}</div>
    </div>`;
}