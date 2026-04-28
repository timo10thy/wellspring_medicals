import { api }                                     from '../js/api.js';
import { renderSidebar, renderTopbar, bindSidebar,
         openModal, closeModal, bindModalClose,
         fmt, fmtDateTime, icons }                 from '../js/ui.js';

// Render
export function renderSales() {
  return `
  <div class="page-enter app-layout">
    ${renderSidebar('sales')}
    <div class="main-content">
      ${renderTopbar('Sales', 'Record sales and issue receipts')}
      <div class="page-body">

        <!-- New Sale button -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <p style="font-size:13px;color:var(--muted)">Record a new sale or look up an existing receipt.</p>
          <button id="new-sale-btn" class="btn btn-primary">${icons.plus} New Sale</button>
        </div>

        <!-- Receipt lookup -->
        <div class="card" style="padding:20px;">
          <div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:14px;">${icons.receipt} Look Up Receipt</div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <input class="field-input" id="receipt-id" type="number" min="1"
              placeholder="Enter sale ID…" style="max-width:220px;"/>
            <button id="receipt-btn" class="btn btn-ghost">${icons.search} Find</button>
          </div>
          <div id="receipt-result" style="margin-top:16px;display:none;"></div>
        </div>

      </div>
    </div>
  </div>

  <!-- ── New Sale Modal (Cart Style) ── -->
  <div id="new-sale-modal" class="modal-backdrop">
    <div class="modal" style="max-width:620px;max-height:92vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 style="font-family:var(--font-head);font-size:20px;color:var(--text)">New Sale</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>

      <div id="ns-error"   class="banner banner-error"><span></span></div>
      <div id="ns-success" class="banner banner-success"><span id="ns-success-msg">Sale recorded!</span></div>

      <!-- Product search -->
      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <input class="field-input" id="ns-product-search" type="text"
          placeholder="Search product name to add…" style="flex:1;"/>
        <button id="ns-search-btn" class="btn btn-ghost">${icons.search} Search</button>
      </div>
      <p class="field-hint hint-error" id="ns-search-hint" style="margin-bottom:8px;"></p>

      <!-- Search results -->
      <div id="ns-search-results" style="display:none;margin-bottom:16px;">
        <div id="ns-results-list" style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto;"></div>
      </div>

      <!-- Cart -->
      <div id="cart-section" style="display:none;">
        <div style="font-size:12px;font-weight:500;color:var(--muted);margin-bottom:8px;">CART</div>
        <div id="cart-items" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;"></div>

        <!-- Grand total -->
        <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:14px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;color:var(--muted);">Grand Total</span>
            <span id="cart-grand-total" style="font-family:var(--font-head);font-size:26px;color:var(--accent-lt);">₦0.00</span>
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button type="button" data-close-modal class="btn btn-ghost">Cancel</button>
          <button id="ns-submit" class="btn btn-primary">Record Sale</button>
        </div>
      </div>

      <!-- Empty cart hint -->
      <div id="cart-empty-hint" style="text-align:center;padding:24px 0;color:var(--muted);font-size:13px;">
        Search for products above to add them to the cart.
      </div>

    </div>
  </div>`;
}

// ── Cart state ────────────────────────────────────────────────────────────────
// Each entry: { product_id, product_name, stock_id, selling_price, available_qty, qty }
let cart = [];

// ── Init ──────────────────────────────────────────────────────────────────────
export function initSales() {
  bindSidebar();
  bindModalClose('new-sale-modal');

  document.getElementById('new-sale-btn')?.addEventListener('click', () => {
    resetSaleModal();
    openModal('new-sale-modal');
  });

  document.getElementById('ns-product-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('ns-search-btn')?.click();
  });

  document.getElementById('ns-search-btn')?.addEventListener('click', searchProduct);
  document.getElementById('ns-submit')?.addEventListener('click', submitSale);

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
  cart = [];
  document.getElementById('ns-product-search').value         = '';
  document.getElementById('ns-search-hint').textContent      = '';
  document.getElementById('ns-search-results').style.display = 'none';
  document.getElementById('ns-results-list').innerHTML       = '';
  document.getElementById('ns-error').classList.remove('show');
  document.getElementById('ns-success').classList.remove('show');
  renderCart();
}

// ── Search product ────────────────────────────────────────────────────────────
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
      hint.textContent = 'No products found.';
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
          ? `<span class="badge badge-green">Add to Cart</span>`
          : `<span class="badge badge-red">Unavailable</span>`}
      </div>`).join('');

    listEl.querySelectorAll('.product-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const qty = parseInt(item.getAttribute('data-qty'));
        if (qty <= 0) return;
        addToCart(
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

// ── Add to cart ───────────────────────────────────────────────────────────────
async function addToCart(productId, productName, availableQty) {
  const errEl = document.getElementById('ns-error');
  errEl.classList.remove('show');

  // If already in cart, just bump qty by 1 (capped at available)
  const existing = cart.find(i => i.product_id === productId);
  if (existing) {
    if (existing.qty < existing.available_qty) {
      existing.qty += 1;
    }
    renderCart();
    document.getElementById('ns-search-results').style.display = 'none';
    document.getElementById('ns-product-search').value = '';
    return;
  }

  try {
    const details   = await api.get(`/product/${productId}/details`);
    const stockData = await api.get(`/stock/by-product/${productId}`);

    cart.push({
      product_id:    productId,
      product_name:  productName,
      stock_id:      stockData.id,
      selling_price: parseFloat(details.price),
      available_qty: availableQty,
      qty:           1,               // always start at 1, never default to full stock
    });

    renderCart();
    document.getElementById('ns-search-results').style.display = 'none';
    document.getElementById('ns-product-search').value = '';
    document.getElementById('ns-search-hint').textContent = '';

  } catch (err) {
    errEl.querySelector('span').textContent = err.message;
    errEl.classList.add('show');
  }
}

// ── Render cart ───────────────────────────────────────────────────────────────
function renderCart() {
  const cartSection  = document.getElementById('cart-section');
  const emptyHint    = document.getElementById('cart-empty-hint');
  const cartItemsEl  = document.getElementById('cart-items');

  if (!cart.length) {
    cartSection.style.display = 'none';
    emptyHint.style.display   = 'block';
    return;
  }

  cartSection.style.display = 'block';
  emptyHint.style.display   = 'none';

  cartItemsEl.innerHTML = cart.map((item, idx) => `
    <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:12px 14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;font-weight:500;color:var(--text);">${item.product_name}</span>
        <button class="btn btn-ghost remove-cart-item" data-idx="${idx}"
          style="font-size:11px;padding:3px 8px;color:#f87171;">✕ Remove</button>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="font-size:12px;color:var(--muted);">
          Unit price: <strong style="color:var(--text);">₦${fmt(item.selling_price)}</strong>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <label style="font-size:12px;color:var(--muted);">Qty:</label>
          <input type="number" class="field-input cart-qty-input" data-idx="${idx}"
            value="${item.qty}" min="1" max="${item.available_qty}"
            style="width:70px;padding:4px 8px;font-size:13px;text-align:center;"/>
          <span style="font-size:11px;color:var(--muted);">/ ${item.available_qty}</span>
        </div>
        <div style="font-size:13px;font-weight:500;color:var(--accent-lt);margin-left:auto;">
          ₦${fmt(item.qty * item.selling_price)}
        </div>
      </div>
    </div>`).join('');

  // ── Qty input: use 'change' + 'blur' so user can type freely (e.g. "13")
  // without each keystroke clamping the value mid-type.
  cartItemsEl.querySelectorAll('.cart-qty-input').forEach(input => {
    // Live feedback: just update total while typing without clamping
    input.addEventListener('input', () => {
      const idx = parseInt(input.dataset.idx);
      const raw = parseInt(input.value);
      if (!isNaN(raw) && raw >= 1 && raw <= cart[idx].available_qty) {
        cart[idx].qty = raw;
        updateGrandTotal();
      }
    });

    // Clamp and enforce limits only when user leaves the field
    input.addEventListener('blur', () => {
      const idx = parseInt(input.dataset.idx);
      let val   = parseInt(input.value);

      if (isNaN(val) || val < 1) val = 1;
      if (val > cart[idx].available_qty) val = cart[idx].available_qty;

      cart[idx].qty = val;
      input.value   = val;
      updateGrandTotal();
    });

    // Also clamp on Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });
  });

  // Bind remove buttons
  cartItemsEl.querySelectorAll('.remove-cart-item').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.splice(parseInt(btn.dataset.idx), 1);
      renderCart();
    });
  });

  updateGrandTotal();
}

function updateGrandTotal() {
  const total = cart.reduce((sum, i) => sum + i.qty * i.selling_price, 0);
  document.getElementById('cart-grand-total').textContent = `₦${fmt(total)}`;
}

// ── Submit sale ───────────────────────────────────────────────────────────────
async function submitSale() {
  const errEl  = document.getElementById('ns-error');
  const sucEl  = document.getElementById('ns-success');
  const sucMsg = document.getElementById('ns-success-msg');
  const btn    = document.getElementById('ns-submit');

  errEl.classList.remove('show');
  sucEl.classList.remove('show');

  if (!cart.length) {
    errEl.querySelector('span').textContent = 'Add at least one product to the cart.';
    errEl.classList.add('show');
    return;
  }

  // Validate all quantities before submitting
  const invalid = cart.find(i => !i.qty || i.qty < 1);
  if (invalid) {
    errEl.querySelector('span').textContent = `Quantity for "${invalid.product_name}" must be at least 1.`;
    errEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Processing…';

  try {
    const receipt = await api.post('/sales/create', {
      items: cart.map(i => ({
        stock_id:      i.stock_id,
        quantity_sold: i.qty,
        selling_price: i.selling_price,
      })),
    });

    sucMsg.innerHTML = `Sale recorded! Receipt #${receipt.receipt_id} — Total: ₦${fmt(receipt.grand_total)}
      <span style="color:var(--accent-lt);cursor:pointer;text-decoration:underline;margin-left:8px;" id="view-receipt-link">
        View Receipt
      </span>`;
    sucEl.classList.add('show');
    cart = [];
    renderCart();

    setTimeout(() => {
      document.getElementById('view-receipt-link')?.addEventListener('click', () => {
        closeModal('new-sale-modal');
        document.getElementById('receipt-id').value = receipt.receipt_id;
        fetchReceipt(receipt.receipt_id);
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
      <div class="card" style="padding:18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div style="font-family:var(--font-head);font-size:16px;color:var(--text)">Receipt #${r.receipt_id}</div>
          <span class="badge badge-green">Completed</span>
        </div>
        ${receiptRow('Sold By', r.sold_by)}
        ${receiptRow('Date',    fmtDateTime(r.created_at))}

        <div style="margin:14px 0 10px;font-size:12px;font-weight:500;color:var(--muted);">ITEMS</div>
        ${r.items.map(item => `
          <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;
                      padding:10px 14px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:13px;font-weight:500;color:var(--text);">${item.product_name}</span>
              <span style="font-size:13px;font-weight:500;color:var(--accent-lt);">₦${fmt(item.total_amount)}</span>
            </div>
            <div style="font-size:11px;color:var(--muted);">
              ${item.quantity_sold} × ₦${fmt(item.unit_price)}
            </div>
          </div>`).join('')}

        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:12px 0 0;border-top:1px solid var(--border);margin-top:8px;">
          <span style="font-size:13px;font-weight:500;color:var(--text);">Grand Total</span>
          <strong style="font-family:var(--font-head);font-size:20px;color:var(--accent-lt);">
            ₦${fmt(r.grand_total)}
          </strong>
        </div>
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