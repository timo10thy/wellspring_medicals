import { api }                                     from '../js/api.js';
import { renderSidebar, renderTopbar, bindSidebar,
         openModal, closeModal, bindModalClose,
         fmt, fmtDate, tableLoadingRow, tableEmptyRow,
         icons }                                   from '../js/ui.js';

export function renderStock() {
  return `
  <style>
    .as-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .as-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    @media (max-width: 768px) {
      .as-grid-2 { grid-template-columns: 1fr !important; }
      .as-grid-3 { grid-template-columns: 1fr !important; }
    }

    /* Mode toggle */
    .entry-mode-toggle {
      display: flex;
      background: var(--surface2);
      border: 1px solid var(--border2);
      border-radius: 8px;
      padding: 3px;
      gap: 3px;
      margin-bottom: 16px;
    }
    .entry-mode-btn {
      flex: 1;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 500;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      background: none;
      color: var(--muted);
      transition: all .15s;
      font-family: var(--font-body);
    }
    .entry-mode-btn.active {
      background: var(--accent);
      color: #fff;
    }

    /* Calculation preview box */
    .calc-preview {
      background: var(--surface2);
      border: 1px solid var(--border2);
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 12px;
      display: none;
    }
    .calc-preview.show { display: block; }
    .calc-preview-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      color: var(--muted);
    }
    .calc-preview-row strong { color: var(--accent-lt); font-size: 13px; }
  </style>

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
          <button id="add-stock-btn" class="btn btn-primary">${icons.plus} Add Stock</button>
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
      <div id="as-error"   class="banner banner-error"><span></span></div>
      <div id="as-success" class="banner banner-success"><span>Stock added successfully.</span></div>

      <form id="add-stock-form" novalidate style="display:flex;flex-direction:column;gap:14px;">

        <!-- Product name -->
        <div>
          <label class="field-label">Product Name</label>
          <input class="field-input" id="as-product-name" type="text" placeholder="e.g. Paracetamol 500mg"/>
          <p class="field-hint hint-error" id="as-pid-hint"></p>
        </div>

        <!-- Entry mode toggle -->
        <div>
          <label class="field-label" style="margin-bottom:6px;">Entry Mode</label>
          <div class="entry-mode-toggle">
            <button type="button" class="entry-mode-btn active" data-mode="units">
              📦 Units (direct)
            </button>
            <button type="button" class="entry-mode-btn" data-mode="packs">
              🗂️ Packs → Units
            </button>
          </div>
        </div>

        <!-- ── UNITS MODE ── -->
        <div id="mode-units">
          <div class="as-grid-2">
            <div>
              <label class="field-label">Quantity (units)</label>
              <input class="field-input" id="as-qty" type="number" placeholder="e.g. 100" min="1"/>
              <p class="field-hint hint-error" id="as-qty-hint"></p>
            </div>
            <div>
              <label class="field-label">Cost Price per Unit (₦)</label>
              <input class="field-input" id="as-cost" type="number" placeholder="e.g. 137.00" min="0.01" step="0.01"/>
              <p class="field-hint hint-error" id="as-cost-hint"></p>
            </div>
          </div>
        </div>

        <!-- ── PACKS MODE ── -->
        <div id="mode-packs" style="display:none;">
          <div class="as-grid-3" style="margin-bottom:12px;">
            <div>
              <label class="field-label">No. of Packs</label>
              <input class="field-input" id="as-packs" type="number" placeholder="e.g. 1" min="1"/>
              <p class="field-hint hint-error" id="as-packs-hint"></p>
            </div>
            <div>
              <label class="field-label">Units per Pack</label>
              <input class="field-input" id="as-units-per-pack" type="number" placeholder="e.g. 8" min="1"/>
              <p class="field-hint hint-error" id="as-upp-hint"></p>
            </div>
            <div>
              <label class="field-label">Cost per Pack (₦)</label>
              <input class="field-input" id="as-pack-cost" type="number" placeholder="e.g. 1096.00" min="0.01" step="0.01"/>
              <p class="field-hint hint-error" id="as-pack-cost-hint"></p>
            </div>
          </div>

          <!-- Live calculation preview -->
          <div class="calc-preview" id="calc-preview">
            <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:6px;letter-spacing:.04em;">CALCULATED VALUES</div>
            <div class="calc-preview-row">
              <span>Total units to stock</span>
              <strong id="calc-total-units">—</strong>
            </div>
            <div class="calc-preview-row">
              <span>Cost price per unit</span>
              <strong id="calc-unit-cost">—</strong>
            </div>
            <div class="calc-preview-row">
              <span>Total stock value</span>
              <strong id="calc-total-value">—</strong>
            </div>
          </div>
        </div>

        <!-- Expiry date (shared) -->
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
    ['as-pid-hint','as-qty-hint','as-cost-hint','as-packs-hint','as-upp-hint','as-pack-cost-hint']
      .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
    // Reset to units mode
    setMode('units');
    document.getElementById('calc-preview').classList.remove('show');
    openModal('add-stock-modal');
  });

  await loadStock();
  bindSearch();
  bindAddStock();
  bindModeToggle();
  bindPackInputs();
}

// ── Mode toggle ───────────────────────────────────────────────────────────────
let currentMode = 'units';

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.entry-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  document.getElementById('mode-units').style.display = mode === 'units' ? 'block' : 'none';
  document.getElementById('mode-packs').style.display = mode === 'packs' ? 'block' : 'none';
}

function bindModeToggle() {
  document.querySelectorAll('.entry-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
}

// ── Pack inputs: live calculation preview ─────────────────────────────────────
function bindPackInputs() {
  ['as-packs', 'as-units-per-pack', 'as-pack-cost'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateCalcPreview);
  });
}

function updateCalcPreview() {
  const packs      = parseFloat(document.getElementById('as-packs').value);
  const upp        = parseFloat(document.getElementById('as-units-per-pack').value);
  const packCost   = parseFloat(document.getElementById('as-pack-cost').value);
  const preview    = document.getElementById('calc-preview');

  if (!packs || !upp || !packCost || packs <= 0 || upp <= 0 || packCost <= 0) {
    preview.classList.remove('show');
    return;
  }

  const totalUnits  = Math.round(packs * upp);
  const unitCost    = packCost / upp;
  const totalValue  = packs * packCost;

  document.getElementById('calc-total-units').textContent = `${totalUnits} units`;
  document.getElementById('calc-unit-cost').textContent   = `₦${fmt(unitCost)}`;
  document.getElementById('calc-total-value').textContent = `₦${fmt(totalValue)}`;
  preview.classList.add('show');
}

// ── Load stock ────────────────────────────────────────────────────────────────
async function loadStock(query = '') {
  try {
    const url  = query
      ? `/stock/total/search?product_name=${encodeURIComponent(query)}`
      : '/stock/stock/total';
    const data = await api.get(url);
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

// ── Add stock submit ──────────────────────────────────────────────────────────
function bindAddStock() {
  document.getElementById('add-stock-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('as-error');
    const sucEl = document.getElementById('as-success');
    const btn   = document.getElementById('as-submit');
    errEl.classList.remove('show');
    sucEl.classList.remove('show');

    const productName = document.getElementById('as-product-name').value.trim();
    const expiry      = document.getElementById('as-expiry').value || null;

    let finalQty  = null;
    let finalCost = null;
    let ok        = true;

    // Validate product name
    if (!productName) {
      document.getElementById('as-pid-hint').textContent = 'Enter a product name.';
      ok = false;
    } else {
      document.getElementById('as-pid-hint').textContent = '';
    }

    if (currentMode === 'units') {
      // ── Units mode validation ──
      const qty  = parseInt(document.getElementById('as-qty').value);
      const cost = parseFloat(document.getElementById('as-cost').value);

      if (isNaN(qty) || qty < 1) {
        document.getElementById('as-qty-hint').textContent = 'Quantity must be at least 1.';
        ok = false;
      } else {
        document.getElementById('as-qty-hint').textContent = '';
      }

      if (isNaN(cost) || cost <= 0) {
        document.getElementById('as-cost-hint').textContent = 'Enter a valid cost price greater than 0.';
        ok = false;
      } else {
        document.getElementById('as-cost-hint').textContent = '';
      }

      finalQty  = qty;
      finalCost = cost;

    } else {
      // ── Packs mode validation ──
      const packs    = parseFloat(document.getElementById('as-packs').value);
      const upp      = parseFloat(document.getElementById('as-units-per-pack').value);
      const packCost = parseFloat(document.getElementById('as-pack-cost').value);

      if (isNaN(packs) || packs < 1) {
        document.getElementById('as-packs-hint').textContent = 'Enter at least 1 pack.';
        ok = false;
      } else {
        document.getElementById('as-packs-hint').textContent = '';
      }

      if (isNaN(upp) || upp < 1) {
        document.getElementById('as-upp-hint').textContent = 'Enter units per pack (at least 1).';
        ok = false;
      } else {
        document.getElementById('as-upp-hint').textContent = '';
      }

      if (isNaN(packCost) || packCost <= 0) {
        document.getElementById('as-pack-cost-hint').textContent = 'Enter a valid pack cost greater than 0.';
        ok = false;
      } else {
        document.getElementById('as-pack-cost-hint').textContent = '';
      }

      if (ok) {
        finalQty  = Math.round(packs * upp);   // total units
        finalCost = packCost / upp;             // cost per unit
      }
    }

    if (!ok) return;

    // Final safety check — should never happen but just in case
    if (finalQty < 1) {
      errEl.querySelector('span').textContent = 'Total quantity must be at least 1.';
      errEl.classList.add('show');
      return;
    }
    if (finalCost <= 0) {
      errEl.querySelector('span').textContent = 'Unit cost price must be greater than 0.';
      errEl.classList.add('show');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Adding…';

    try {
      await api.post('/stock/add/stock', {
        product_name: productName,
        quantity:     finalQty,
        cost_price:   finalCost,
        expiry_date:  expiry,
      });
      sucEl.classList.add('show');
      e.target.reset();
      document.getElementById('calc-preview').classList.remove('show');
      setMode('units');
      await loadStock();
      setTimeout(() => {
        sucEl.classList.remove('show');
        closeModal('add-stock-modal');
      }, 1500);
    } catch (err) {
      errEl.querySelector('span').textContent = err.message;
      errEl.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Add Stock';
    }
  });
}