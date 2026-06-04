import { api } from '../js/api.js';
import { generateTxnId, queueSale, syncPendingSales, getFailedSales,
         discardSale, cacheProducts, searchProductsOffline, getCachedProduct } from '../js/offline.js';
import { renderSidebar, renderTopbar, bindSidebar,
         openModal, closeModal, bindModalClose,
         fmt, fmtDateTime, icons } from '../js/ui.js';
import { printReceipt, downloadReceiptPDF } from './receipt.js';

function isAdmin() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.role === 'ADMIN';
}
function currentUsername() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.username || '';
}

let cart              = [];
let pendingVoidSaleId = null;
let pendingVoidReqId  = null;
let activeShift       = null;

export function renderSales() {
  return `
  <div class="page-enter app-layout">
    ${renderSidebar('sales')}
    <div class="main-content">
      ${renderTopbar('Sales', 'Record sales and issue receipts')}
      <div class="page-body">

        ${!isAdmin() ? `<div id="shift-status-banner" style="margin-bottom:20px;"></div>` : ''}

        <div id="sync-banner" style="display:none;margin-bottom:16px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;">
            <div id="sync-banner-msg" style="font-size:13px;font-weight:500;color:#166534;">
              Syncing offline sales...
            </div>
          </div>
        </div>

        <div id="failed-sales-section" style="display:none;margin-bottom:24px;">
          <div class="card" style="padding:20px;">
            <div style="font-size:13px;font-weight:500;color:#dc2626;margin-bottom:14px;">
              Offline Sales Failed to Sync
            </div>
            <div id="failed-sales-list"></div>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <p style="font-size:13px;color:var(--muted)">Record a new sale or look up an existing receipt.</p>
          <button id="new-sale-btn" class="btn btn-primary">${icons.plus} New Sale</button>
        </div>

        <div id="void-requests-section" style="display:none;margin-bottom:24px;">
          <div class="card" style="padding:20px;">
            <div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:14px;">
              Pending Void Requests
            </div>
            <div id="void-requests-list"></div>
          </div>
        </div>

        <div class="card" style="padding:20px;">
          <div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:14px;">${icons.receipt} Look Up Receipt</div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <input class="field-input" id="receipt-id" type="number" min="1"
              placeholder="Enter sale ID..." style="max-width:220px;"/>
            <button id="receipt-btn" class="btn btn-ghost">${icons.search} Find</button>
          </div>
          <div id="receipt-result" style="margin-top:16px;display:none;"></div>
        </div>

      </div>
    </div>
  </div>

  <!-- New Sale Modal -->
  <div id="new-sale-modal" class="modal-backdrop">
    <div class="modal" style="max-width:620px;max-height:92vh;overflow-y:auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 style="font-family:var(--font-head);font-size:20px;color:var(--text)">New Sale</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>

      <div id="ns-error" class="banner banner-error"><span></span></div>
      <div id="ns-success" class="banner banner-success"><span id="ns-success-msg">Sale recorded!</span></div>

      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <input class="field-input" id="ns-product-search" type="text"
          placeholder="Search product name to add..." style="flex:1;"/>
        <button id="ns-search-btn" class="btn btn-ghost">${icons.search} Search</button>
      </div>
      <p class="field-hint hint-error" id="ns-search-hint" style="margin-bottom:8px;"></p>

      <div id="ns-search-results" style="display:none;margin-bottom:16px;">
        <div id="ns-results-list" style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto;"></div>
      </div>

      <div id="cart-section" style="display:none;">
        <div style="font-size:12px;font-weight:500;color:var(--muted);margin-bottom:8px;">CART</div>
        <div id="cart-items" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;"></div>

        <!-- Totals box -->
        <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:14px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-size:12px;color:var(--muted);">Subtotal</span>
            <span id="cart-subtotal" style="font-size:14px;color:var(--text);">₦0.00</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:12px;">
            <span style="font-size:12px;color:var(--muted);white-space:nowrap;">Discount (₦)</span>
            <input type="number" id="discount-input" min="0" placeholder="0"
              style="width:120px;padding:4px 8px;font-size:13px;text-align:right;
                     border:1px solid var(--border2);border-radius:6px;
                     background:var(--surface);color:var(--text);"/>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:10px;">
            <span style="font-size:12px;color:var(--muted);">Amount to Pay</span>
            <span id="cart-grand-total" style="font-family:var(--font-head);font-size:26px;color:var(--accent-lt);">₦0.00</span>
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button type="button" data-close-modal class="btn btn-ghost">Cancel</button>
          <button id="ns-submit" class="btn btn-primary">Record Sale</button>
        </div>
      </div>

      <div id="cart-empty-hint" style="text-align:center;padding:24px 0;color:var(--muted);font-size:13px;">
        Search for products above to add them to the cart.
      </div>
    </div>
  </div>

  <!-- Void Request Modal (staff) -->
  <div id="void-request-modal" class="modal-backdrop">
    <div class="modal" style="max-width:400px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h2 style="font-family:var(--font-head);font-size:18px;color:var(--text);">Request Void</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>
      <p style="font-size:13px;color:var(--muted);margin-bottom:16px;">
        Submit a void request for admin approval. Stock will only be restored after approval.
      </p>
      <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px;">Reason (optional)</label>
      <input class="field-input" id="void-request-reason" placeholder="e.g. Customer returned item"
        style="width:100%;margin-bottom:18px;box-sizing:border-box;"/>
      <div id="void-request-error" class="banner banner-error"><span></span></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
        <button data-close-modal class="btn btn-ghost">Cancel</button>
        <button id="void-request-confirm-btn" class="btn btn-primary">Submit Request</button>
      </div>
    </div>
  </div>

  <!-- Admin Void Modal (instant) -->
  <div id="void-modal" class="modal-backdrop">
    <div class="modal" style="max-width:400px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h2 style="font-family:var(--font-head);font-size:18px;color:#dc2626;">Void Sale</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>
      <p style="font-size:13px;color:var(--muted);margin-bottom:16px;">
        This will immediately reverse the sale and restore stock. Cannot be undone.
      </p>
      <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px;">Reason (optional)</label>
      <input class="field-input" id="void-reason" placeholder="e.g. Customer returned item"
        style="width:100%;margin-bottom:18px;box-sizing:border-box;"/>
      <div id="void-error" class="banner banner-error"><span></span></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
        <button data-close-modal class="btn btn-ghost">Cancel</button>
        <button id="void-confirm-btn" class="btn btn-primary"
          style="background:#dc2626;border-color:#dc2626;">Confirm Void</button>
      </div>
    </div>
  </div>

  <!-- Reject Void Request Modal (admin) -->
  <div id="reject-modal" class="modal-backdrop">
    <div class="modal" style="max-width:400px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h2 style="font-family:var(--font-head);font-size:18px;color:var(--text);">Reject Void Request</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>
      <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:6px;">Reason (optional)</label>
      <input class="field-input" id="reject-reason" placeholder="e.g. Sale is valid"
        style="width:100%;margin-bottom:18px;box-sizing:border-box;"/>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button data-close-modal class="btn btn-ghost">Cancel</button>
        <button id="reject-confirm-btn" class="btn btn-primary"
          style="background:#dc2626;border-color:#dc2626;">Confirm Reject</button>
      </div>
    </div>
  </div>`;
}

export async function initSales() {
  bindSidebar();
  bindModalClose('new-sale-modal');
  bindModalClose('void-modal');
  bindModalClose('void-request-modal');
  bindModalClose('reject-modal');

  initOfflineMode();

  if (navigator.onLine) {
    try {
      const products = await api.get('/stock/total/search?product_name=');
      if (products?.length) cacheProducts(products);
    } catch {}
  }

  if (!isAdmin()) {
    await loadMyShift();
  }

  document.getElementById('new-sale-btn')?.addEventListener('click', () => {
    if (!isAdmin() && !activeShift) {
      promptOpenShift();
      return;
    }
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

  document.getElementById('void-confirm-btn')?.addEventListener('click', async () => {
    const btn    = document.getElementById('void-confirm-btn');
    const errEl  = document.getElementById('void-error');
    const reason = document.getElementById('void-reason').value.trim();
    errEl.classList.remove('show');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Voiding...';
    try {
      await api.delete(`/sales/${pendingVoidSaleId}/void`, { reason });
      closeModal('void-modal');
      fetchReceipt(pendingVoidSaleId);
      if (isAdmin()) loadVoidRequests();
    } catch (err) {
      errEl.querySelector('span').textContent = err.message;
      errEl.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Confirm Void';
    }
  });

  document.getElementById('void-request-confirm-btn')?.addEventListener('click', async () => {
    const btn    = document.getElementById('void-request-confirm-btn');
    const errEl  = document.getElementById('void-request-error');
    const reason = document.getElementById('void-request-reason').value.trim();
    errEl.classList.remove('show');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Submitting...';
    try {
      await api.post(`/sales/${pendingVoidSaleId}/void-request`, { reason });
      closeModal('void-request-modal');
      fetchReceipt(pendingVoidSaleId);
    } catch (err) {
      errEl.querySelector('span').textContent = err.message;
      errEl.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Submit Request';
    }
  });

  document.getElementById('reject-confirm-btn')?.addEventListener('click', async () => {
    const btn    = document.getElementById('reject-confirm-btn');
    const reason = document.getElementById('reject-reason').value.trim();
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Rejecting...';
    try {
      await api.patch(`/sales/void-requests/${pendingVoidReqId}/reject`, { reason });
      closeModal('reject-modal');
      loadVoidRequests();
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Confirm Reject';
    }
  });

  if (isAdmin()) loadVoidRequests();
}

// ── Offline mode ──────────────────────────────────────────────────────────────

function initOfflineMode() {
  renderFailedSales();

  window.addEventListener('online', async () => {
    try {
      const products = await api.get('/stock/total/search?product_name=');
      if (products?.length) cacheProducts(products);
    } catch {}
    await syncOfflineSales();
    renderFailedSales();
  });
}

async function syncOfflineSales() {
  const syncBanner = document.getElementById('sync-banner');
  const syncMsg    = document.getElementById('sync-banner-msg');
  const pending    = await getPendingCount();
  if (!pending) return;

  if (syncBanner) syncBanner.style.display = 'block';
  if (syncMsg)    syncMsg.textContent = `Syncing ${pending} offline sale${pending > 1 ? 's' : ''}...`;

  const { synced, failed } = await syncPendingSales(
    (payload) => api.post('/sales/create', payload),
    (done, total) => {
      if (syncMsg) syncMsg.textContent = `Syncing... ${done}/${total}`;
    }
  );

  if (syncBanner) {
    syncMsg.textContent = failed > 0
      ? `Synced ${synced}, ${failed} failed. Check failed sales below.`
      : `${synced} offline sale${synced > 1 ? 's' : ''} synced successfully!`;
    setTimeout(() => { syncBanner.style.display = 'none'; }, 3000);
  }
}

async function getPendingCount() {
  const { getPendingSales } = await import('../js/offline.js');
  const sales = await getPendingSales();
  return sales.length;
}

async function renderFailedSales() {
  const section = document.getElementById('failed-sales-section');
  const listEl  = document.getElementById('failed-sales-list');
  if (!section || !listEl) return;

  const failed = await getFailedSales();
  if (!failed.length) { section.style.display = 'none'; return; }

  section.style.display = 'block';
  listEl.innerHTML = failed.map(entry => `
    <div style="background:var(--surface2);border:1px solid #fecaca;border-radius:8px;
                padding:12px 14px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--text);">
            Offline Sale — ${entry.items?.length || 0} item${entry.items?.length !== 1 ? 's' : ''}
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">
            Queued: ${new Date(entry.queued_at).toLocaleString()}
          </div>
        </div>
        <button class="btn btn-ghost discard-failed-btn" data-txn="${entry.txn_id}"
          style="font-size:12px;color:#dc2626;border-color:#dc2626;">Discard</button>
      </div>
    </div>`).join('');

  listEl.querySelectorAll('.discard-failed-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Discard this offline sale? This cannot be undone.')) return;
      await discardSale(btn.dataset.txn);
      renderFailedSales();
    });
  });
}

// ── Shift helpers ─────────────────────────────────────────────────────────────

async function loadMyShift() {
  try {
    const data  = await api.get('/shifts/my-shift');
    activeShift = data.shift || null;
  } catch {
    activeShift = null;
  }
  renderShiftBanner();
}

function renderShiftBanner() {
  const banner = document.getElementById('shift-status-banner');
  if (!banner) return;
  if (activeShift) {
    banner.innerHTML = `
      <div class="card" style="padding:14px 18px;border-left:3px solid var(--accent);display:flex;
           align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--text);">Shift #${activeShift.id} - Active</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">
            Opened: ${fmtDateTime(activeShift.opened_at)} &nbsp;&middot;&nbsp;
            Sales so far: <strong style="color:var(--accent-lt);">${fmt(activeShift.sales_so_far)}</strong>
          </div>
        </div>
        <span style="font-size:11px;color:var(--muted);">Go to <strong>Shifts</strong> to close your shift.</span>
      </div>`;
  } else {
    banner.innerHTML = `
      <div class="card" style="padding:14px 18px;border-left:3px solid #f59e0b;display:flex;
           align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--text);">No active shift</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">
            You must open a shift before you can record sales.
          </div>
        </div>
        <button id="banner-open-shift-btn" class="btn btn-primary" style="font-size:12px;padding:6px 16px;">
          Open Shift
        </button>
      </div>`;
    document.getElementById('banner-open-shift-btn')?.addEventListener('click', openShiftFromBanner);
  }
}

function promptOpenShift() {
  const banner = document.getElementById('shift-status-banner');
  if (!banner) return;
  banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
  banner.style.transition = 'opacity 0.15s';
  banner.style.opacity    = '0.4';
  setTimeout(() => { banner.style.opacity = '1'; }, 150);
  setTimeout(() => { banner.style.opacity = '0.4'; }, 350);
  setTimeout(() => { banner.style.opacity = '1'; }, 500);
}

async function openShiftFromBanner() {
  const btn = document.getElementById('banner-open-shift-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Opening...';
  try {
    await api.post('/shifts/open');
    await loadMyShift();
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.innerHTML = 'Open Shift';
  }
}

// ── Void requests (admin) ─────────────────────────────────────────────────────

async function loadVoidRequests() {
  const section = document.getElementById('void-requests-section');
  const listEl  = document.getElementById('void-requests-list');
  try {
    const data = await api.get('/sales/void-requests');
    if (!data.length) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    listEl.innerHTML = data.map(vr => `
      <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;
                  padding:12px 14px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-size:13px;font-weight:500;color:var(--text);">
              Sale #${vr.sale_id} - ${fmt(vr.total_amount)}
            </div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">
              Requested by <strong>${vr.requested_by}</strong> &middot; ${vr.created_at?.slice(0,10)}
            </div>
            ${vr.reason ? `<div style="font-size:12px;color:var(--text);margin-top:4px;">Reason: "${vr.reason}"</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-ghost approve-void-btn" data-req-id="${vr.void_request_id}" data-sale-id="${vr.sale_id}"
              style="font-size:12px;color:#16a34a;border-color:#16a34a;">Approve</button>
            <button class="btn btn-ghost reject-void-btn" data-req-id="${vr.void_request_id}"
              style="font-size:12px;color:#dc2626;border-color:#dc2626;">Reject</button>
          </div>
        </div>
      </div>`).join('');

    listEl.querySelectorAll('.approve-void-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Approve void for Sale #${btn.dataset.saleId}? Stock will be restored.`)) return;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>';
        try {
          await api.patch(`/sales/void-requests/${btn.dataset.reqId}/approve`);
          loadVoidRequests();
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
          btn.innerHTML = 'Approve';
        }
      });
    });

    listEl.querySelectorAll('.reject-void-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        pendingVoidReqId = btn.dataset.reqId;
        document.getElementById('reject-reason').value = '';
        openModal('reject-modal');
      });
    });
  } catch {
    section.style.display = 'none';
  }
}

// ── Modal helpers ─────────────────────────────────────────────────────────────

function resetSaleModal() {
  cart = [];
  document.getElementById('ns-product-search').value         = '';
  document.getElementById('ns-search-hint').textContent      = '';
  document.getElementById('ns-search-results').style.display = 'none';
  document.getElementById('ns-results-list').innerHTML       = '';
  document.getElementById('ns-error').classList.remove('show');
  document.getElementById('ns-success').classList.remove('show');
  const discountInput = document.getElementById('discount-input');
  if (discountInput) discountInput.value = '';
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
    let results;
    if (!navigator.onLine) {
      results = searchProductsOffline(query);
      if (!results.length) {
        hint.textContent = 'No products found in offline cache.';
        document.getElementById('ns-search-results').style.display = 'none';
        return;
      }
    } else {
      results = await api.get(`/stock/total/search?product_name=${encodeURIComponent(query)}`);
      if (!results.length) {
        hint.textContent = 'No products found.';
        document.getElementById('ns-search-results').style.display = 'none';
        return;
      }
    }

    const listEl = document.getElementById('ns-results-list');
    const resEl  = document.getElementById('ns-search-results');
    resEl.style.display = 'block';

    listEl.innerHTML = results.map(p => {
      const isCut        = p.is_cuttable && p.pieces_per_unit > 0;
      const availableQty = isCut ? p.total_quantity * p.pieces_per_unit : p.total_quantity;
      const unitLabel    = isCut ? p.sub_unit : 'unit';
      return `
      <div class="product-result-item"
        data-id="${p.product_id}"
        data-name="${p.product_name}"
        data-qty="${availableQty}"
        data-price="${p.price ?? ''}"
        data-stock-id="${p.stock_id ?? ''}"
        data-is-cuttable="${p.is_cuttable ?? false}"
        data-sub-unit="${p.sub_unit ?? ''}"
        data-pieces-per-unit="${p.pieces_per_unit ?? 1}"
        style="display:flex;align-items:center;justify-content:space-between;
               padding:10px 12px;background:var(--surface2);border:1px solid var(--border2);
               border-radius:8px;cursor:${availableQty > 0 ? 'pointer' : 'not-allowed'};
               opacity:${availableQty > 0 ? '1' : '0.5'};">
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--text)">${p.product_name}</div>
          <div style="font-size:11px;margin-top:2px;">
            ${availableQty > 0
              ? `<span style="color:var(--accent-lt)">${availableQty} ${unitLabel}s available</span>`
              : `<span style="color:#f87171">Out of stock</span>`}
          </div>
        </div>
        ${availableQty > 0
          ? `<span class="badge badge-green">Add to Cart</span>`
          : `<span class="badge badge-red">Unavailable</span>`}
      </div>`;
    }).join('');

    listEl.querySelectorAll('.product-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const qty = parseInt(item.getAttribute('data-qty'));
        if (qty <= 0) return;
        addToCart(
          parseInt(item.getAttribute('data-id')),
          item.getAttribute('data-name'),
          qty,
          item.getAttribute('data-price') || null,
          item.getAttribute('data-stock-id') || null,
          item.getAttribute('data-is-cuttable') === 'true',
          item.getAttribute('data-sub-unit') || '',
          parseInt(item.getAttribute('data-pieces-per-unit')) || 1,
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

async function addToCart(productId, productName, availableQty, cachedPrice, cachedStockId, isCuttable, subUnit, piecesPerUnit) {
  const errEl = document.getElementById('ns-error');
  errEl.classList.remove('show');
  const existing = cart.find(i => i.product_id === productId);
  if (existing) {
    if (existing.qty < existing.available_qty) existing.qty += 1;
    renderCart();
    document.getElementById('ns-search-results').style.display = 'none';
    document.getElementById('ns-product-search').value = '';
    return;
  }
  try {
    let selling_price, stock_id;
    if (!navigator.onLine) {
      const cached = getCachedProduct(productId);
      if (!cached) throw new Error('Product not found in offline cache.');
      const basePrice = parseFloat(cached.price);
      const pieces    = cached.pieces_per_unit || 1;
      const cut       = cached.is_cuttable || false;
      selling_price   = cut ? basePrice / pieces : basePrice;
      stock_id        = cached.stock_id;
      if (!selling_price || !stock_id) throw new Error('Offline cache is missing price or stock data. Please reconnect to refresh.');
    } else {
      if (cachedPrice && cachedStockId) {
        const basePrice = parseFloat(cachedPrice);
        selling_price   = isCuttable && piecesPerUnit > 1 ? basePrice / piecesPerUnit : basePrice;
        stock_id        = parseInt(cachedStockId);
      } else {
        const details   = await api.get(`/product/${productId}/details`);
        const stockData = await api.get(`/stock/by-product/${productId}`);
        const basePrice = parseFloat(details.price);
        const pieces    = details.pieces_per_unit || 1;
        selling_price   = details.is_cuttable ? basePrice / pieces : basePrice;
        stock_id        = stockData.id;
        isCuttable      = details.is_cuttable;
        subUnit         = details.sub_unit || '';
        piecesPerUnit   = pieces;
      }
    }
    cart.push({
      product_id:      productId,
      product_name:    productName,
      stock_id,
      selling_price,
      available_qty:   availableQty,
      qty:             1,
      is_cuttable:     isCuttable,
      sub_unit:        subUnit,
      pieces_per_unit: piecesPerUnit,
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
  const cartSection = document.getElementById('cart-section');
  const emptyHint   = document.getElementById('cart-empty-hint');
  const cartItemsEl = document.getElementById('cart-items');
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
          style="font-size:11px;padding:3px 8px;color:#f87171;">Remove</button>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="font-size:12px;color:var(--muted);">
          Unit price: <strong style="color:var(--text);">${fmt(item.selling_price)}</strong>
          ${item.is_cuttable ? `<span style="color:var(--muted);"> / ${item.sub_unit}</span>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <label style="font-size:12px;color:var(--muted);">Qty:</label>
          <input type="number" class="field-input cart-qty-input" data-idx="${idx}"
            value="${item.qty}" min="1" max="${item.available_qty}"
            style="width:70px;padding:4px 8px;font-size:13px;text-align:center;"/>
          <span style="font-size:11px;color:var(--muted);">/ ${item.available_qty} ${item.is_cuttable ? item.sub_unit + 's' : 'units'}</span>
        </div>
        <div style="font-size:13px;font-weight:500;color:var(--accent-lt);margin-left:auto;">
          ${fmt(item.qty * item.selling_price)}
        </div>
      </div>
    </div>`).join('');

  cartItemsEl.querySelectorAll('.cart-qty-input').forEach(input => {
    input.addEventListener('input', () => {
      const idx = parseInt(input.dataset.idx);
      const raw = parseInt(input.value);
      if (!isNaN(raw) && raw >= 1 && raw <= cart[idx].available_qty) {
        cart[idx].qty = raw;
        updateTotals();
      }
    });
    input.addEventListener('blur', () => {
      const idx = parseInt(input.dataset.idx);
      let val = parseInt(input.value);
      if (isNaN(val) || val < 1) val = 1;
      if (val > cart[idx].available_qty) val = cart[idx].available_qty;
      cart[idx].qty = val;
      input.value   = val;
      updateTotals();
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  });

  cartItemsEl.querySelectorAll('.remove-cart-item').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.splice(parseInt(btn.dataset.idx), 1);
      renderCart();
    });
  });

  const discountInput = document.getElementById('discount-input');
  if (discountInput) {
    discountInput.removeEventListener('input', updateTotals);
    discountInput.addEventListener('input', updateTotals);
  }

  updateTotals();
}

function getDiscount() {
  const val = parseFloat(document.getElementById('discount-input')?.value || '0');
  return isNaN(val) || val < 0 ? 0 : val;
}

function updateTotals() {
  const subtotal    = cart.reduce((sum, i) => sum + i.qty * i.selling_price, 0);
  const discount    = getDiscount();
  const amountToPay = Math.max(0, subtotal - discount);
  const subtotalEl  = document.getElementById('cart-subtotal');
  const totalEl     = document.getElementById('cart-grand-total');
  if (subtotalEl) subtotalEl.textContent = `₦${fmt(subtotal)}`;
  if (totalEl)    totalEl.textContent    = `₦${fmt(amountToPay)}`;
}

// ── Submit sale ───────────────────────────────────────────────────────────────

async function submitSale() {
  const errEl  = document.getElementById('ns-error');
  const sucEl  = document.getElementById('ns-success');
  const sucMsg = document.getElementById('ns-success-msg');
  const btn    = document.getElementById('ns-submit');
  errEl.classList.remove('show');
  sucEl.classList.remove('show');

  if (!isAdmin() && !activeShift) {
    errEl.querySelector('span').textContent = 'No active shift. Please open a shift before recording a sale.';
    errEl.classList.add('show');
    return;
  }
  if (!cart.length) {
    errEl.querySelector('span').textContent = 'Add at least one product to the cart.';
    errEl.classList.add('show');
    return;
  }
  const invalid = cart.find(i => !i.qty || i.qty < 1);
  if (invalid) {
    errEl.querySelector('span').textContent = `Quantity for "${invalid.product_name}" must be at least 1.`;
    errEl.classList.add('show');
    return;
  }

  const subtotal = cart.reduce((sum, i) => sum + i.qty * i.selling_price, 0);
  const discount = getDiscount();
  if (discount > subtotal) {
    errEl.querySelector('span').textContent = 'Discount cannot exceed the grand total.';
    errEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Processing...';

  const txn_id = generateTxnId();
  const items  = cart.map(i => ({
    stock_id:      i.stock_id,
    quantity_sold: i.qty,
    selling_price: i.selling_price,
  }));

  // Offline: queue the sale
  if (!navigator.onLine) {
    await queueSale(txn_id, items);
    cart = [];
    renderCart();
    sucMsg.innerHTML = 'You are offline. Sale has been saved and will sync automatically when you reconnect.';
    sucEl.classList.add('show');
    btn.disabled = false;
    btn.innerHTML = 'Record Sale';
    return;
  }

  // Online: submit with txn_id and discount
  try {
    const receipt = await api.post('/sales/create', { txn_id, items, discount });
    sucMsg.innerHTML = `Sale recorded! Receipt #${receipt.receipt_id} - Paid: ₦${fmt(receipt.amount_paid)}
      <span style="color:var(--accent-lt);cursor:pointer;text-decoration:underline;margin-left:8px;"
        id="view-receipt-link">View Receipt</span>`;
    sucEl.classList.add('show');
    cart = [];
    renderCart();
    if (!isAdmin()) loadMyShift();
    printReceipt(receipt);
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
    <span class="spinner" style="border-top-color:var(--accent)"></span> Loading receipt...</div>`;
  try {
    const r = await api.get(`/sales/${id}/salesreceipt`);

    let badge = `<span class="badge badge-green">Completed</span>`;
    if (r.is_voided)         badge = `<span class="badge badge-red">Voided</span>`;
    else if (r.void_pending) badge = `<span class="badge" style="background:#fef3c7;color:#92400e;">Void Pending</span>`;

    let actionHtml = '';
    if (!r.is_voided && !r.void_pending) {
      if (isAdmin()) {
        actionHtml = `
          <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;">
            <button id="void-btn-${id}" class="btn btn-ghost"
              style="color:#f87171;border-color:#f87171;font-size:12px;padding:6px 14px;">Void Sale</button>
          </div>`;
      } else {
        actionHtml = `
          <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;">
            <button id="void-request-btn-${id}" class="btn btn-ghost"
              style="font-size:12px;padding:6px 14px;">Request Void</button>
          </div>`;
      }
    }

    if (r.void_pending && isAdmin()) {
      actionHtml = `
        <div style="margin-top:12px;padding:10px 14px;background:#fef3c7;border:1px solid #fde68a;
                    border-radius:8px;font-size:13px;color:#92400e;">
          A void request is pending admin approval.
        </div>`;
    }

    const discountRow = r.discount > 0 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;
          padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <span style="color:#16a34a;">Discount</span>
        <span style="color:#16a34a;">-₦${fmt(r.discount)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;
          padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <span style="color:var(--muted);">Amount Paid</span>
        <span style="font-weight:500;">₦${fmt(r.amount_paid)}</span>
      </div>` : '';

    container.innerHTML = `
      <div class="card" style="padding:18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div style="font-family:var(--font-head);font-size:16px;color:var(--text)">Receipt #${r.receipt_id}</div>
          ${badge}
        </div>
        ${receiptRow('Sold By', r.sold_by)}
        ${receiptRow('Date', fmtDateTime(r.created_at))}
        <div style="margin:14px 0 10px;font-size:12px;font-weight:500;color:var(--muted);">ITEMS</div>
        ${r.items.map(item => `
          <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;
                      padding:10px 14px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:13px;font-weight:500;color:var(--text);">${item.product_name}</span>
              <span style="font-size:13px;font-weight:500;color:var(--accent-lt);">₦${fmt(item.total_amount)}</span>
            </div>
            <div style="font-size:11px;color:var(--muted);">
              ${item.quantity_sold} x ₦${fmt(item.unit_price)}
            </div>
          </div>`).join('')}
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:12px 0 0;border-top:1px solid var(--border);margin-top:8px;">
          <span style="font-size:13px;font-weight:500;color:var(--text);">Grand Total</span>
          <strong style="font-family:var(--font-head);font-size:20px;color:var(--accent-lt);">
            ₦${fmt(r.grand_total)}
          </strong>
        </div>
        ${discountRow}
        ${r.is_voided ? `
          <div style="margin-top:12px;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;
                       border-radius:8px;color:#dc2626;font-size:13px;font-weight:500;">
            Voided${r.voided_by ? ` by ${r.voided_by}` : ''}${r.void_reason ? ` - "${r.void_reason}"` : ''}
          </div>` : ''}
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
          <button id="print-receipt-btn" class="btn btn-ghost" style="font-size:12px;flex:1;">Print</button>
          <button id="download-receipt-btn" class="btn btn-ghost" style="font-size:12px;flex:1;">Download PDF</button>
        </div>
        ${actionHtml}
      </div>`;

    document.getElementById('print-receipt-btn')?.addEventListener('click', () => printReceipt(r));
    document.getElementById('download-receipt-btn')?.addEventListener('click', () => downloadReceiptPDF(r));

    document.getElementById(`void-btn-${id}`)?.addEventListener('click', () => {
      pendingVoidSaleId = id;
      document.getElementById('void-reason').value = '';
      document.getElementById('void-error').classList.remove('show');
      openModal('void-modal');
    });

    document.getElementById(`void-request-btn-${id}`)?.addEventListener('click', () => {
      pendingVoidSaleId = id;
      document.getElementById('void-request-reason').value = '';
      document.getElementById('void-request-error').classList.remove('show');
      openModal('void-request-modal');
    });

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