import { api }                                        from '../js/api.js';
import { renderSidebar, renderTopbar, bindSidebar,
         openModal, closeModal, bindModalClose,
         fmt, fmtDate,
         tableLoadingRow, tableEmptyRow, icons }       from '../js/ui.js';

export function renderProducts() {
  return `
  <style>
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
    .products-search-wrap .field-input { padding-left: 36px; width: 100%; }
    #add-product-btn { white-space: nowrap; flex-shrink: 0; }
    .ap-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .cut-fields { display: none; flex-direction: column; gap: 12px; }
    .cut-fields.visible { display: flex; }
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

        <div class="products-toolbar">
          <div class="products-search-wrap">
            <span class="search-icon">${icons.search}</span>
            <input id="product-search" class="field-input" type="text" placeholder="Search products…"/>
          </div>
          <button id="add-product-btn" class="btn btn-primary">${icons.plus} Add Product</button>
        </div>

        <div class="card" style="overflow:hidden;">
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead><tr>
                <th>Name</th>
                <th>Card Price (₦)</th>
                <th>Sold As</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
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
    <div class="modal" style="max-width:520px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 style="font-family:var(--font-head);font-size:20px;color:var(--text)">New Product</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>

      <div id="ap-error" class="banner banner-error"><span></span></div>

      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label class="field-label">Product Name</label>
          <input class="field-input" id="ap-name" type="text" placeholder="e.g. Paracetamol 500mg" maxlength="200"/>
          <p class="field-hint hint-error" id="ap-name-hint"></p>
        </div>
        <div class="ap-grid-2">
          <div>
            <label class="field-label">Card/Strip Price (₦) <span style="font-size:11px;color:var(--muted);">selling price per card</span></label>
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

        <!-- Cut drug toggle -->
        <div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--surface2);
                    border:1px solid var(--border2);border-radius:8px;">
          <input type="checkbox" id="ap-cuttable" style="width:16px;height:16px;cursor:pointer;"/>
          <div>
            <label for="ap-cuttable" style="font-size:13px;font-weight:500;color:var(--text);cursor:pointer;">
              Sold in cuts (sub-units)
            </label>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">
              e.g. sell 3 tablets from a strip of 10
            </div>
          </div>
        </div>

        <!-- Cut fields — shown only when cuttable is checked -->
        <div class="cut-fields" id="ap-cut-fields">
          <div class="ap-grid-2">
            <div>
              <label class="field-label">Sub-unit name</label>
              <input class="field-input" id="ap-sub-unit" type="text" placeholder="e.g. tablet, capsule"/>
              <p class="field-hint hint-error" id="ap-sub-unit-hint"></p>
            </div>
            <div>
              <label class="field-label">Pieces per card/strip</label>
              <input class="field-input" id="ap-pieces" type="number" min="1" placeholder="e.g. 10"/>
              <p class="field-hint hint-error" id="ap-pieces-hint"></p>
            </div>
          </div>
          <div>
            <label class="field-label">Cut selling price (₦) <span style="font-size:11px;color:var(--muted);">price per tablet/capsule</span></label>
            <input class="field-input" id="ap-cut-price" type="number" placeholder="0.00" min="0" step="0.01"/>
            <p class="field-hint hint-error" id="ap-cut-price-hint"></p>
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
          <button type="button" data-close-modal class="btn btn-ghost">Cancel</button>
          <button id="ap-submit" class="btn btn-primary">Create Product</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Edit Product Modal -->
  <div id="edit-product-modal" class="modal-backdrop">
    <div class="modal" style="max-width:520px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 style="font-family:var(--font-head);font-size:20px;color:var(--text)" id="ep-title">Update Product</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>
      <div id="ep-error" class="banner banner-error"><span></span></div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <input type="hidden" id="ep-product-id"/>
        <div>
          <label class="field-label">Card/Strip Price (₦) <span style="font-size:11px;color:var(--muted);">selling price per card</span></label>
          <input class="field-input" id="ep-price" type="number" placeholder="0.00" min="0" step="0.01"/>
          <p class="field-hint hint-error" id="ep-price-hint"></p>
        </div>

        <!-- Cut drug toggle -->
        <div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--surface2);
                    border:1px solid var(--border2);border-radius:8px;">
          <input type="checkbox" id="ep-cuttable" style="width:16px;height:16px;cursor:pointer;"/>
          <div>
            <label for="ep-cuttable" style="font-size:13px;font-weight:500;color:var(--text);cursor:pointer;">
              Sold in cuts (sub-units)
            </label>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">
              e.g. sell 3 tablets from a strip of 10
            </div>
          </div>
        </div>

        <div class="cut-fields" id="ep-cut-fields">
          <div class="ap-grid-2">
            <div>
              <label class="field-label">Sub-unit name</label>
              <input class="field-input" id="ep-sub-unit" type="text" placeholder="e.g. tablet, capsule"/>
              <p class="field-hint hint-error" id="ep-sub-unit-hint"></p>
            </div>
            <div>
              <label class="field-label">Pieces per card/strip</label>
              <input class="field-input" id="ep-pieces" type="number" min="1" placeholder="e.g. 10"/>
              <p class="field-hint hint-error" id="ep-pieces-hint"></p>
            </div>
          </div>
          <div>
            <label class="field-label">Cut selling price (₦) <span style="font-size:11px;color:var(--muted);">price per tablet/capsule</span></label>
            <input class="field-input" id="ep-cut-price" type="number" placeholder="0.00" min="0" step="0.01"/>
            <p class="field-hint hint-error" id="ep-cut-price-hint"></p>
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button type="button" data-close-modal class="btn btn-ghost">Cancel</button>
          <button id="ep-submit" class="btn btn-primary">Save Changes</button>
        </div>
      </div>
    </div>
  </div>`;
}

export async function initProducts() {
  bindSidebar();
  bindModalClose('add-product-modal');
  bindModalClose('edit-product-modal');

  document.getElementById('ap-cuttable')?.addEventListener('change', (e) => {
    document.getElementById('ap-cut-fields').classList.toggle('visible', e.target.checked);
  });

  document.getElementById('ep-cuttable')?.addEventListener('change', (e) => {
    document.getElementById('ep-cut-fields').classList.toggle('visible', e.target.checked);
  });

  document.getElementById('add-product-btn')?.addEventListener('click', () => {
    document.getElementById('ap-name').value       = '';
    document.getElementById('ap-price').value      = '';
    document.getElementById('ap-desc').value       = '';
    document.getElementById('ap-cuttable').checked = false;
    document.getElementById('ap-sub-unit').value   = '';
    document.getElementById('ap-pieces').value     = '';
    document.getElementById('ap-cut-price').value  = '';
    document.getElementById('ap-cut-fields').classList.remove('visible');
    document.getElementById('ap-error').classList.remove('show');
    openModal('add-product-modal');
  });

  document.getElementById('ap-submit')?.addEventListener('click', submitAddProduct);
  document.getElementById('ep-submit')?.addEventListener('click', submitEditProduct);

  await loadProducts();
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
      <td>${p.price != null ? fmt(p.price) : '—'}</td>
      <td style="font-size:12px;color:var(--muted);">
        ${p.is_cuttable
          ? `<span class="badge badge-green">Per ${p.sub_unit || 'sub-unit'} @ ₦${p.cut_selling_price != null ? fmt(p.cut_selling_price) : '?'} (${p.pieces_per_unit || '?'}/card)</span>`
          : '<span class="badge">Whole card only</span>'}
      </td>
      <td style="color:var(--muted);font-size:12px;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${p.description || '—'}
      </td>
      <td>
        <span class="badge ${p.is_active !== false ? 'badge-green' : 'badge-red'}">
          ${p.is_active !== false ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>
        <button class="btn btn-ghost edit-product-btn" data-id="${p.product_id}"
          style="font-size:11px;padding:5px 10px;white-space:nowrap;">
          Edit
        </button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.edit-product-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
  });
}

async function openEditModal(productId) {
  try {
    const p = await api.get(`/product/${productId}/details`);
    document.getElementById('ep-product-id').value    = p.id;
    document.getElementById('ep-title').textContent   = `Update — ${p.name}`;
    document.getElementById('ep-price').value         = p.price;
    document.getElementById('ep-cuttable').checked    = p.is_cuttable;
    document.getElementById('ep-sub-unit').value      = p.sub_unit || '';
    document.getElementById('ep-pieces').value        = p.pieces_per_unit || '';
    document.getElementById('ep-cut-price').value     = p.cut_selling_price || '';
    document.getElementById('ep-cut-fields').classList.toggle('visible', p.is_cuttable);
    document.getElementById('ep-error').classList.remove('show');
    openModal('edit-product-modal');
  } catch (err) {
    alert(err.message);
  }
}

async function submitAddProduct() {
  const errEl = document.getElementById('ap-error');
  const btn   = document.getElementById('ap-submit');
  errEl.classList.remove('show');

  const name       = document.getElementById('ap-name').value.trim();
  const price      = parseFloat(document.getElementById('ap-price').value);
  const desc       = document.getElementById('ap-desc').value.trim();
  const active     = document.getElementById('ap-active').value === 'true';
  const isCuttable = document.getElementById('ap-cuttable').checked;
  const subUnit    = document.getElementById('ap-sub-unit').value.trim();
  const pieces     = parseInt(document.getElementById('ap-pieces').value);
  const cutPrice   = parseFloat(document.getElementById('ap-cut-price').value);

  let ok = true;
  if (!name)              { document.getElementById('ap-name-hint').textContent  = 'Name is required.';          ok = false; }
  else                    { document.getElementById('ap-name-hint').textContent  = ''; }
  if (!price || price <= 0) { document.getElementById('ap-price-hint').textContent = 'Enter a valid price.';     ok = false; }
  else                    { document.getElementById('ap-price-hint').textContent = ''; }
  if (!desc)              { document.getElementById('ap-desc-hint').textContent  = 'Description is required.';   ok = false; }
  else                    { document.getElementById('ap-desc-hint').textContent  = ''; }
  if (isCuttable) {
    if (!subUnit)         { document.getElementById('ap-sub-unit-hint').textContent  = 'Sub-unit is required.';  ok = false; }
    else                  { document.getElementById('ap-sub-unit-hint').textContent  = ''; }
    if (!pieces || pieces < 1) { document.getElementById('ap-pieces-hint').textContent = 'Enter pieces per card.'; ok = false; }
    else                  { document.getElementById('ap-pieces-hint').textContent  = ''; }
    if (!cutPrice || cutPrice <= 0) { document.getElementById('ap-cut-price-hint').textContent = 'Enter cut selling price.'; ok = false; }
    else                  { document.getElementById('ap-cut-price-hint').textContent = ''; }
  }
  if (!ok) return;

  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Creating…';
  try {
    await api.post('/product/create', {
      name,
      price,
      is_active:         active,
      description:       desc,
      is_cuttable:       isCuttable,
      sub_unit:          isCuttable ? subUnit   : null,
      pieces_per_unit:   isCuttable ? pieces    : null,
      cut_selling_price: isCuttable ? cutPrice  : null,
    });
    closeModal('add-product-modal');
    await loadProducts();
  } catch (err) {
    errEl.querySelector('span').textContent = err.message;
    errEl.classList.add('show');
  } finally {
    btn.disabled = false; btn.innerHTML = 'Create Product';
  }
}

async function submitEditProduct() {
  const errEl = document.getElementById('ep-error');
  const btn   = document.getElementById('ep-submit');
  errEl.classList.remove('show');

  const id         = document.getElementById('ep-product-id').value;
  const price      = parseFloat(document.getElementById('ep-price').value);
  const isCuttable = document.getElementById('ep-cuttable').checked;
  const subUnit    = document.getElementById('ep-sub-unit').value.trim();
  const pieces     = parseInt(document.getElementById('ep-pieces').value);
  const cutPrice   = parseFloat(document.getElementById('ep-cut-price').value);

  let ok = true;
  if (!price || price <= 0) { document.getElementById('ep-price-hint').textContent = 'Enter a valid price.'; ok = false; }
  else                      { document.getElementById('ep-price-hint').textContent = ''; }
  if (isCuttable) {
    if (!subUnit)    { document.getElementById('ep-sub-unit-hint').textContent  = 'Sub-unit is required.';   ok = false; }
    else             { document.getElementById('ep-sub-unit-hint').textContent  = ''; }
    if (!pieces || pieces < 1) { document.getElementById('ep-pieces-hint').textContent = 'Enter pieces per card.'; ok = false; }
    else             { document.getElementById('ep-pieces-hint').textContent  = ''; }
    if (!cutPrice || cutPrice <= 0) { document.getElementById('ep-cut-price-hint').textContent = 'Enter cut selling price.'; ok = false; }
    else             { document.getElementById('ep-cut-price-hint').textContent = ''; }
  }
  if (!ok) return;

  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';
  try {
    await api.patch(`/product/update/${id}`, {
      price,
      is_cuttable:       isCuttable,
      sub_unit:          isCuttable ? subUnit  : null,
      pieces_per_unit:   isCuttable ? pieces   : null,
      cut_selling_price: isCuttable ? cutPrice : null,
    });
    closeModal('edit-product-modal');
    await loadProducts();
  } catch (err) {
    errEl.querySelector('span').textContent = err.message;
    errEl.classList.add('show');
  } finally {
    btn.disabled = false; btn.innerHTML = 'Save Changes';
  }
}

function bindSearch() {
  document.getElementById('product-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    renderTable(q ? allProducts.filter(p => p.product_name.toLowerCase().includes(q)) : allProducts);
  });
}