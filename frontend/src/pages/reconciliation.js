// ── Stock Reconciliation Page ─────────────────────────────────────────────────
// POST /reconciliation/create
// GET  /reconciliation/today
// GET  /reconciliation/all
// GET  /reconciliation/losses

import { api }                                     from '../js/api.js';
import { renderSidebar, renderTopbar, bindSidebar,
         openModal, closeModal, bindModalClose,
         fmt, fmtDate, tableLoadingRow, tableEmptyRow,
         icons }                                   from '../js/ui.js';

export function renderReconciliation() {
  return `
  <style>
    .recon-tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .recon-tab {
      background: none;
      border: none;
      padding: 10px 16px;
      font-size: 13px;
      color: var(--muted);
      border-bottom: 2px solid transparent;
      cursor: pointer;
      font-family: var(--font-body);
      white-space: nowrap;
    }
    .recon-tab.active {
      color: var(--accent-lt);
      border-bottom-color: var(--accent);
    }
    .variance-positive { color: var(--accent-lt); font-weight: 600; }
    .variance-zero     { color: var(--muted); }
    .variance-negative { color: #f87171; font-weight: 600; }

    @media (max-width: 768px) {
      .recon-tab { padding: 8px 12px; font-size: 12px; }
    }
  </style>

  <div class="page-enter app-layout">
    ${renderSidebar('reconciliation')}
    <div class="main-content">
      ${renderTopbar('Stock Reconciliation', 'Daily opening vs closing stock check')}
      <div class="page-body">

        <!-- Tabs -->
        <div class="recon-tabs">
          <button class="recon-tab active" data-tab="today">Today's Check</button>
          <button class="recon-tab" data-tab="history">History</button>
          <button class="recon-tab" data-tab="losses">Loss Report</button>
        </div>

        <!-- ── Today's Check ── -->
        <div id="tab-today">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
            <p style="font-size:13px;color:var(--muted);">
              Select a product, enter the physical count, and record the reconciliation.
            </p>
            <button id="refresh-today-btn" class="btn btn-ghost" style="font-size:12px;">
              ${icons.refresh} Refresh
            </button>
          </div>

          <div id="today-content">
            <div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;padding:40px 0;">
              <span class="spinner" style="border-top-color:var(--accent)"></span> Loading…
            </div>
          </div>
        </div>

        <!-- ── History ── -->
        <div id="tab-history" style="display:none;">
          <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:flex-end;">
            <div>
              <label class="field-label">From</label>
              <input class="field-input" id="hist-date-from" type="date" style="width:150px;"/>
            </div>
            <div>
              <label class="field-label">To</label>
              <input class="field-input" id="hist-date-to" type="date" style="width:150px;"/>
            </div>
            <button id="hist-filter-btn" class="btn btn-ghost">${icons.search} Filter</button>
          </div>
          <div class="card" style="overflow:hidden;">
            <div style="overflow-x:auto;">
              <table class="data-table">
                <thead><tr>
                  <th>Date</th><th>Product</th><th>Opening</th><th>Sold</th>
                  <th>Expected</th><th>Physical</th><th>Variance</th><th>Recorded By</th>
                </tr></thead>
                <tbody id="history-tbody">${tableLoadingRow(8)}</tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ── Loss Report ── -->
        <div id="tab-losses" style="display:none;">
          <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:flex-end;">
            <div>
              <label class="field-label">From</label>
              <input class="field-input" id="loss-date-from" type="date" style="width:150px;"/>
            </div>
            <div>
              <label class="field-label">To</label>
              <input class="field-input" id="loss-date-to" type="date" style="width:150px;"/>
            </div>
            <button id="loss-filter-btn" class="btn btn-ghost">${icons.search} Filter</button>
          </div>
          <div id="loss-summary-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:20px;"></div>
          <div class="card" style="overflow:hidden;">
            <div style="overflow-x:auto;">
              <table class="data-table">
                <thead><tr>
                  <th>Date</th><th>Product</th><th>Units Missing</th><th>Recorded By</th><th>Notes</th>
                </tr></thead>
                <tbody id="loss-tbody">${tableLoadingRow(5)}</tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Record Reconciliation Modal -->
  <div id="recon-modal" class="modal-backdrop">
    <div class="modal" style="max-width:480px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 style="font-family:var(--font-head);font-size:20px;color:var(--text)">Record Count</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>

      <div id="recon-error"   class="banner banner-error"><span></span></div>
      <div id="recon-success" class="banner banner-success"><span>Reconciliation recorded!</span></div>

      <div id="recon-product-info" style="background:var(--surface2);border:1px solid var(--border2);
           border-radius:8px;padding:14px;margin-bottom:16px;font-size:13px;"></div>

      <form id="recon-form" novalidate style="display:flex;flex-direction:column;gap:14px;">
        <input type="hidden" id="recon-product-id"/>
        <input type="hidden" id="recon-opening-qty"/>

        <div>
          <label class="field-label">Date</label>
          <input class="field-input" id="recon-date" type="date"/>
          <p class="field-hint hint-error" id="recon-date-hint"></p>
        </div>

        <div>
          <label class="field-label">Physical Count <span style="color:var(--muted);font-weight:400">(what you actually counted)</span></label>
          <input class="field-input" id="recon-physical" type="number" placeholder="0" min="0"/>
          <p class="field-hint hint-error" id="recon-physical-hint"></p>
        </div>

        <!-- Live variance preview -->
        <div id="recon-variance-preview" style="display:none;border-radius:8px;padding:12px 14px;font-size:13px;"></div>

        <div>
          <label class="field-label">Notes <span style="color:var(--muted);font-weight:400">(optional)</span></label>
          <input class="field-input" id="recon-notes" type="text" placeholder="Any observations…"/>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
          <button type="button" data-close-modal class="btn btn-ghost">Cancel</button>
          <button type="submit" id="recon-submit" class="btn btn-primary">Save Count</button>
        </div>
      </form>
    </div>
  </div>`;
}

export async function initReconciliation() {
  bindSidebar();
  bindModalClose('recon-modal');
  bindTabs();
  bindHistoryFilter();
  bindLossFilter();
  bindReconForm();

  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('recon-date').value     = today;
  document.getElementById('hist-date-from').value = today;
  document.getElementById('hist-date-to').value   = today;
  document.getElementById('loss-date-from').value = today;
  document.getElementById('loss-date-to').value   = today;

  document.getElementById('refresh-today-btn')?.addEventListener('click', loadToday);

  await loadToday();
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
function bindTabs() {
  document.querySelectorAll('.recon-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.recon-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.dataset.tab;
      document.getElementById('tab-today').style.display   = which === 'today'   ? 'block' : 'none';
      document.getElementById('tab-history').style.display = which === 'history' ? 'block' : 'none';
      document.getElementById('tab-losses').style.display  = which === 'losses'  ? 'block' : 'none';
      if (which === 'history') loadHistory();
      if (which === 'losses')  loadLosses();
    });
  });
}

// ── Today's status ────────────────────────────────────────────────────────────
async function loadToday() {
  const container = document.getElementById('today-content');
  container.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;padding:40px 0;">
    <span class="spinner" style="border-top-color:var(--accent)"></span> Loading…</div>`;

  try {
    const data = await api.get('/reconciliation/today');

    if (!data.length) {
      container.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--muted);font-size:13px;">No active products found.</div>`;
      return;
    }

    const done    = data.filter(d => d.reconciled).length;
    const pending = data.length - done;

    container.innerHTML = `
      <!-- Summary bar -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:20px;">
        ${summaryCard('Total Products', data.length, '📦', 'var(--text)')}
        ${summaryCard('Reconciled',     done,         '✅', 'var(--accent-lt)')}
        ${summaryCard('Pending',        pending,      '⏳', pending > 0 ? 'var(--warn)' : 'var(--muted)')}
      </div>

      <!-- Product list -->
      <div class="card" style="overflow:hidden;">
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead><tr>
              <th>Product</th><th>Current Qty</th><th>Sold Today</th><th>Status</th><th>Variance</th><th></th>
            </tr></thead>
            <tbody>
              ${data.map(p => {
                const statusBadge = p.reconciled
                  ? `<span class="badge badge-green">Done</span>`
                  : `<span class="badge badge-yellow">Pending</span>`;
                const varianceCell = p.reconciled
                  ? varianceHtml(p.variance)
                  : `<span style="color:var(--muted)">—</span>`;
                const actionBtn = p.reconciled
                  ? `<span style="font-size:11px;color:var(--muted);">Recorded</span>`
                  : `<button class="btn btn-primary record-recon-btn"
                       style="font-size:11px;padding:5px 12px;"
                       data-id="${p.product_id}"
                       data-name="${p.product_name}"
                       data-qty="${p.current_qty}">
                       Record Count
                     </button>`;
                return `<tr>
                  <td style="font-weight:500;">${p.product_name}</td>
                  <td>${p.current_qty.toLocaleString()}</td>
                  <td style="color:var(--muted);">${p.units_sold_today}</td>
                  <td>${statusBadge}</td>
                  <td>${varianceCell}</td>
                  <td>${actionBtn}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    // Bind record buttons
    container.querySelectorAll('.record-recon-btn').forEach(btn => {
      btn.addEventListener('click', () => openReconModal(
        parseInt(btn.dataset.id),
        btn.dataset.name,
        parseInt(btn.dataset.qty)
      ));
    });

  } catch (err) {
    container.innerHTML = `<div style="color:#f87171;font-size:13px;">${err.message}</div>`;
  }
}

// ── Open reconciliation modal ─────────────────────────────────────────────────
function openReconModal(productId, productName, currentQty) {
  document.getElementById('recon-product-id').value  = productId;
  document.getElementById('recon-opening-qty').value = currentQty;
  document.getElementById('recon-physical').value    = '';
  document.getElementById('recon-notes').value       = '';
  document.getElementById('recon-error').classList.remove('show');
  document.getElementById('recon-success').classList.remove('show');
  document.getElementById('recon-variance-preview').style.display = 'none';
  document.getElementById('recon-date-hint').textContent     = '';
  document.getElementById('recon-physical-hint').textContent = '';

  document.getElementById('recon-product-info').innerHTML = `
    <div style="font-weight:600;color:var(--text);margin-bottom:6px;">${productName}</div>
    <div style="color:var(--muted);">System quantity (opening): <strong style="color:var(--text);">${currentQty} units</strong></div>`;

  openModal('recon-modal');
}

// ── Live variance preview in modal ────────────────────────────────────────────
function bindReconForm() {
  document.getElementById('recon-physical')?.addEventListener('input', () => {
    const opening  = parseInt(document.getElementById('recon-opening-qty').value) || 0;
    const physical = parseInt(document.getElementById('recon-physical').value);
    const preview  = document.getElementById('recon-variance-preview');

    if (isNaN(physical) || physical < 0) { preview.style.display = 'none'; return; }

    const variance = physical - opening;
    let bg, msg;

    if (variance === 0) {
      bg  = 'background:var(--surface2);border:1px solid var(--border2);';
      msg = `<span style="color:var(--accent-lt);">✅ Perfect match — no variance.</span>`;
    } else if (variance > 0) {
      bg  = 'background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.3);';
      msg = `<span style="color:var(--accent-lt);">+${variance} units surplus</span>
             <span style="color:var(--muted);margin-left:8px;font-size:11px;">(more than expected)</span>`;
    } else {
      bg  = 'background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3);';
      msg = `<span style="color:#f87171;">${variance} units missing</span>
             <span style="color:var(--muted);margin-left:8px;font-size:11px;">(possible theft or recording error)</span>`;
    }

    preview.style.cssText = `display:block;border-radius:8px;padding:12px 14px;font-size:13px;${bg}`;
    preview.innerHTML = `<div style="display:flex;align-items:center;gap:8px;">${msg}</div>`;
  });

  document.getElementById('recon-form')?.addEventListener('submit', submitRecon);
}

async function submitRecon(e) {
  e.preventDefault();
  const errEl  = document.getElementById('recon-error');
  const sucEl  = document.getElementById('recon-success');
  const btn    = document.getElementById('recon-submit');
  errEl.classList.remove('show');
  sucEl.classList.remove('show');

  const productId  = parseInt(document.getElementById('recon-product-id').value);
  const openingQty = parseInt(document.getElementById('recon-opening-qty').value);
  const reconDate  = document.getElementById('recon-date').value;
  const physical   = parseInt(document.getElementById('recon-physical').value);
  const notes      = document.getElementById('recon-notes').value.trim() || null;

  let ok = true;
  if (!reconDate) {
    document.getElementById('recon-date-hint').textContent = 'Select a date.'; ok = false;
  } else document.getElementById('recon-date-hint').textContent = '';

  if (isNaN(physical) || physical < 0) {
    document.getElementById('recon-physical-hint').textContent = 'Enter a valid count (0 or more).'; ok = false;
  } else document.getElementById('recon-physical-hint').textContent = '';

  if (!ok) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving…';

  try {
    await api.post('/reconciliation/create', {
      product_id:   productId,
      recon_date:   reconDate,
      opening_qty:  openingQty,
      physical_qty: physical,
      notes,
    });
    sucEl.classList.add('show');
    setTimeout(async () => {
      closeModal('recon-modal');
      await loadToday();
    }, 1000);
  } catch (err) {
    errEl.querySelector('span').textContent = err.message;
    errEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Save Count';
  }
}

// ── History ───────────────────────────────────────────────────────────────────
function bindHistoryFilter() {
  document.getElementById('hist-filter-btn')?.addEventListener('click', loadHistory);
}

async function loadHistory() {
  const tbody    = document.getElementById('history-tbody');
  const dateFrom = document.getElementById('hist-date-from').value;
  const dateTo   = document.getElementById('hist-date-to').value;
  tbody.innerHTML = tableLoadingRow(8);

  try {
    let url = '/reconciliation/all?';
    if (dateFrom) url += `date_from=${dateFrom}&`;
    if (dateTo)   url += `date_to=${dateTo}`;
    const data = await api.get(url);

    if (!data.length) {
      tbody.innerHTML = tableEmptyRow(8, 'No reconciliation records found.');
      return;
    }

    tbody.innerHTML = data.map(r => `
      <tr>
        <td style="white-space:nowrap;color:var(--muted);">${fmtDate(r.recon_date)}</td>
        <td style="font-weight:500;">${r.product_name}</td>
        <td>${r.opening_qty}</td>
        <td style="color:var(--muted);">${r.units_sold}</td>
        <td>${r.expected_qty}</td>
        <td>${r.physical_qty}</td>
        <td>${varianceHtml(r.variance)}</td>
        <td style="color:var(--muted);font-size:12px;">${r.recorded_by}</td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = tableEmptyRow(8, err.message);
  }
}

// ── Loss report ───────────────────────────────────────────────────────────────
function bindLossFilter() {
  document.getElementById('loss-filter-btn')?.addEventListener('click', loadLosses);
}

async function loadLosses() {
  const tbody    = document.getElementById('loss-tbody');
  const cards    = document.getElementById('loss-summary-cards');
  const dateFrom = document.getElementById('loss-date-from').value;
  const dateTo   = document.getElementById('loss-date-to').value;
  tbody.innerHTML = tableLoadingRow(5);
  cards.innerHTML = '';

  try {
    let url = '/reconciliation/losses?';
    if (dateFrom) url += `date_from=${dateFrom}&`;
    if (dateTo)   url += `date_to=${dateTo}`;
    const d = await api.get(url);

    // Summary cards
    cards.innerHTML = `
      ${summaryCard('Incidents',     d.total_incidents,  '⚠️',  '#f87171')}
      ${summaryCard('Units Missing', d.total_units_lost, '📉', '#f87171')}`;

    if (!d.records.length) {
      tbody.innerHTML = tableEmptyRow(5, '✅ No losses recorded in this period.');
      return;
    }

    tbody.innerHTML = d.records.map(r => `
      <tr>
        <td style="white-space:nowrap;color:var(--muted);">${fmtDate(r.recon_date)}</td>
        <td style="font-weight:500;">${r.product_name}</td>
        <td style="color:#f87171;font-weight:600;">${Math.abs(r.variance)} units</td>
        <td style="color:var(--muted);font-size:12px;">${r.recorded_by}</td>
        <td style="font-size:12px;color:var(--muted);">${r.notes || '—'}</td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = tableEmptyRow(5, err.message);
  }
}

// Helpers 
function varianceHtml(variance) {
  if (variance > 0) return `<span class="variance-positive">+${variance}</span>`;
  if (variance < 0) return `<span class="variance-negative">${variance}</span>`;
  return `<span class="variance-zero">0</span>`;
}

function summaryCard(label, value, emoji, color) {
  return `
    <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:10px;padding:16px;">
      <div style="font-size:18px;margin-bottom:6px;">${emoji}</div>
      <div style="font-family:var(--font-head);font-size:24px;color:${color};margin-bottom:4px;">${value}</div>
      <div style="font-size:11px;color:var(--muted);font-weight:500;">${label}</div>
    </div>`;
}