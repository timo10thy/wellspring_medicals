// ── Stock Page (Admin only) ───────────────────────────────────────────────────
// POST /stock/create
// POST /stock/add/stock
// GET  /stock/stock/total
// GET  /stock/total/search?product_name=

import { api }                                     from '../js/api.js';
import { renderSidebar, renderTopbar, bindSidebar,
         openModal, closeModal, bindModalClose,
         fmt, fmtDate, tableLoadingRow, tableEmptyRow,
         icons }                                   from '../js/ui.js';

export function renderStock() {
  return `
  <div class="page-enter app-layout">
    ${renderSidebar('stock')}
    <div class="main-content">
      ${renderTopbar('Stock Management', 'Track and manage inventory stock levels')}
      <div class="page-body">

        <!-- Toolbar -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
          <div style="position:relative;flex:1;max-width:320px;">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;">${icons.search}</span>
            <input id="stock-search" class="field-input" type="text" placeholder="Search by product name…" style="padding-left:36px;"/>
          </div>
          <div style="display:flex;gap:8px;">
            <button id="add-stock-btn" class="btn btn-primary">${icons.plus} Add Stock</button>
          </div>
        </div>

        <!-- Total stock table -->
        <div class="card" style="overflow:hidden;margin-bottom:24px;">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);">
            <span style="font-size:13px;font-weight:500;color:var(--text)">Total Stock by Product</span>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead><tr>
                <th>Product ID</th><th>Product Name</th><th>Total Quantity</th><th>Status</th>
              </tr></thead>
              <tbody id="stock-tbody">${tableLoadingRow(4)}</tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Add Stock Modal -->
  <div id="add-stock-modal" class="modal-backdrop">
    <div class="modal">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 style="font-family:var(--font-head);font-size:20px;color:var(--text)">Add Stock</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>
      <div id="as-error" class="banner banner-error"><span></span></div>
      <div id="as-success" class="banner banner-success"><span>Stock added successfully.</span></div>

      <form id="add-stock-form" novalidate style="display:flex;flex-direction:column;gap:14px;">
        // <div>
        //   <label class="field-label">Product ID</label>
        //   <input class="field-input" id="as-product-id" type="number" placeholder="Enter product ID" min="1"/>
        //   <p class="field-hint hint-error" id="as-pid-hint"></p>
        // </div>
        <div>
            <label class="field-label">Product Name</label>
            <input class="field-input" id="as-product-name" type="text" placeholder="e.g. Paracetamol 500mg"/>
            <p class="field-hint hint-error" id="as-pid-hint"></p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label class="field-label">Quantity</label>
            <input class="field-input" id="as-qty" type="number" placeholder="0" min="1"/>
            <p class="field-hint hint-error" id="as-qty-hint"></p>
          </div>
          <div>
            <label class="field-label">Cost Price (₦)</label>
            <input class="field-input" id="as-cost" type="number" placeholder="0.00" min="0" step="0.01"/>
            <p class="field-hint hint-error" id="as-cost-hint"></p>
          </div>
        </div>
        <div>
          <label class="field-label">Expiry Date <span style="color:var(--muted);font-weight:400">(optional)</span></label>
          <input class="field-input" id="as-expiry" type="date"/>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
          <button type="button" data-close-modal class="btn btn-ghost">Cancel</button>
          <button type="submit" id="as-submit" class="btn btn-primary">Add Stock</button>
        </div>
      </form>
    </div>
  </div>`;
}

export async function initStock() {
  bindSidebar();
  bindModalClose('add-stock-modal');

  document.getElementById('add-stock-btn')?.addEventListener('click', () => {
    document.getElementById('add-stock-form')?.reset();
    document.getElementById('as-error').classList.remove('show');
    document.getElementById('as-success').classList.remove('show');
    openModal('add-stock-modal');
  });

  await loadStock();
  bindSearch();
  bindAddStock();
}

let allStock = [];

async function loadStock(query = '') {
  try {
    const url  = query ? `/stock/total/search?product_name=${encodeURIComponent(query)}` : '/stock/stock/total';
    const data = await api.get(url);
    allStock   = data;
    renderTable(data);
  } catch (err) {
    document.getElementById('stock-tbody').innerHTML = tableEmptyRow(4, err.message);
  }
}

function renderTable(data) {
  const tbody = document.getElementById('stock-tbody');
  if (!data.length) { tbody.innerHTML = tableEmptyRow(4, 'No stock records found.'); return; }

  tbody.innerHTML = data.map(s => {
    const status = s.total_quantity <= 0
      ? '<span class="badge badge-red">Out of Stock</span>'
      : s.total_quantity < 10
        ? '<span class="badge badge-yellow">Low Stock</span>'
        : '<span class="badge badge-green">In Stock</span>';
    return `<tr>
      <td style="color:var(--muted)">#${s.product_id}</td>
      <td style="font-weight:500">${s.product_name}</td>
      <td><strong>${s.total_quantity.toLocaleString()}</strong></td>
      <td>${status}</td>
    </tr>`;
  }).join('');
}

function bindSearch() {
  let timer;
  document.getElementById('stock-search')?.addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => loadStock(e.target.value.trim()), 350);
  });
}

function bindAddStock() {
  document.getElementById('add-stock-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('as-error');
    const sucEl = document.getElementById('as-success');
    const btn   = document.getElementById('as-submit');
    errEl.classList.remove('show');
    sucEl.classList.remove('show');

    // const pid    = parseInt(document.getElementById('as-product-id').value);
    const productName = document.getElementById('as-product-name').value.trim();
    const qty    = parseInt(document.getElementById('as-qty').value);
    const cost   = parseFloat(document.getElementById('as-cost').value);
    const expiry = document.getElementById('as-expiry').value || null;

    let ok = true;
    // if (!pid || pid < 1) { document.getElementById('as-pid-hint').textContent  = 'Enter a valid product ID.'; ok = false; }
    if (!productName) { document.getElementById('as-pid-hint').textContent = 'Enter a product name.'; ok = false; }
    else document.getElementById('as-pid-hint').textContent = '';
    if (!qty || qty < 1) { document.getElementById('as-qty-hint').textContent  = 'Quantity must be at least 1.'; ok = false; }
    else document.getElementById('as-qty-hint').textContent = '';
    if (!cost || cost <= 0) { document.getElementById('as-cost-hint').textContent = 'Enter a valid cost price.'; ok = false; }
    else document.getElementById('as-cost-hint').textContent = '';
    if (!ok) return;

    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Adding…';
    try {
      await api.post('/stock/add/stock', {
        product_name: productName,
        quantity: qty,
        cost_price: cost,
        expiry_date: expiry,
    });
      sucEl.classList.add('show');
      e.target.reset();
      await loadStock();
      setTimeout(() => { sucEl.classList.remove('show'); closeModal('add-stock-modal'); }, 1500);
    } catch (err) {
      errEl.querySelector('span').textContent = err.message;
      errEl.classList.add('show');
    } finally {
      btn.disabled = false; btn.innerHTML = 'Add Stock';
    }
  });
}