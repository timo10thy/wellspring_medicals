// ── Sales Page ────────────────────────────────────────────────────────────────
// POST /sales/create
// GET  /sales/{id}/salesreceipt

import { api }                                     from '../js/api.js';
import { auth }                                    from '../js/auth.js';
import { renderSidebar, renderTopbar, bindSidebar,
         openModal, closeModal, bindModalClose,
         fmt, fmtDateTime, tableEmptyRow,
         tableLoadingRow, icons }                  from '../js/ui.js';

export function renderSales() {
  return `
  <div class="page-enter app-layout">
    ${renderSidebar('sales')}
    <div class="main-content">
      ${renderTopbar('Sales', 'Process transactions and view receipts')}
      <div class="page-body">

        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
          <p style="font-size:13px;color:var(--muted)">Process a new sale or look up a receipt by Sale ID.</p>
          <button id="new-sale-btn" class="btn btn-primary">${icons.plus} New Sale</button>
        </div>

        <!-- Receipt lookup -->
        <div class="card" style="padding:20px;margin-bottom:20px;">
          <div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:14px;">${icons.receipt} Look Up Receipt</div>
          <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
            <div style="flex:1;min-width:180px;">
              <label class="field-label">Sale ID</label>
              <input class="field-input" id="receipt-id" type="number" placeholder="Enter sale ID…" min="1"/>
            </div>
            <button id="receipt-btn" class="btn btn-ghost">Fetch Receipt</button>
          </div>
          <div id="receipt-result" style="margin-top:16px;display:none;"></div>
        </div>

        <!-- Recent transactions placeholder -->
        <div class="card" style="overflow:hidden;">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);">
            <span style="font-size:13px;font-weight:500;color:var(--text)">Transaction History</span>
          </div>
          <div id="sales-list" style="padding:40px;text-align:center;color:var(--muted);font-size:13px;">
            Sales history will appear here after transactions are processed.
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- New Sale Modal -->
  <div id="new-sale-modal" class="modal-backdrop">
    <div class="modal">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 style="font-family:var(--font-head);font-size:20px;color:var(--text)">New Sale</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>
      <div id="ns-error" class="banner banner-error"><span></span></div>
      <div id="ns-success" class="banner banner-success">
        <span>Sale recorded! </span><span id="ns-receipt-link" style="color:var(--accent-lt);cursor:pointer;text-decoration:underline;"></span>
      </div>

      <form id="new-sale-form" novalidate style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label class="field-label">Stock ID</label>
          <input class="field-input" id="ns-stock-id" type="number" placeholder="Enter stock ID" min="1"/>
          <p class="field-hint hint-error" id="ns-sid-hint"></p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label class="field-label">Quantity</label>
            <input class="field-input" id="ns-qty" type="number" placeholder="0" min="1"/>
            <p class="field-hint hint-error" id="ns-qty-hint"></p>
          </div>
          <div>
            <label class="field-label">Selling Price (₦)</label>
            <input class="field-input" id="ns-price" type="number" placeholder="0.00" min="0" step="0.01"/>
            <p class="field-hint hint-error" id="ns-price-hint"></p>
          </div>
        </div>

        <!-- Total preview -->
        <div id="sale-total-preview" style="display:none;background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:12px 14px;">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Estimated Total</div>
          <div id="sale-total-val" style="font-family:var(--font-head);font-size:22px;color:var(--accent-lt)">₦0.00</div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
          <button type="button" data-close-modal class="btn btn-ghost">Cancel</button>
          <button type="submit" id="ns-submit" class="btn btn-primary">Record Sale</button>
        </div>
      </form>
    </div>
  </div>`;
}

export function initSales() {
  bindSidebar();
  bindModalClose('new-sale-modal');

  document.getElementById('new-sale-btn')?.addEventListener('click', () => {
    document.getElementById('new-sale-form')?.reset();
    document.getElementById('ns-error').classList.remove('show');
    document.getElementById('ns-success').classList.remove('show');
    document.getElementById('sale-total-preview').style.display = 'none';
    openModal('new-sale-modal');
  });

  // Live total preview
  ['ns-qty', 'ns-price'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateTotalPreview);
  });

  bindNewSale();
  bindReceiptLookup();
}

function updateTotalPreview() {
  const qty   = parseFloat(document.getElementById('ns-qty')?.value) || 0;
  const price = parseFloat(document.getElementById('ns-price')?.value) || 0;
  const prev  = document.getElementById('sale-total-preview');
  const val   = document.getElementById('sale-total-val');
  if (qty > 0 && price > 0) {
    prev.style.display = 'block';
    val.textContent = `₦${fmt(qty * price)}`;
  } else {
    prev.style.display = 'none';
  }
}

function bindNewSale() {
  document.getElementById('new-sale-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('ns-error');
    const sucEl = document.getElementById('ns-success');
    const btn   = document.getElementById('ns-submit');
    errEl.classList.remove('show');
    sucEl.classList.remove('show');

    const stockId = parseInt(document.getElementById('ns-stock-id').value);
    const qty     = parseInt(document.getElementById('ns-qty').value);
    const price   = parseFloat(document.getElementById('ns-price').value);

    let ok = true;
    if (!stockId || stockId < 1) { document.getElementById('ns-sid-hint').textContent = 'Enter a valid stock ID.'; ok = false; }
    else document.getElementById('ns-sid-hint').textContent = '';
    if (!qty || qty < 1) { document.getElementById('ns-qty-hint').textContent = 'Quantity must be at least 1.'; ok = false; }
    else document.getElementById('ns-qty-hint').textContent = '';
    if (!price || price <= 0) { document.getElementById('ns-price-hint').textContent = 'Enter a valid selling price.'; ok = false; }
    else document.getElementById('ns-price-hint').textContent = '';
    if (!ok) return;

    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Processing…';
    try {
      const sale = await api.post('/sales/create', {
        stock_id: stockId, quantity_sold: qty, selling_price: price,
      });

      const link = document.getElementById('ns-receipt-link');
      link.textContent = `View Receipt #${sale.id}`;
      link.onclick = () => { closeModal('new-sale-modal'); fetchReceipt(sale.id); };
      sucEl.classList.add('show');
      e.target.reset();
      document.getElementById('sale-total-preview').style.display = 'none';
    } catch (err) {
      errEl.querySelector('span').textContent = err.message;
      errEl.classList.add('show');
    } finally {
      btn.disabled = false; btn.innerHTML = 'Record Sale';
    }
  });
}

function bindReceiptLookup() {
  document.getElementById('receipt-btn')?.addEventListener('click', () => {
    const id = parseInt(document.getElementById('receipt-id').value);
    if (!id || id < 1) return;
    fetchReceipt(id);
  });
  document.getElementById('receipt-id')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('receipt-btn')?.click();
  });
}

async function fetchReceipt(id) {
  const container = document.getElementById('receipt-result');
  container.style.display = 'block';
  container.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;"><span class="spinner" style="border-top-color:var(--accent)"></span> Loading receipt…</div>`;

  try {
    const r = await api.get(`/sales/${id}/salesreceipt`);
    container.innerHTML = `
      <div class="card-sm" style="padding:18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div style="font-family:var(--font-head);font-size:16px;color:var(--text)">Receipt #${r.sale_id}</div>
          <span class="badge badge-green">Completed</span>
        </div>
        ${receiptRow('Product',      r.product_name)}
        ${receiptRow('Qty Sold',     r.quantity_sold)}
        ${receiptRow('Unit Price',   `₦${fmt(r.unit_price)}`)}
        ${receiptRow('Total',        `<strong style="color:var(--accent-lt)">₦${fmt(r.total_amount)}</strong>`)}
        ${receiptRow('Sold By',      r.sold_by)}
        ${receiptRow('Date',         fmtDateTime(r.created_at))}
      </div>`;
  } catch (err) {
    container.innerHTML = `<div style="color:#f87171;font-size:13px;">${err.message}</div>`;
  }
}

function receiptRow(label, value) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;">
    <span style="color:var(--muted)">${label}</span><span>${value}</span>
  </div>`;
}