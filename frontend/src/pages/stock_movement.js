import { api } from '../js/api.js';
import { renderSidebar, renderTopbar, bindSidebar, fmt, fmtDateTime, icons } from '../js/ui.js';

export function renderStockMovement() {
  return `
  <div class="page-enter app-layout">
    ${renderSidebar('stock_movement')}
    <div class="main-content">
      ${renderTopbar('Stock Movement', 'Full audit log of all stock changes')}
      <div class="page-body">

        <!-- Filters -->
        <div class="card" style="padding:16px 20px;margin-bottom:20px;">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
            <div>
              <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">Product Name</label>
              <input class="field-input" id="filter-product" placeholder="Search product…" style="width:180px;"/>
            </div>
            <div>
              <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">Movement Type</label>
              <select class="field-input" id="filter-type" style="width:160px;">
                <option value="">All Types</option>
                <option value="stock_in">Stock In</option>
                <option value="sale">Sale</option>
                <option value="void_restore">Void Restore</option>
              </select>
            </div>
            <button id="filter-btn" class="btn btn-primary" style="height:38px;">
              ${icons.search} Filter
            </button>
            <button id="reset-btn" class="btn btn-ghost" style="height:38px;">Reset</button>
          </div>
        </div>

        <!-- Summary badges -->
        <div id="summary-row" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;"></div>

        <!-- Table -->
        <div class="card" style="padding:0;overflow:hidden;">
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Before</th>
                  <th>Changed</th>
                  <th>After</th>
                  <th>Performed By</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody id="movement-tbody">
                <tr><td colspan="8" style="text-align:center;color:var(--muted);">Loading…</td></tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div id="pagination-row" style="display:flex;align-items:center;justify-content:space-between;
               padding:14px 20px;border-top:1px solid var(--border);flex-wrap:wrap;gap:8px;">
            <span id="pagination-info" style="font-size:12px;color:var(--muted);"></span>
            <div style="display:flex;gap:8px;">
              <button id="prev-btn" class="btn btn-ghost" style="font-size:12px;padding:5px 12px;" disabled>← Prev</button>
              <button id="next-btn" class="btn btn-ghost" style="font-size:12px;padding:5px 12px;" disabled>Next →</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>`;
}

const PAGE_SIZE = 50;
let currentOffset = 0;
let currentTotal  = 0;
let currentFilters = { product_name: '', movement_type: '' };

export async function initStockMovement() {
  bindSidebar();
  await loadMovements();

  document.getElementById('filter-btn').addEventListener('click', () => {
    currentOffset = 0;
    currentFilters.product_name  = document.getElementById('filter-product').value.trim();
    currentFilters.movement_type = document.getElementById('filter-type').value;
    loadMovements();
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    currentOffset = 0;
    currentFilters = { product_name: '', movement_type: '' };
    document.getElementById('filter-product').value = '';
    document.getElementById('filter-type').value    = '';
    loadMovements();
  });

  document.getElementById('filter-product').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('filter-btn').click();
  });

  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentOffset > 0) {
      currentOffset = Math.max(0, currentOffset - PAGE_SIZE);
      loadMovements();
    }
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    if (currentOffset + PAGE_SIZE < currentTotal) {
      currentOffset += PAGE_SIZE;
      loadMovements();
    }
  });
}

async function loadMovements() {
  const tbody = document.getElementById('movement-tbody');
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--muted);">
    <span class="spinner" style="border-top-color:var(--accent)"></span> Loading…</td></tr>`;

  try {
    let url = `/stock/movements?limit=${PAGE_SIZE}&offset=${currentOffset}`;
    if (currentFilters.movement_type) url += `&movement_type=${currentFilters.movement_type}`;

    const data = await api.get(url);
    currentTotal = data.total;

    let movements = data.movements;

    // Client-side product name filter
    if (currentFilters.product_name) {
      const q = currentFilters.product_name.toLowerCase();
      movements = movements.filter(m => m.product_name.toLowerCase().includes(q));
    }

    renderSummary(data.movements);
    renderTable(movements);
    renderPagination();

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#f87171;">${err.message}</td></tr>`;
  }
}

function renderSummary(movements) {
  const counts = { stock_in: 0, sale: 0, void_restore: 0 };
  movements.forEach(m => { if (counts[m.movement_type] !== undefined) counts[m.movement_type]++; });

  document.getElementById('summary-row').innerHTML = `
    <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:10px 16px;min-width:120px;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:2px;">Stock In</div>
      <div style="font-size:20px;font-weight:600;color:#16a34a;">${counts.stock_in}</div>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:10px 16px;min-width:120px;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:2px;">Sales</div>
      <div style="font-size:20px;font-weight:600;color:var(--accent-lt);">${counts.sale}</div>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:10px 16px;min-width:120px;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:2px;">Void Restores</div>
      <div style="font-size:20px;font-weight:600;color:#f59e0b;">${counts.void_restore}</div>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:10px 16px;min-width:120px;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:2px;">Total Records</div>
      <div style="font-size:20px;font-weight:600;color:var(--text);">${currentTotal}</div>
    </div>`;
}

function renderTable(movements) {
  const tbody = document.getElementById('movement-tbody');
  if (!movements.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:32px;">No movements found.</td></tr>`;
    return;
  }

  tbody.innerHTML = movements.map(m => {
    const typeBadge = {
      stock_in:     `<span class="badge badge-green">Stock In</span>`,
      sale:         `<span class="badge" style="background:rgba(99,102,241,.15);color:#818cf8;">Sale</span>`,
      void_restore: `<span class="badge" style="background:rgba(245,158,11,.15);color:#f59e0b;">Void Restore</span>`,
    }[m.movement_type] || `<span class="badge">${m.movement_type}</span>`;

    const isIn = m.movement_type === 'stock_in' || m.movement_type === 'void_restore';
    const changeColor = isIn ? '#16a34a' : '#f87171';
    const changeSign  = isIn ? '+' : '-';

    return `
      <tr>
        <td style="font-size:12px;white-space:nowrap;">${m.created_at?.slice(0, 16).replace('T', ' ') || '—'}</td>
        <td style="font-weight:500;">${m.product_name}</td>
        <td>${typeBadge}</td>
        <td style="text-align:center;">${m.quantity_before}</td>
        <td style="text-align:center;color:${changeColor};font-weight:600;">
          ${changeSign}${m.quantity_changed}
        </td>
        <td style="text-align:center;">${m.quantity_after}</td>
        <td style="font-size:12px;">${m.performed_by || '—'}</td>
        <td style="font-size:12px;color:var(--muted);">${m.note || '—'}</td>
      </tr>`;
  }).join('');
}

function renderPagination() {
  const start = currentTotal === 0 ? 0 : currentOffset + 1;
  const end   = Math.min(currentOffset + PAGE_SIZE, currentTotal);
  document.getElementById('pagination-info').textContent = `Showing ${start}–${end} of ${currentTotal}`;
  document.getElementById('prev-btn').disabled = currentOffset === 0;
  document.getElementById('next-btn').disabled = currentOffset + PAGE_SIZE >= currentTotal;
}