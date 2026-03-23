// ── Sales Page ────────────────────────────────────────────────────────────────
// POST /sales/create
// GET  /sales/{id}/salesreceipt

import { api }                                    from '../js/api.js';
import { auth }                                   from '../js/auth.js';
import { renderSidebar, renderTopbar, bindSidebar,
         openModal, closeModal, bindModalClose,
         fmt, fmtDateTime, icons }                from '../js/ui.js';

export function renderSales() {
  return `
  <div class="page-enter app-layout">
    ${renderSidebar('sales')}
    <div class="main-content">
      ${renderTopbar('Sales', 'Process transactions and view receipts')}
      <div class="page-body">

        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
          <p style="font-size:13px;color:var(--muted)">Search a product to start a new sale or look up a receipt.</p>
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

        <!-- Transaction history -->
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
    <div class="modal" style="max-width:520px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 style="font-family:var(--font-head);font-size:20px;color:var(--text)">New Sale</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>

      <div id="ns-error" class="banner banner-error"><span></span></div>
      <div id="ns-success" class="banner banner-success">
        <span id="ns-success-msg">Sale recorded!</span>
      </div>

      <!-- Step 1: Search product -->
      <div id="step-search">
        <div style="margin-bottom:14px;">
          <label class="field-label">Search Product</label>
          <div style="display:flex;gap:8px;">
            <input class="field-input" id="ns-product-search" type="text" placeholder="e.g. Paracetamol…"/>
            <button id="ns-search-btn" class="btn btn-ghost" style="flex-shrink:0;">
              ${icons.search} Search
            </button>
          </div>
          <p class="field-hint hint-error" id="ns-search-hint"></p>
        </div>

        <!-- Search results -->
        <div id="ns-search-results" style="display:none;margin-bottom:14px;">
          <label class="field-label">Select Product</label>
          <div id="ns-results-list" style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto;"></div>
        </div>
      </div>

      <!-- Step 2: Sale form (shown after product selected) -->
      <div id="step-form" style="display:none;">

        <!-- Selected product info -->
        <div id="ns-product-info" style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:12px 14px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div id="ns-product-name" style="font-size:14px;font-weight:500;color:var(--text);"></div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px;">
                Available: <span id="ns-stock-qty" style="color:var(--accent-lt);font-weight:500;"></span>
                &nbsp;·&nbsp; Unit price: <span id="ns-unit-price" style="color:var(--accent-lt);font-weight:500;"></span>
              </div>
            </div>
            <button type="button" id="ns-change-product" class="btn btn-ghost" style="font-size:11px;padding:5px 10px;">Change</button>
          </div>
        </div>

        <form id="ns-sale-form" novalidate style="display:flex;flex-direction:column;gap:14px;">
          <input type="hidden" id="ns-stock-id"/>
          <input type="hidden" id="ns-selling-price"/>

          <div>
            <label class="field-label">Quantity</label>
            <input class="field-input" id="ns-qty" type="number" placeholder="0" min="1"/>
            <p class="field-hint hint-error" id="ns-qty-hint"></p>
          </div>

          <!-- Total preview -->
          <div id="sale-total-preview" style="display:none;background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:12px;color:var(--muted);">Total Amount</span>
              <span id="sale-total-val" style="font-family:var(--font-head);font-size:24px;color:var(--accent-lt);">₦0.00</span>
            </div>
          </div>

          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
            <button type="button" data-close-modal class="btn btn-ghost">Cancel</button>
            <button type="submit" id="ns-submit" class="btn btn-primary">Record Sale</button>
          </div>
        </form>
      </div>

    </div>
  </div>`;
}

// ── State ─────────────────────────────────────────────────────────────────────
let selectedProduct = null;

export function initSales() {
  bindSidebar();
  bindModalClose('new-sale-modal');

  // Open modal
  document.getElementById('new-sale-btn')?.addEventListener('click', () => {
    resetSaleModal();
    openModal('new-sale-modal');
  });

  // Search on Enter key
  document.getElementById('ns-product-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('ns-search-btn')?.click();
  });

  // Search button
  document.getElementById('ns-search-btn')?.addEventListener('click', searchProduct);

  // Change product button
  document.getElementById('ns-change-product')?.addEventListener('click', () => {
    document.getElementById('step-form').style.display   = 'none';
    document.getElementById('step-search').style.display = 'block';
    document.getElementById('ns-search-results').style.display = 'none';
    document.getElementById('ns-product-search').value  = '';
    document.getElementById('ns-error').classList.remove('show');
  });

  // Live total preview
  document.getElementById('ns-qty')?.addEventListener('input', updateTotal);

  // Sale form submit
  document.getElementById('ns-sale-form')?.addEventListener('submit', submitSale);

  // Receipt lookup
  document.getElementById('receipt-btn')?.addEventListener('click', () => {
    const id = parseInt(document.getElementById('receipt-id').value);
    if (!id || id < 1) return;
    fetchReceipt(id);
  });
  document.getElementById('receipt-id')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('receipt-btn')?.click();
  });
}

function resetSaleModal() {
  selectedProduct = null;
  document.getElementById('step-search').style.display       = 'block';
  document.getElementById('step-form').style.display         = 'none';
  document.getElementById('ns-search-results').style.display = 'none';
  document.getElementById('ns-product-search').value         = '';
  document.getElementById('ns-qty').value                    = '';
  document.getElementById('ns-error').classList.remove('show');
  document.getElementById('ns-success').classList.remove('show');
  document.getElementById('sale-total-preview').style.display = 'none';
  document.getElementById('ns-search-hint').textContent      = '';
}

// ── Step 1: Search product ────────────────────────────────────────────────────
async function searchProduct() {
  const query = document.getElementById('ns-product-search').value.trim();
  const hint  = document.getElementById('ns-search-hint');
  const btn   = document.getElementById('ns-search-btn');

  if (!query) { hint.textContent = 'Enter a product name to search.'; return; }
  hint.textContent = '';

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="border-top-color:var(--accent)"></span>';

  try {
    const results = await api.get(`/stock/total/search?product_name=${encodeURIComponent(query)}`);
    const listEl  = document.getElementById('ns-results-list');
    const resEl   = document.getElementById('ns-search-results');

    if (!results.length) {
      hint.textContent = 'No products found. Try a different name.';
      resEl.style.display = 'none';
      return;
    }

    resEl.style.display = 'block';
    listEl.innerHTML = results.map(p => `
      <div class="product-result-item"
        data-id="${p.product_id}"
        data-name="${p.product_name}"
        data-qty="${p.total_quantity}"
        style="display:flex;align-items:center;justify-content:space-between;
               padding:10px 12px;background:var(--surface2);border:1px solid var(--border2);
               border-radius:8px;cursor:${p.total_quantity > 0 ? 'pointer' : 'not-allowed'};
               opacity:${p.total_quantity > 0 ? '1' : '0.5'};">
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--text)">${p.product_name}</div>
          <div style="font-size:11px;margin-top:2px;">
            ${p.total_quantity > 0
              ? `<span style="color:var(--accent-lt)">${p.total_quantity} units available</span>`
              : `<span style="color:#f87171">Out of stock</span>`}
          </div>
        </div>
        ${p.total_quantity > 0
          ? `<span class="badge badge-green">Select</span>`
          : `<span class="badge badge-red">Unavailable</span>`}
      </div>`).join('');

    listEl.querySelectorAll('.product-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const qty = parseInt(item.getAttribute('data-qty'));
        if (qty <= 0) return;
        selectProduct(
          parseInt(item.getAttribute('data-id')),
          item.getAttribute('data-name'),
          qty
        );
      });
    });

  } catch (err) {
    hint.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${icons.search} Search`;
  }
}

// ── Step 2: Product selected → fetch price + stock_id ────────────────────────
async function selectProduct(productId, productName, totalQty) {
  const errEl = document.getElementById('ns-error');
  errEl.classList.remove('show');

  try {
    // Get product price
    const details   = await api.get(`/product/${productId}/details`);
    // Get stock_id (FEFO — earliest expiry first)
    const stockData = await api.get(`/stock/by-product/${productId}`);

    selectedProduct = {
      product_id:   productId,
      product_name: productName,
      total_qty:    totalQty,
      price:        parseFloat(details.price),
      stock_id:     stockData.id,
    };

    document.getElementById('ns-product-name').textContent = productName;
    document.getElementById('ns-stock-qty').textContent    = `${totalQty} units`;
    document.getElementById('ns-unit-price').textContent   = `₦${fmt(details.price)}`;
    document.getElementById('ns-stock-id').value           = stockData.id;
    document.getElementById('ns-selling-price').value      = details.price;

    document.getElementById('step-search').style.display = 'none';
    document.getElementById('step-form').style.display   = 'block';
    document.getElementById('ns-qty').focus();

  } catch (err) {
    errEl.querySelector('span').textContent = err.message;
    errEl.classList.add('show');
  }
}

function updateTotal() {
  const qty   = parseInt(document.getElementById('ns-qty')?.value) || 0;
  const price = parseFloat(document.getElementById('ns-selling-price')?.value) || 0;
  const prev  = document.getElementById('sale-total-preview');
  const val   = document.getElementById('sale-total-val');

  if (qty > 0 && price > 0) {
    prev.style.display = 'block';
    val.textContent    = `₦${fmt(qty * price)}`;
  } else {
    prev.style.display = 'none';
  }
}

// ── Step 3: Submit sale ───────────────────────────────────────────────────────
async function submitSale(e) {
  e.preventDefault();
  const errEl  = document.getElementById('ns-error');
  const sucEl  = document.getElementById('ns-success');
  const sucMsg = document.getElementById('ns-success-msg');
  const btn    = document.getElementById('ns-submit');

  errEl.classList.remove('show');
  sucEl.classList.remove('show');

  const qty   = parseInt(document.getElementById('ns-qty').value);
  const price = parseFloat(document.getElementById('ns-selling-price').value);

  if (!qty || qty < 1) {
    document.getElementById('ns-qty-hint').textContent = 'Enter a valid quantity.';
    return;
  }
  if (qty > selectedProduct.total_qty) {
    document.getElementById('ns-qty-hint').textContent = `Only ${selectedProduct.total_qty} units available.`;
    return;
  }
  document.getElementById('ns-qty-hint').textContent = '';

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Processing…';

  try {
    const sale = await api.post('/sales/create', {
      stock_id:      selectedProduct.stock_id,
      quantity_sold: qty,
      selling_price: price,
    });

    sucMsg.innerHTML = `Sale recorded! <span style="color:var(--accent-lt);cursor:pointer;text-decoration:underline;" id="view-receipt-link">View Receipt #${sale.id}</span>`;
    sucEl.classList.add('show');

    // Update available qty
    selectedProduct.total_qty -= qty;
    document.getElementById('ns-stock-qty').textContent = `${selectedProduct.total_qty} units`;
    document.getElementById('ns-qty').value = '';
    document.getElementById('sale-total-preview').style.display = 'none';

    // Bind receipt link
    setTimeout(() => {
      document.getElementById('view-receipt-link')?.addEventListener('click', () => {
        closeModal('new-sale-modal');
        document.getElementById('receipt-id').value = sale.id;
        fetchReceipt(sale.id);
      });
    }, 50);

  } catch (err) {
    errEl.querySelector('span').textContent = err.message;
    errEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Record Sale';
  }
}

// ── Receipt lookup ────────────────────────────────────────────────────────────
async function fetchReceipt(id) {
  const container = document.getElementById('receipt-result');
  container.style.display = 'block';
  container.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;">
    <span class="spinner" style="border-top-color:var(--accent)"></span> Loading receipt…</div>`;

  try {
    const r = await api.get(`/sales/${id}/salesreceipt`);
    container.innerHTML = `
      <div class="card-sm" style="padding:18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div style="font-family:var(--font-head);font-size:16px;color:var(--text)">Receipt #${r.sale_id}</div>
          <span class="badge badge-green">Completed</span>
        </div>
        ${receiptRow('Product',    r.product_name)}
        ${receiptRow('Qty Sold',   r.quantity_sold)}
        ${receiptRow('Unit Price', `₦${fmt(r.unit_price)}`)}
        ${receiptRow('Total',      `<strong style="color:var(--accent-lt)">₦${fmt(r.total_amount)}</strong>`)}
        ${receiptRow('Sold By',    r.sold_by)}
        ${receiptRow('Date',       fmtDateTime(r.created_at))}
      </div>`;
  } catch (err) {
    container.innerHTML = `<div style="color:#f87171;font-size:13px;">${err.message}</div>`;
  }
}

function receiptRow(label, value) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;
    padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;">
    <span style="color:var(--muted)">${label}</span><span>${value}</span>
  </div>`;
}