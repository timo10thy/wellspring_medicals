import { api } from '../js/api.js';
import { renderSidebar, renderTopbar, bindSidebar,
         openModal, closeModal, bindModalClose,
         fmt, fmtDateTime, icons } from '../js/ui.js';

function isAdmin() {
  const user = JSON.parse(localStorage.getItem('pharma_user') || '{}');
  return user.role === 'ADMIN';
}

export function renderShifts() {
  return `
  <div class="page-enter app-layout">
    ${renderSidebar('shifts')}
    <div class="main-content">
      ${renderTopbar('Shifts', 'Cash reconciliation per shift')}
      <div class="page-body">

        ${!isAdmin() ? `
        <!-- Staff: active shift card -->
        <div id="active-shift-card" style="margin-bottom:24px;"></div>
        ` : ''}

        <!-- Admin: all shifts table / Staff: their shift history -->
        <div class="card" style="padding:0;overflow:hidden;">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);
                      display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:13px;font-weight:500;color:var(--text);">
              ${isAdmin() ? 'All Shifts' : 'My Shifts'}
            </span>
            ${!isAdmin() ? `
            <button id="open-shift-btn" class="btn btn-primary" style="font-size:12px;padding:6px 14px;">
              + Open Shift
            </button>` : ''}
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  ${isAdmin() ? '<th>Staff</th>' : ''}
                  <th>Opened</th>
                  <th>Closed</th>
                  <th>Total Sales</th>
                  <th>POS</th>
                  <th>Cash Expected</th>
                  <th>Cash Counted</th>
                  <th>Variance</th>
                  <th>Status</th>
                  ${isAdmin() ? '<th>Action</th>' : ''}
                </tr>
              </thead>
              <tbody id="shifts-tbody">
                <tr><td colspan="${isAdmin() ? 11 : 9}" style="text-align:center;color:var(--muted);">
                  <span class="spinner" style="border-top-color:var(--accent)"></span>
                </td></tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Close Shift Modal -->
  <div id="close-shift-modal" class="modal-backdrop">
    <div class="modal" style="max-width:420px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h2 style="font-family:var(--font-head);font-size:18px;color:var(--text);">Close Shift</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>
      <div id="close-shift-summary" style="background:var(--surface2);border:1px solid var(--border2);
           border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;"></div>
      <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:4px;">POS Amount Collected (₦)</label>
      <input type="number" class="field-input" id="pos-amount" min="0" step="0.01"
        placeholder="0.00" style="width:100%;margin-bottom:12px;box-sizing:border-box;"/>
      <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:4px;">Physical Cash Counted (₦)</label>
      <input type="number" class="field-input" id="cash-counted" min="0" step="0.01"
        placeholder="0.00" style="width:100%;margin-bottom:12px;box-sizing:border-box;"/>
      <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:4px;">Note (optional)</label>
      <input type="text" class="field-input" id="close-note"
        placeholder="Any remarks…" style="width:100%;margin-bottom:6px;box-sizing:border-box;"/>
      <div id="close-variance-preview" style="margin:10px 0;font-size:13px;"></div>
      <div id="close-shift-error" class="banner banner-error"><span></span></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">
        <button data-close-modal class="btn btn-ghost">Cancel</button>
        <button id="close-shift-confirm" class="btn btn-primary">Close Shift</button>
      </div>
    </div>
  </div>

  <!-- Admin Review Modal -->
  <div id="review-modal" class="modal-backdrop">
    <div class="modal" style="max-width:420px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h2 style="font-family:var(--font-head);font-size:18px;color:var(--text);">Review Shift</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>
      <div id="review-shift-summary" style="background:var(--surface2);border:1px solid var(--border2);
           border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;"></div>
      <label style="font-size:12px;color:var(--muted);display:block;margin-bottom:4px;">Note (optional)</label>
      <input type="text" class="field-input" id="review-note"
        placeholder="Add a review note…" style="width:100%;margin-bottom:16px;box-sizing:border-box;"/>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button data-close-modal class="btn btn-ghost">Cancel</button>
        <button id="flag-shift-btn" class="btn btn-ghost"
          style="color:#f59e0b;border-color:#f59e0b;">⚠ Flag</button>
        <button id="approve-shift-btn" class="btn btn-primary"
          style="background:#16a34a;border-color:#16a34a;">✓ Approve</button>
      </div>
    </div>
  </div>`;
}

let activeShift       = null;
let pendingReviewId   = null;

export async function initShifts() {
  bindSidebar();
  bindModalClose('close-shift-modal');
  bindModalClose('review-modal');

  if (isAdmin()) {
    await loadAllShifts();
  } else {
    await loadMyShift();
    await loadAllShifts();

    document.getElementById('open-shift-btn')?.addEventListener('click', openShift);

    // Live variance preview
    const posInput   = document.getElementById('pos-amount');
    const cashInput  = document.getElementById('cash-counted');
    [posInput, cashInput].forEach(el => {
      el?.addEventListener('input', updateVariancePreview);
    });

    document.getElementById('close-shift-confirm')?.addEventListener('click', closeShift);
  }

  // Admin review buttons
  document.getElementById('approve-shift-btn')?.addEventListener('click', () => reviewShift('approve'));
  document.getElementById('flag-shift-btn')?.addEventListener('click',    () => reviewShift('flag'));
}

// Load active shift for staff
async function loadMyShift() {
  const card = document.getElementById('active-shift-card');
  if (!card) return;
  try {
    const data = await api.get('/shifts/my-shift');
    activeShift = data.shift;

    if (!activeShift) {
      card.innerHTML = `
        <div class="card" style="padding:16px 20px;border-left:3px solid var(--muted);">
          <div style="font-size:13px;color:var(--muted);">No active shift. Click <strong>Open Shift</strong> to start.</div>
        </div>`;
      return;
    }

    card.innerHTML = `
      <div class="card" style="padding:16px 20px;border-left:3px solid var(--accent);">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-size:13px;font-weight:500;color:var(--text);">
              🟢 Shift #${activeShift.id} — Active
            </div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">
              Opened: ${fmtDateTime(activeShift.opened_at)}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="text-align:right;">
              <div style="font-size:11px;color:var(--muted);">Sales so far</div>
              <div style="font-family:var(--font-head);font-size:20px;color:var(--accent-lt);">
                ₦${fmt(activeShift.sales_so_far)}
              </div>
            </div>
            <button id="close-shift-open-btn" class="btn btn-ghost"
              style="color:#f87171;border-color:#f87171;font-size:12px;">
              Close Shift
            </button>
          </div>
        </div>
      </div>`;

    document.getElementById('close-shift-open-btn')?.addEventListener('click', () => {
      document.getElementById('pos-amount').value    = '';
      document.getElementById('cash-counted').value  = '';
      document.getElementById('close-note').value    = '';
      document.getElementById('close-variance-preview').innerHTML = '';
      document.getElementById('close-shift-error').classList.remove('show');
      document.getElementById('close-shift-summary').innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:var(--muted);">Total sales this shift</span>
          <strong>₦${fmt(activeShift.sales_so_far)}</strong>
        </div>
        <div style="font-size:11px;color:var(--muted);">
          Enter POS collected and physical cash counted below.
        </div>`;
      openModal('close-shift-modal');
    });

  } catch {
    card.innerHTML = '';
  }
}

// Open shift
async function openShift() {
  const btn = document.getElementById('open-shift-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  try {
    await api.post('/shifts/open');
    await loadMyShift();
    await loadAllShifts();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '+ Open Shift';
  }
}

// Variance preview while typing
function updateVariancePreview() {
  if (!activeShift) return;
  const pos        = parseFloat(document.getElementById('pos-amount').value)   || 0;
  const counted    = parseFloat(document.getElementById('cash-counted').value) || 0;
  const expected   = activeShift.sales_so_far - pos;
  const variance   = counted - expected;
  const color      = variance === 0 ? 'var(--accent-lt)' : variance > 0 ? '#16a34a' : '#f87171';
  const label      = variance === 0 ? 'Balanced ✓' : variance > 0 ? 'Surplus' : 'Shortage';

  document.getElementById('close-variance-preview').innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 12px;
         background:var(--surface2);border-radius:6px;border:1px solid var(--border2);">
      <span style="color:var(--muted);">Cash Expected</span>
      <strong>₦${fmt(expected)}</strong>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 12px;
         margin-top:6px;background:var(--surface2);border-radius:6px;border:1px solid var(--border2);">
      <span style="color:var(--muted);">Variance</span>
      <strong style="color:${color};">₦${fmt(variance)} — ${label}</strong>
    </div>`;
}

// Close shift
async function closeShift() {
  const btn        = document.getElementById('close-shift-confirm');
  const errEl      = document.getElementById('close-shift-error');
  const pos        = parseFloat(document.getElementById('pos-amount').value);
  const counted    = parseFloat(document.getElementById('cash-counted').value);
  const note       = document.getElementById('close-note').value.trim();

  errEl.classList.remove('show');
  if (isNaN(pos) || isNaN(counted)) {
    errEl.querySelector('span').textContent = 'Enter both POS and cash amounts.';
    errEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Closing…';

  try {
    await api.post('/shifts/close', { pos_amount: pos, cash_counted: counted, note });
    closeModal('close-shift-modal');
    activeShift = null;
    await loadMyShift();
    await loadAllShifts();
  } catch (err) {
    errEl.querySelector('span').textContent = err.message;
    errEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Close Shift';
  }
}

// Load all shifts
async function loadAllShifts() {
  const tbody = document.getElementById('shifts-tbody');
  const cols  = isAdmin() ? 11 : 9;
  tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;color:var(--muted);">
    <span class="spinner" style="border-top-color:var(--accent)"></span></td></tr>`;

  try {
    const shifts = await api.get('/shifts/all');
    if (!shifts.length) {
      tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;color:var(--muted);padding:32px;">
        No shifts found.</td></tr>`;
      return;
    }

    tbody.innerHTML = shifts.map(s => {
      const statusBadge = {
        open:     `<span class="badge badge-green">Open</span>`,
        closed:   `<span class="badge badge-blue">Closed</span>`,
        approved: `<span class="badge badge-green">Approved</span>`,
        flagged:  `<span class="badge badge-red">Flagged</span>`,
      }[s.status] || `<span class="badge">${s.status}</span>`;

      const varianceColor = s.variance === 0 ? 'var(--accent-lt)'
                          : s.variance  >  0 ? '#16a34a' : '#f87171';

      return `<tr>
        <td style="color:var(--muted);">#${s.id}</td>
        ${isAdmin() ? `<td>
          <div style="font-weight:500;">${s.opened_by_name}</div>
          <div style="font-size:11px;color:var(--muted);">@${s.opened_by}</div>
        </td>` : ''}
        <td style="font-size:12px;white-space:nowrap;">${fmtDateTime(s.opened_at)}</td>
        <td style="font-size:12px;white-space:nowrap;">${s.closed_at ? fmtDateTime(s.closed_at) : '—'}</td>
        <td style="color:var(--accent-lt);">₦${fmt(s.total_sales)}</td>
        <td>₦${fmt(s.pos_amount)}</td>
        <td>₦${fmt(s.cash_expected)}</td>
        <td>₦${fmt(s.cash_counted)}</td>
        <td style="color:${varianceColor};font-weight:500;">
          ${s.variance >= 0 ? '+' : ''}₦${fmt(s.variance)}
        </td>
        <td>${statusBadge}</td>
        ${isAdmin() ? `<td>
          ${s.status === 'closed'
            ? `<button class="btn btn-ghost review-btn" data-shift='${JSON.stringify(s)}'
                style="font-size:11px;padding:4px 10px;">Review</button>`
            : s.reviewed_by
              ? `<span style="font-size:11px;color:var(--muted);">by ${s.reviewed_by}</span>`
              : '—'}
        </td>` : ''}
      </tr>`;
    }).join('');

    // Bind review buttons
    tbody.querySelectorAll('.review-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = JSON.parse(btn.dataset.shift);
        pendingReviewId = s.id;
        document.getElementById('review-note').value = '';
        document.getElementById('review-shift-summary').innerHTML = `
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:var(--muted);">Staff</span>
            <strong>${s.opened_by_name} (@${s.opened_by})</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:var(--muted);">Total Sales</span>
            <strong>₦${fmt(s.total_sales)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:var(--muted);">POS</span>
            <strong>₦${fmt(s.pos_amount)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:var(--muted);">Cash Expected</span>
            <strong>₦${fmt(s.cash_expected)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:var(--muted);">Cash Counted</span>
            <strong>₦${fmt(s.cash_counted)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--muted);">Variance</span>
            <strong style="color:${s.variance >= 0 ? '#16a34a' : '#f87171'};">
              ${s.variance >= 0 ? '+' : ''}₦${fmt(s.variance)}
            </strong>
          </div>
          ${s.note ? `<div style="margin-top:8px;font-size:12px;color:var(--muted);">Note: "${s.note}"</div>` : ''}`;
        openModal('review-modal');
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;color:#f87171;">${err.message}</td></tr>`;
  }
}

// Admin review
async function reviewShift(action) {
  const note = document.getElementById('review-note').value.trim();
  const btn  = action === 'approve'
    ? document.getElementById('approve-shift-btn')
    : document.getElementById('flag-shift-btn');

  btn.disabled = true;
  try {
    await api.patch(`/shifts/${pendingReviewId}/${action}`, { note });
    closeModal('review-modal');
    await loadAllShifts();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
  }
}