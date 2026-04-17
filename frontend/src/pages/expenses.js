// ── Expenses Page ─────────────────────────────────────────────────────────────
// POST /expenses/create
// GET  /expenses/all
// GET  /expenses/tracker/summary?month=&year=
// PATCH /expenses/update/{id}
// DELETE /expenses/delete/{id}

import { api }                                         from '../js/api.js';
import { renderSidebar, renderTopbar, bindSidebar,
         openModal, closeModal, bindModalClose,
         fmt, fmtDateTime, icons }                     from '../js/ui.js';

const CATEGORIES  = ['GOODS_PURCHASE','OPERATING_EXPENSE','TRANSPORT','RENT','OTHER'];
const PAYMENTS    = ['CASH','TRANSFER','POS'];

// ── Render ────────────────────────────────────────────────────────────────────
export function renderExpenses() {
  const now = new Date();
  return `
  <div class="page-enter app-layout">
    ${renderSidebar('expenses')}
    <div class="main-content">
      ${renderTopbar('Expenses', 'Track spending and get investment advice')}
      <div class="page-body">

        <!-- Tracker banner -->
        <div class="card" style="padding:20px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
            <div style="font-size:13px;font-weight:500;color:var(--text)">${icons.chart} Expense Tracker</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <select id="tracker-month" class="field-input" style="width:130px;">
                ${['January','February','March','April','May','June','July','August','September','October','November','December']
                  .map((m,i) => `<option value="${i+1}" ${i+1 === now.getMonth()+1 ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
              <select id="tracker-year" class="field-input" style="width:100px;">
                ${[now.getFullYear()-1, now.getFullYear()].map(y =>
                  `<option value="${y}" ${y === now.getFullYear() ? 'selected' : ''}>${y}</option>`).join('')}
              </select>
              <button id="tracker-btn" class="btn btn-primary">View</button>
            </div>
          </div>
          <div id="tracker-result" style="display:none;"></div>
        </div>

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
          <p style="font-size:13px;color:var(--muted)">All recorded expenses for Wellspring Medics.</p>
          <button id="new-expense-btn" class="btn btn-primary">${icons.plus} Add Expense</button>
        </div>

        <!-- Expenses table -->
        <div class="card" style="overflow:hidden;">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);">
            <span style="font-size:13px;font-weight:500;color:var(--text)">Expense Records</span>
          </div>
          <div id="expenses-list" style="padding:40px;text-align:center;color:var(--muted);font-size:13px;">
            <span class="spinner" style="border-top-color:var(--accent)"></span>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Add Expense Modal -->
  <div id="expense-modal" class="modal-backdrop">
    <div class="modal" style="max-width:480px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h2 style="font-family:var(--font-head);font-size:20px;color:var(--text)">Add Expense</h2>
        <button data-close-modal class="btn btn-ghost" style="padding:6px 10px;">${icons.x}</button>
      </div>

      <div id="exp-error"   class="banner banner-error"><span></span></div>
      <div id="exp-success" class="banner banner-success"><span>Expense recorded!</span></div>

      <form id="expense-form" novalidate style="display:flex;flex-direction:column;gap:14px;">
        <input type="hidden" id="exp-id"/>

        <div>
          <label class="field-label">Amount (₦)</label>
          <input class="field-input" id="exp-amount" type="number" min="0.01" step="0.01" placeholder="0.00"/>
          <p class="field-hint hint-error" id="exp-amount-hint"></p>
        </div>

        <div>
          <label class="field-label">Category</label>
          <select class="field-input" id="exp-category">
            <option value="">Select category…</option>
            ${CATEGORIES.map(c => `<option value="${c}">${c.replace(/_/g,' ')}</option>`).join('')}
          </select>
          <p class="field-hint hint-error" id="exp-category-hint"></p>
        </div>

        <div>
          <label class="field-label">Payment Type</label>
          <select class="field-input" id="exp-payment">
            <option value="">Select payment type…</option>
            ${PAYMENTS.map(p => `<option value="${p}">${p}</option>`).join('')}
          </select>
          <p class="field-hint hint-error" id="exp-payment-hint"></p>
        </div>

        <div>
          <label class="field-label">Expense Date</label>
          <input class="field-input" id="exp-date" type="datetime-local"/>
          <p class="field-hint hint-error" id="exp-date-hint"></p>
        </div>

        <div>
          <label class="field-label">Description <span style="color:var(--muted)">(optional)</span></label>
          <input class="field-input" id="exp-description" type="text" placeholder="e.g. Monthly rent payment"/>
        </div>

        <div>
          <label class="field-label">Reference <span style="color:var(--muted)">(optional)</span></label>
          <input class="field-input" id="exp-reference" type="text" placeholder="e.g. Invoice #123"/>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
          <button type="button" data-close-modal class="btn btn-ghost">Cancel</button>
          <button type="submit" id="exp-submit" class="btn btn-primary">Save Expense</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Delete Confirm Modal -->
  <div id="delete-expense-modal" class="modal-backdrop">
    <div class="modal" style="max-width:400px;">
      <div style="margin-bottom:16px;">
        <h2 style="font-family:var(--font-head);font-size:18px;color:var(--text)">Delete Expense?</h2>
        <p style="font-size:13px;color:var(--muted);margin-top:8px;">This action cannot be undone.</p>
      </div>
      <div id="del-exp-error" class="banner banner-error"><span></span></div>
      <input type="hidden" id="del-exp-id"/>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button data-close-modal class="btn btn-ghost">Cancel</button>
        <button id="del-exp-confirm" class="btn btn-danger">Delete</button>
      </div>
    </div>
  </div>`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
export function initExpenses() {
  bindSidebar();
  bindModalClose('expense-modal');
  bindModalClose('delete-expense-modal');

  loadExpenses();

  document.getElementById('new-expense-btn')?.addEventListener('click', () => {
    resetExpenseForm();
    document.getElementById('exp-submit').textContent = 'Save Expense';
    openModal('expense-modal');
  });

  document.getElementById('expense-form')?.addEventListener('submit', submitExpense);
  document.getElementById('tracker-btn')?.addEventListener('click', loadTracker);
  document.getElementById('del-exp-confirm')?.addEventListener('click', confirmDelete);
}

// ── Load all expenses ─────────────────────────────────────────────────────────
async function loadExpenses() {
  const el = document.getElementById('expenses-list');
  try {
    const data = await api.get('/expenses/all');
    if (!data.length) {
      el.innerHTML = 'No expenses recorded yet.';
      return;
    }
    el.innerHTML = `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:var(--surface2);text-align:left;">
              ${['Date','Category','Payment','Amount','Description','Reference',''].map(h =>
                `<th style="padding:10px 14px;color:var(--muted);font-weight:500;border-bottom:1px solid var(--border);">${h}</th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(e => `
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:10px 14px;color:var(--muted);">${fmtDateTime(e.expense_date)}</td>
                <td style="padding:10px 14px;"><span class="badge badge-blue">${e.category.replace(/_/g,' ')}</span></td>
                <td style="padding:10px 14px;">${e.payment_type}</td>
                <td style="padding:10px 14px;font-weight:500;color:var(--text);">₦${fmt(e.amount)}</td>
                <td style="padding:10px 14px;color:var(--muted);">${e.description || '—'}</td>
                <td style="padding:10px 14px;color:var(--muted);">${e.reference || '—'}</td>
                <td style="padding:10px 14px;">
                  <div style="display:flex;gap:6px;">
                    <button class="btn btn-ghost edit-exp-btn" style="font-size:11px;padding:4px 10px;"
                      data-id="${e.id}" data-amount="${e.amount}" data-category="${e.category}"
                      data-payment="${e.payment_type}" data-date="${e.expense_date}"
                      data-description="${e.description||''}" data-reference="${e.reference||''}">
                      Edit
                    </button>
                    <button class="btn btn-danger del-exp-btn" style="font-size:11px;padding:4px 10px;"
                      data-id="${e.id}">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    // Bind edit buttons
    el.querySelectorAll('.edit-exp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = btn.dataset;
        document.getElementById('exp-id').value          = d.id;
        document.getElementById('exp-amount').value      = d.amount;
        document.getElementById('exp-category').value    = d.category;
        document.getElementById('exp-payment').value     = d.payment;
        document.getElementById('exp-date').value        = d.date?.slice(0,16);
        document.getElementById('exp-description').value = d.description;
        document.getElementById('exp-reference').value   = d.reference;
        document.getElementById('exp-submit').textContent = 'Update Expense';
        document.getElementById('exp-error').classList.remove('show');
        document.getElementById('exp-success').classList.remove('show');
        openModal('expense-modal');
      });
    });

    // Bind delete buttons
    el.querySelectorAll('.del-exp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('del-exp-id').value = btn.dataset.id;
        document.getElementById('del-exp-error').classList.remove('show');
        openModal('delete-expense-modal');
      });
    });

  } catch (err) {
    el.innerHTML = `<span style="color:#f87171">${err.message}</span>`;
  }
}

// ── Submit (create or update) ─────────────────────────────────────────────────
async function submitExpense(e) {
  e.preventDefault();
  const errEl = document.getElementById('exp-error');
  const sucEl = document.getElementById('exp-success');
  const btn   = document.getElementById('exp-submit');
  errEl.classList.remove('show');
  sucEl.classList.remove('show');

  const id       = document.getElementById('exp-id').value;
  const amount   = document.getElementById('exp-amount').value;
  const category = document.getElementById('exp-category').value;
  const payment  = document.getElementById('exp-payment').value;
  const date     = document.getElementById('exp-date').value;

  // Validation
  let valid = true;
  if (!amount || parseFloat(amount) <= 0) {
    document.getElementById('exp-amount-hint').textContent = 'Enter a valid amount.'; valid = false;
  } else document.getElementById('exp-amount-hint').textContent = '';
  if (!category) {
    document.getElementById('exp-category-hint').textContent = 'Select a category.'; valid = false;
  } else document.getElementById('exp-category-hint').textContent = '';
  if (!payment) {
    document.getElementById('exp-payment-hint').textContent = 'Select a payment type.'; valid = false;
  } else document.getElementById('exp-payment-hint').textContent = '';
  if (!date) {
    document.getElementById('exp-date-hint').textContent = 'Select a date.'; valid = false;
  } else document.getElementById('exp-date-hint').textContent = '';
  if (!valid) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving…';

  try {
    const payload = {
      amount:       parseFloat(amount),
      category,
      payment_type: payment,
      expense_date: new Date(date).toISOString(),
      description:  document.getElementById('exp-description').value || null,
      reference:    document.getElementById('exp-reference').value   || null,
    };

    if (id) {
      await api.patch(`/expenses/update/${id}`, payload);
    } else {
      await api.post('/expenses/create', payload);
    }

    sucEl.classList.add('show');
    resetExpenseForm();
    await loadExpenses();

    setTimeout(() => closeModal('expense-modal'), 1200);

  } catch (err) {
    errEl.querySelector('span').textContent = err.message;
    errEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = id ? 'Update Expense' : 'Save Expense';
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function confirmDelete() {
  const id    = document.getElementById('del-exp-id').value;
  const errEl = document.getElementById('del-exp-error');
  const btn   = document.getElementById('del-exp-confirm');
  errEl.classList.remove('show');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    await api.delete(`/expenses/delete/${id}`);
    closeModal('delete-expense-modal');
    await loadExpenses();
  } catch (err) {
    errEl.querySelector('span').textContent = err.message;
    errEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete';
  }
}

// ── Tracker ───────────────────────────────────────────────────────────────────
async function loadTracker() {
  const month  = document.getElementById('tracker-month').value;
  const year   = document.getElementById('tracker-year').value;
  const result = document.getElementById('tracker-result');
  const btn    = document.getElementById('tracker-btn');

  result.style.display = 'block';
  result.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;">
    <span class="spinner" style="border-top-color:var(--accent)"></span> Loading tracker…</div>`;
  btn.disabled = true;

  try {
    const d = await api.get(`/expenses/tracker/summary?month=${month}&year=${year}`);
    const s = d.summary;
    const a = d.investment_advice;

    const tierColor = { LOW: '#f87171', MODERATE: '#fb923c', GOOD: '#34d399', HIGH: '#60a5fa' };
    const color     = tierColor[a.tier] || 'var(--accent-lt)';

    result.innerHTML = `
      <!-- Summary cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px;">
        ${summaryCard('Total Revenue',  `₦${fmt(s.total_revenue)}`,  'var(--accent-lt)')}
        ${summaryCard('Total Expenses', `₦${fmt(s.total_expenses)}`, '#f87171')}
        ${summaryCard('Gross Profit',   `₦${fmt(s.gross_profit)}`,   s.gross_profit >= 0 ? '#34d399' : '#f87171')}
        ${summaryCard('Profit Margin',  `${s.profit_margin_pct}%`,   'var(--text)')}
      </div>

      <!-- Category breakdown -->
      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:500;color:var(--muted);margin-bottom:10px;">BREAKDOWN BY CATEGORY</div>
        ${s.breakdown.map(b => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;">
            <span style="color:var(--text)">${b.category.replace(/_/g,' ')}</span>
            <div style="display:flex;gap:12px;align-items:center;">
              <span style="color:var(--muted)">${b.percentage}%</span>
              <span style="font-weight:500;color:var(--text)">₦${fmt(b.total)}</span>
            </div>
          </div>`).join('')}
      </div>

      <!-- Investment advice -->
      <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:10px;padding:16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:${color}22;color:${color};">${a.tier}</span>
          <span style="font-size:13px;font-weight:500;color:var(--text);">Investment Advice</span>
        </div>
        <p style="font-size:13px;color:var(--muted);margin-bottom:12px;">${a.advice}</p>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px;">
          ${a.suggested_actions.map(action => `
            <li style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--text);">
              <span style="color:${color};margin-top:1px;">✓</span> ${action}
            </li>`).join('')}
        </ul>
      </div>`;

  } catch (err) {
    result.innerHTML = `<span style="color:#f87171;font-size:13px;">${err.message}</span>`;
  } finally {
    btn.disabled = false;
  }
}

function summaryCard(label, value, color) {
  return `
    <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:14px;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">${label}</div>
      <div style="font-family:var(--font-head);font-size:20px;color:${color};">${value}</div>
    </div>`;
}

function resetExpenseForm() {
  ['exp-id','exp-amount','exp-description','exp-reference'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('exp-category').value = '';
  document.getElementById('exp-payment').value  = '';
  document.getElementById('exp-date').value     = '';
  ['exp-amount-hint','exp-category-hint','exp-payment-hint','exp-date-hint'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
  document.getElementById('exp-error').classList.remove('show');
  document.getElementById('exp-success').classList.remove('show');
}