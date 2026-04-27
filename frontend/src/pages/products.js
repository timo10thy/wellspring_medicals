// ── Products Page (Admin only) ────────────────────────────────────────────────
// POST /product/create
// GET  /product/{id}/details
// PUT  /product/{id}/update

import { api }                                        from '../js/api.js';
import { renderSidebar, renderTopbar, bindSidebar,
         openModal, closeModal, bindModalClose,
         showBanner, fmt, fmtDate,
         tableLoadingRow, tableEmptyRow, icons }       from '../js/ui.js';

export function renderProducts() {
  return `
  <style>
    /* ── Products page mobile fixes ── */
    .products-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .products-search-wrap {
      position: relative;
      flex: 1;
      min-width: 0;
      max-width: 320px;
    }
    .products-search-wrap .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted);
      pointer-events: none;
    }
    .products-search-wrap .field-input {
      padding-left: 36px;
      width: 100%;
    }
    #add-product-btn { white-space: nowrap; flex-shrink: 0; }

    .ap-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    @media (max-width: 768px) {
      .products-search-wrap { max-width: 100%; }
      .ap-grid-2 { grid-template-columns: 1fr !important; }
    }
  </style>

  <div class="page-enter app-layout">
    ${renderSidebar('products')}
    <div class="main-content">
      ${renderTopbar('Products', 'Manage your pharmaceutical product catalogue')}
      <div class="page-body">

        <!-- Toolbar -->
        <div class="products-toolbar">
          <div class="products-search-wrap">
            <span class="search-icon">${icons.search}</span>
            <input id="product-search" class="field-input" type="text" placeholder="Search products…"/>
          </div>
          <button id="add-product-btn" class="btn btn-primary">${icons.plus} Add Product</button>
        </div>

        <!-- Table -->
        <div class="card" style="overflow:hidden;">
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead><tr>
                <th>Name</th><th>Price (₦)</th><th>Description</th><th>Status</th><th>Created</th><th>Actions</th>
              </tr></thead>
              <tbody id="products-tbody">${tableLoadingRow(6)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add Product Modal -->
  <div id="add-product-modal" class="modal-backdrop">
    <div class="modal">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 style="font-family:var(--font-head);font-size:20px;color:var(--text)">New Product</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>

      <div id="ap-error" class="banner banner-error"><span></span></div>

      <form id="add-product-form" novalidate style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label class="field-label">Product Name</label>
          <input class="field-input" id="ap-name" type="text" placeholder="e.g. Paracetamol 500mg" maxlength="200"/>
          <p class="field-hint hint-error" id="ap-name-hint"></p>
        </div>
        <div class="ap-grid-2">
          <div>
            <label class="field-label">Price (₦)</label>
            <input class="field-input" id="ap-price" type="number" placeholder="0.00" min="0" step="0.01"/>
            <p class="field-hint hint-error" id="ap-price-hint"></p>
          </div>
          <div>
            <label class="field-label">Status</label>
            <select class="field-input" id="ap-active">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
        <div>
          <label class="field-label">Description</label>
          <textarea class="field-input" id="ap-desc" rows="3" placeholder="Product description…" style="resize:vertical;"></textarea>
          <p class="field-hint hint-error" id="ap-desc-hint"></p>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
          <button type="button" data-close-modal class="btn btn-ghost">Cancel</button>
          <button type="submit" id="ap-submit" class="btn btn-primary">Create Product</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Edit Price Modal -->
  <div id="edit-price-modal" class="modal-backdrop">
    <div class="modal">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 style="font-family:var(--font-head);font-size:20px;color:var(--text)">Update Price</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>
      <div id="ep-error" class="banner banner-error"><span></span></div>
      <form id="edit-price-form" novalidate style="display:flex;flex-direction:column;gap:14px;">
        <input type="hidden" id="ep-product-id"/>
        <div>
          <label class="field-label">New Price (₦)</label>
          <input class="field-input" id="ep-price" type="number" placeholder="0.00" min="0" step="0.01"/>
          <p class="field-hint hint-error" id="ep-price-hint"></p>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button type="button" data-close-modal class="btn btn-ghost">Cancel</button>
          <button type="submit" id="ep-submit" class="btn btn-primary">Update Price</button>
        </div>
      </form>
    </div>
  </div>`;
}

// ── All products are fetched via /stock/stock/total (has name + stock)
// and /product/{id}/details for individual items
// We use the total stock endpoint for the table listing
export async function initProducts() {
  bindSidebar();
  bindModalClose('add-product-modal');
  bindModalClose('edit-price-modal');

  document.getElementById('add-product-btn')?.addEventListener('click', () => {
    document.getElementById('add-product-form')?.reset();
    document.getElementById('ap-error').classList.remove('show');
    openModal('add-product-modal');
  });

  await loadProducts();
  bindAddProduct();
  bindSearch();
}

let allProducts = [];

async function loadProducts() {
  try {
    const data = await api.get('/stock/stock/total');
    allProducts = data;
    renderTable(data);
  } catch (err) {
    document.getElementById('products-tbody').innerHTML = tableEmptyRow(6, err.message);
  }
}

function renderTable(data) {
  const tbody = document.getElementById('products-tbody');
  if (!data.length) { tbody.innerHTML = tableEmptyRow(6); return; }

  tbody.innerHTML = data.map(p => `
    <tr>
      <td style="font-weight:500;color:var(--text)">${p.product_name}</td>
      <td>—</td>
      <td style="color:var(--muted);font-size:12px">—</td>
      <td><span class="badge badge-green">Active</span></td>
      <td style="color:var(--muted);font-size:12px">—</td>
      <td>
        <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;white-space:nowrap;"
          onclick="window._editPrice(${p.product_id}, '${p.product_name}')">Edit Price</button>
      </td>
    </tr>`).join('');

  window._editPrice = (id, name) => {
    document.getElementById('ep-product-id').value = id;
    document.getElementById('ep-price').value = '';
    document.getElementById('ep-error').classList.remove('show');
    openModal('edit-price-modal');
    document.querySelector('#edit-price-modal .modal h2').textContent = `Update Price — ${name}`;
    bindEditPrice();
  };
}

function bindSearch() {
  document.getElementById('product-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    renderTable(q ? allProducts.filter(p => p.product_name.toLowerCase().includes(q)) : allProducts);
  });
}

function bindAddProduct() {
  document.getElementById('add-product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl  = document.getElementById('ap-error');
    const btn    = document.getElementById('ap-submit');
    errEl.classList.remove('show');

    const name  = document.getElementById('ap-name').value.trim();
    const price = parseFloat(document.getElementById('ap-price').value);
    const desc  = document.getElementById('ap-desc').value.trim();
    const active = document.getElementById('ap-active').value === 'true';

    let ok = true;
    if (!name) { document.getElementById('ap-name-hint').textContent = 'Name is required.'; ok = false; }
    else document.getElementById('ap-name-hint').textContent = '';
    if (!price || price <= 0) { document.getElementById('ap-price-hint').textContent = 'Enter a valid price.'; ok = false; }
    else document.getElementById('ap-price-hint').textContent = '';
    if (!desc) { document.getElementById('ap-desc-hint').textContent = 'Description is required.'; ok = false; }
    else document.getElementById('ap-desc-hint').textContent = '';
    if (!ok) return;

    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Creating…';
    try {
      await api.post('/product/create', { name, price, is_active: active, description: desc });
      closeModal('add-product-modal');
      await loadProducts();
    } catch (err) {
      errEl.querySelector('span').textContent = err.message;
      errEl.classList.add('show');
    } finally {
      btn.disabled = false; btn.innerHTML = 'Create Product';
    }
  });
}

function bindEditPrice() {
  const form = document.getElementById('edit-price-form');
  // Remove old listener by cloning
  const fresh = form.cloneNode(true);
  form.parentNode.replaceChild(fresh, form);

  fresh.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id    = document.getElementById('ep-product-id').value;
    const price = parseFloat(document.getElementById('ep-price').value);
    const errEl = document.getElementById('ep-error');
    const btn   = document.getElementById('ep-submit');
    errEl.classList.remove('show');

    if (!price || price <= 0) { document.getElementById('ep-price-hint').textContent = 'Enter a valid price.'; return; }
    document.getElementById('ep-price-hint').textContent = '';

    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Updating…';
    try {
      await api.put(`/product/${id}/update`, { price });
      closeModal('edit-price-modal');
      await loadProducts();
    } catch (err) {
      errEl.querySelector('span').textContent = err.message;
      errEl.classList.add('show');
    } finally {
      btn.disabled = false; btn.innerHTML = 'Update Price';
    }
  });
}