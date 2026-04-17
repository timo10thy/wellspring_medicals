// ── Purchase Receipts Page ────────────────────────────────────────────────────
// POST /purchase-receipts/create
// GET  /purchase-receipts/all
// GET  /purchase-receipts/{id}
// GET  /purchase-receipts/search/supplier?supplier_name=
// DELETE /purchase-receipts/delete/{id}

import { api }                                         from '../js/api.js';
import { renderSidebar, renderTopbar, bindSidebar,
         openModal, closeModal, bindModalClose,
         fmt, fmtDateTime, icons }                     from '../js/ui.js';

const PAYMENTS = ['CASH','TRANSFER','POS'];

// ── Render ────────────────────────────────────────────────────────────────────
export function renderPurchases() {
  return `
  <div class="page-enter app-layout">
    ${renderSidebar('purchases')}
    <div class="main-content">
      ${renderTopbar('Purchase Receipts', 'Record and manage restock purchases')}
      <div class="page-body">

        <!-- Actions row -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
          <div style="display:flex;gap:8px;align-items:center;flex:1;min-width:200px;">
            <input class="field-input" id="supplier-search" type="text" placeholder="Search by supplier name…" style="max-width:280px;"/>
            <button id="supplier-search-btn" class="btn btn-ghost">${icons.search} Search</button>
            <button id="clear-search-btn" class="btn btn-ghost" style="display:none;">Clear</button>
          </div>
          <button id="new-receipt-btn" class="btn btn-primary">${icons.plus} New Receipt</button>
        </div>

        <!-- Receipts list -->
        <div class="card" style="overflow:hidden;">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);">
            <span style="font-size:13px;font-weight:500;color:var(--text)">Purchase Records</span>
          </div>
          <div id="receipts-list" style="padding:40px;text-align:center;color:var(--muted);font-size:13px;">
            <span class="spinner" style="border-top-color:var(--accent)"></span>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Receipt Detail Modal -->
  <div id="receipt-detail-modal" class="modal-backdrop">
    <div class="modal" style="max-width:580px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 style="font-family:var(--font-head);font-size:20px;color:var(--text)">Receipt Detail</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>
      <div id="receipt-detail-body"></div>
    </div>
  </div>

  <!-- New Receipt Modal -->
  <div id="new-receipt-modal" class="modal-backdrop">
    <div class="modal" style="max-width:580px;max-height:90vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 style="font-family:var(--font-head);font-size:20px;color:var(--text)">New Purchase Receipt</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>

      <div id="nr-error"   class="banner banner-error"><span></span></div>
      <div id="nr-success" class="banner banner-success"><span>Receipt created!</span></div>

      <form id="new-receipt-form" novalidate style="display:flex;flex-direction:column;gap:14px;">

        <!-- Supplier info -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label class="field-label">Supplier Name</label>
            <input class="field-input" id="nr-supplier-name" type="text" placeholder="e.g. Emzor Pharma"/>
            <p class="field-hint hint-error" id="nr-supplier-name-hint"></p>
          </div>
          <div>
            <label class="field-label">Supplier Contact</label>
            <input class="field-input" id="nr-supplier-contact" type="text" placeholder="e.g. 08012345678"/>
            <p class="field-hint hint-error" id="nr-supplier-contact-hint"></p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label class="field-label">Payment Type</label>
            <select class="field-input" id="nr-payment">
              <option value="">Select…</option>
              ${PAYMENTS.map(p => `<option value="${p}">${p}</option>`).join('')}
            </select>
            <p class="field-hint hint-error" id="nr-payment-hint"></p>
          </div>
          <div>
            <label class="field-label">Purchase Date</label>
            <input class="field-input" id="nr-date" type="date"/>
            <p class="field-hint hint-error" id="nr-date-hint"></p>
          </div>
        </div>

        <div>
          <label class="field-label">Notes <span style="color:var(--muted)">(optional)</span></label>
          <input class="field-input" id="nr-notes" type="text" placeholder="Any additional notes…"/>
        </div>

        <!-- Line items -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <label class="field-label" style="margin:0;">Items</label>
            <button type="button" id="add-item-btn" class="btn btn-ghost" style="font-size:12px;padding:5px 12px;">
              ${icons.plus} Add Item
            </button>
          </div>
          <div id="items-container" style="display:flex;flex-direction:column;gap:10px;"></div>
          <p class="field-hint hint-error" id="nr-items-hint"></p>
        </div>

        <!-- Total preview -->
        <div id="nr-total-preview" style="display:none;background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;color:var(--muted);">Total Cost</span>
            <span id="nr-total-val" style="font-family:var(--font-head);font-size:24px;color:var(--accent-lt);">₦0.00</span>
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
          <button type="button" data-close-modal class="btn btn-ghost">Cancel</button>
          <button type="submit" id="nr-submit" class="btn btn-primary">Save Receipt</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Delete Confirm Modal -->
  <div id="delete-receipt-modal" class="modal-backdrop">
    <div class="modal" style="max-width:400px;">
      <div style="margin-bottom:16px;">
        <h2 style="font-family:var(--font-head);font-size:18px;color:var(--text)">Delete Receipt?</h2>
        <p style="font-size:13px;color:var(--muted);margin-top:8px;">This will delete the receipt and all its line items. This cannot be undone.</p>
      </div>
      <div id="del-receipt-error" class="banner banner-error"><span></span></div>
      <input type="hidden" id="del-receipt-id"/>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button data-close-modal class="btn btn-ghost">Cancel</button>
        <button id="del-receipt-confirm" class="btn btn-danger">Delete</button>
      </div>
    </div>
  </div>`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
let itemCount = 0;

export function initPurchases() {
  bindSidebar();
  bindModalClose('new-receipt-modal');
  bindModalClose('receipt-detail-modal');
  bindModalClose('delete-receipt-modal');

  loadReceipts();

  document.getElementById('new-receipt-btn')?.addEventListener('click', () => {
    resetReceiptForm();
    addItem(); // start with one item row
    openModal('new-receipt-modal');
  });

  document.getElementById('add-item-btn')?.addEventListener('click', addItem);
  document.getElementById('new-receipt-form')?.addEventListener('submit', submitReceipt);
  document.getElementById('del-receipt-confirm')?.addEventListener('click', confirmDeleteReceipt);

  document.getElementById('supplier-search-btn')?.addEventListener('click', () => {
    const q = document.getElementById('supplier-search').value.trim();
    loadReceipts(q);
    document.getElementById('clear-search-btn').style.display = q ? 'inline-flex' : 'none';
  });

  document.getElementById('supplier-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('supplier-search-btn')?.click();
  });

  document.getElementById('clear-search-btn')?.addEventListener('click', () => {
    document.getElementById('supplier-search').value = '';
    document.getElementById('clear-search-btn').style.display = 'none';
    loadReceipts();
  });
}

// ── Load receipts ─────────────────────────────────────────────────────────────
async function loadReceipts(supplier = '') {
  const el = document.getElementById('receipts-list');
  el.innerHTML = `<span class="spinner" style="border-top-color:var(--accent)"></span>`;

  try {
    const url  = supplier
      ? `/purchase-receipts/search/supplier?supplier_name=${encodeURIComponent(supplier)}`
      : '/purchase-receipts/all';
    const data = await api.get(url);

    if (!data.length) {
      el.innerHTML = supplier
        ? `No receipts found for "<strong>${supplier}</strong>".`
        : 'No purchase receipts recorded yet.';
      return;
    }

    el.innerHTML = `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:var(--surface2);text-align:left;">
              ${['Receipt No.','Supplier','Payment','Items','Total Cost','Date',''].map(h =>
                `<th style="padding:10px 14px;color:var(--muted);font-weight:500;border-bottom:1px solid var(--border);">${h}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(r => `
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:10px 14px;font-weight:500;color:var(--accent-lt);">${r.receipt_number}</td>
                <td style="padding:10px 14px;color:var(--text);">${r.supplier_name}</td>
                <td style="padding:10px 14px;">${r.payment_type}</td>
                <td style="padding:10px 14px;color:var(--muted);">${r.item_count} item${r.item_count !== 1 ? 's' : ''}</td>
                <td style="padding:10px 14px;font-weight:500;color:var(--text);">₦${fmt(r.total_cost)}</td>
                <td style="padding:10px 14px;color:var(--muted);">${r.purchase_date}</td>
                <td style="padding:10px 14px;">
                  <div style="display:flex;gap:6px;">
                    <button class="btn btn-ghost view-receipt-btn" style="font-size:11px;padding:4px 10px;" data-id="${r.id}">View</button>
                    <button class="btn btn-danger del-receipt-btn" style="font-size:11px;padding:4px 10px;" data-id="${r.id}">Delete</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    el.querySelectorAll('.view-receipt-btn').forEach(btn => {
      btn.addEventListener('click', () => viewReceipt(parseInt(btn.dataset.id)));
    });

    el.querySelectorAll('.del-receipt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('del-receipt-id').value = btn.dataset.id;
        document.getElementById('del-receipt-error').classList.remove('show');
        openModal('delete-receipt-modal');
      });
    });

  } catch (err) {
    el.innerHTML = `<span style="color:#f87171">${err.message}</span>`;
  }
}

// ── View receipt detail ───────────────────────────────────────────────────────
async function viewReceipt(id) {
  const body = document.getElementById('receipt-detail-body');
  body.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;">
    <span class="spinner" style="border-top-color:var(--accent)"></span> Loading…</div>`;
  openModal('receipt-detail-modal');

  try {
    const r = await api.get(`/purchase-receipts/${id}`);
    body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div style="font-family:var(--font-head);font-size:15px;color:var(--text)">${r.receipt_number}</div>
        <span class="badge badge-green">Completed</span>
      </div>
      ${detailRow('Supplier',      r.supplier_name)}
      ${detailRow('Contact',       r.supplier_contact)}
      ${detailRow('Payment',       r.payment_type)}
      ${detailRow('Purchase Date', r.purchase_date)}
      ${detailRow('Total Cost',    `<strong style="color:var(--accent-lt)">₦${fmt(r.total_cost)}</strong>`)}
      ${r.notes ? detailRow('Notes', r.notes) : ''}

      <div style="margin-top:18px;">
        <div style="font-size:12px;font-weight:500;color:var(--muted);margin-bottom:10px;">LINE ITEMS</div>
        ${r.items.map(item => `
          <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:12px 14px;margin-bottom:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <span style="font-size:13px;font-weight:500;color:var(--text)">${item.product_name_snapshot}</span>
              <span style="font-size:13px;font-weight:500;color:var(--accent-lt)">₦${fmt(item.total_line_cost)}</span>
            </div>
            <div style="font-size:11px;color:var(--muted);display:flex;gap:16px;flex-wrap:wrap;">
              <span>Qty: <strong>${item.quantity_purchased}</strong></span>
              <span>Unit cost: <strong>₦${fmt(item.unit_cost)}</strong></span>
              ${item.expiry_date ? `<span>Expiry: <strong>${item.expiry_date}</strong></span>` : ''}
              ${item.restock_level ? `<span>Restock at: <strong>${item.restock_level} units</strong></span>` : ''}
            </div>
          </div>`).join('')}
      </div>`;
  } catch (err) {
    body.innerHTML = `<span style="color:#f87171;font-size:13px;">${err.message}</span>`;
  }
}

// ── Add item row ──────────────────────────────────────────────────────────────
function addItem() {
  const idx       = itemCount++;
  const container = document.getElementById('items-container');
  const div       = document.createElement('div');
  div.dataset.idx = idx;
  div.style.cssText = 'background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:12px;position:relative;';
  div.innerHTML = `
    <button type="button" class="remove-item-btn btn btn-ghost"
      style="position:absolute;top:8px;right:8px;padding:3px 8px;font-size:11px;">✕</button>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div>
        <label class="field-label">Product Name</label>
        <input class="field-input item-name" type="text" placeholder="e.g. Paracetamol 500mg"/>
      </div>
      <div>
        <label class="field-label">Product ID</label>
        <input class="field-input item-product-id" type="number" placeholder="Product ID" min="1"/>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
      <div>
        <label class="field-label">Quantity</label>
        <input class="field-input item-qty" type="number" placeholder="0" min="1"/>
      </div>
      <div>
        <label class="field-label">Unit Cost (₦)</label>
        <input class="field-input item-cost" type="number" placeholder="0.00" min="0.01" step="0.01"/>
      </div>
      <div>
        <label class="field-label">Expiry Date <span style="color:var(--muted)">(opt)</span></label>
        <input class="field-input item-expiry" type="date"/>
      </div>
    </div>
    <div style="margin-top:10px;">
      <label class="field-label">Restock Level <span style="color:var(--muted)">(opt – min qty before reorder)</span></label>
      <input class="field-input item-restock" type="number" placeholder="e.g. 10" min="1"/>
    </div>`;

  div.querySelector('.remove-item-btn').addEventListener('click', () => {
    div.remove();
    updateTotal();
  });

  div.querySelectorAll('.item-qty, .item-cost').forEach(el =>
    el.addEventListener('input', updateTotal)
  );

  container.appendChild(div);
  updateTotal();
}

function updateTotal() {
  const items   = gatherItems();
  const total   = items.reduce((sum, i) => sum + (i.qty * i.cost || 0), 0);
  const preview = document.getElementById('nr-total-preview');
  const val     = document.getElementById('nr-total-val');

  if (total > 0) {
    preview.style.display = 'block';
    val.textContent = `₦${fmt(total)}`;
  } else {
    preview.style.display = 'none';
  }
}

function gatherItems() {
  return [...document.querySelectorAll('#items-container > div')].map(div => ({
    product_id:           parseInt(div.querySelector('.item-product-id')?.value) || null,
    product_name_snapshot: div.querySelector('.item-name')?.value.trim() || '',
    qty:                  parseInt(div.querySelector('.item-qty')?.value) || 0,
    cost:                 parseFloat(div.querySelector('.item-cost')?.value) || 0,
    expiry_date:          div.querySelector('.item-expiry')?.value || null,
    restock_level:        parseInt(div.querySelector('.item-restock')?.value) || null,
  }));
}

// ── Submit receipt ────────────────────────────────────────────────────────────
async function submitReceipt(e) {
  e.preventDefault();
  const errEl = document.getElementById('nr-error');
  const sucEl = document.getElementById('nr-success');
  const btn   = document.getElementById('nr-submit');
  errEl.classList.remove('show');
  sucEl.classList.remove('show');

  const supplierName    = document.getElementById('nr-supplier-name').value.trim();
  const supplierContact = document.getElementById('nr-supplier-contact').value.trim();
  const payment         = document.getElementById('nr-payment').value;
  const date            = document.getElementById('nr-date').value;

  // Validate header
  let valid = true;
  if (!supplierName) {
    document.getElementById('nr-supplier-name-hint').textContent = 'Required.'; valid = false;
  } else document.getElementById('nr-supplier-name-hint').textContent = '';
  if (!supplierContact) {
    document.getElementById('nr-supplier-contact-hint').textContent = 'Required.'; valid = false;
  } else document.getElementById('nr-supplier-contact-hint').textContent = '';
  if (!payment) {
    document.getElementById('nr-payment-hint').textContent = 'Select a payment type.'; valid = false;
  } else document.getElementById('nr-payment-hint').textContent = '';
  if (!date) {
    document.getElementById('nr-date-hint').textContent = 'Select a date.'; valid = false;
  } else document.getElementById('nr-date-hint').textContent = '';

  // Validate items
  const rawItems = gatherItems();
  if (!rawItems.length) {
    document.getElementById('nr-items-hint').textContent = 'Add at least one item.'; valid = false;
  } else {
    const badItem = rawItems.find(i => !i.product_name_snapshot || !i.product_id || i.qty <= 0 || i.cost <= 0);
    if (badItem) {
      document.getElementById('nr-items-hint').textContent = 'Fill in all item fields (name, product ID, qty, cost).';
      valid = false;
    } else document.getElementById('nr-items-hint').textContent = '';
  }

  if (!valid) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving…';

  try {
    await api.post('/purchase-receipts/create', {
      supplier_name:    supplierName,
      supplier_contact: supplierContact,
      payment_type:     payment,
      purchase_date:    date,
      notes:            document.getElementById('nr-notes').value || null,
      items: rawItems.map(i => ({
        product_id:            i.product_id,
        product_name_snapshot: i.product_name_snapshot,
        quantity_purchased:    i.qty,
        unit_cost:             i.cost,
        expiry_date:           i.expiry_date || null,
        restock_level:         i.restock_level || null,
      })),
    });

    sucEl.classList.add('show');
    await loadReceipts();
    setTimeout(() => closeModal('new-receipt-modal'), 1200);

  } catch (err) {
    errEl.querySelector('span').textContent = err.message;
    errEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Receipt';
  }
}

// ── Delete receipt ────────────────────────────────────────────────────────────
async function confirmDeleteReceipt() {
  const id    = document.getElementById('del-receipt-id').value;
  const errEl = document.getElementById('del-receipt-error');
  const btn   = document.getElementById('del-receipt-confirm');
  errEl.classList.remove('show');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    await api.delete(`/purchase-receipts/delete/${id}`);
    closeModal('delete-receipt-modal');
    await loadReceipts();
  } catch (err) {
    errEl.querySelector('span').textContent = err.message;
    errEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function detailRow(label, value) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;
    padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;">
    <span style="color:var(--muted)">${label}</span><span>${value}</span>
  </div>`;
}

function resetReceiptForm() {
  itemCount = 0;
  document.getElementById('nr-supplier-name').value    = '';
  document.getElementById('nr-supplier-contact').value = '';
  document.getElementById('nr-payment').value          = '';
  document.getElementById('nr-date').value             = '';
  document.getElementById('nr-notes').value            = '';
  document.getElementById('items-container').innerHTML = '';
  document.getElementById('nr-total-preview').style.display = 'none';
  ['nr-supplier-name-hint','nr-supplier-contact-hint','nr-payment-hint','nr-date-hint','nr-items-hint']
    .forEach(id => { document.getElementById(id).textContent = ''; });
  document.getElementById('nr-error').classList.remove('show');
  document.getElementById('nr-success').classList.remove('show');
}