import { api } from '../js/api.js';
import { renderSidebar, renderTopbar, bindSidebar, fmtDate, icons } from '../js/ui.js';

export function renderUsers() {
  return `
  <div class="page-enter app-layout">
    ${renderSidebar('users')}
    <div class="main-content">
      ${renderTopbar('User Management', 'Activate or deactivate staff accounts')}
      <div class="page-body">

        <!-- Summary -->
        <div id="users-summary" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;"></div>

        <!-- Users table -->
        <div class="card" style="padding:0;overflow:hidden;">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border);
                      display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:13px;font-weight:500;color:var(--text);">Staff Accounts</span>
            <div style="display:flex;gap:8px;">
              <select class="field-input" id="filter-status" style="font-size:12px;padding:4px 8px;">
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="users-tbody">
                <tr><td colspan="6" style="text-align:center;color:var(--muted);">
                  <span class="spinner" style="border-top-color:var(--accent)"></span>
                </td></tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  </div>`;
}

let allUsers = [];

export async function initUsers() {
  bindSidebar();
  await loadUsers();

  document.getElementById('filter-status')?.addEventListener('change', (e) => {
    renderTable(filterUsers(e.target.value));
  });
}

async function loadUsers() {
  try {
    allUsers = await api.get('/admin/users');
    renderSummary(allUsers);
    renderTable(allUsers);
  } catch (err) {
    document.getElementById('users-tbody').innerHTML =
      `<tr><td colspan="6" style="text-align:center;color:#f87171;">${err.message}</td></tr>`;
  }
}

function filterUsers(status) {
  if (!status) return allUsers;
  if (status === 'pending')  return allUsers.filter(u => !u.is_active);
  if (status === 'active')   return allUsers.filter(u => u.is_active);
  if (status === 'inactive') return allUsers.filter(u => !u.is_active);
  return allUsers;
}

function renderSummary(users) {
  const total   = users.length;
  const active  = users.filter(u => u.is_active).length;
  const pending = users.filter(u => !u.is_active).length;

  document.getElementById('users-summary').innerHTML = `
    <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:10px 16px;min-width:110px;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:2px;">Total Staff</div>
      <div style="font-size:20px;font-weight:600;color:var(--text);">${total}</div>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:10px 16px;min-width:110px;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:2px;">Active</div>
      <div style="font-size:20px;font-weight:600;color:#16a34a;">${active}</div>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:10px 16px;min-width:110px;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:2px;">Pending</div>
      <div style="font-size:20px;font-weight:600;color:#f59e0b;">${pending}</div>
    </div>`;
}

function renderTable(users) {
  const tbody = document.getElementById('users-tbody');
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px;">No users found.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td style="font-weight:500;">${u.name}</td>
      <td style="color:var(--muted);">@${u.user_name}</td>
      <td style="font-size:12px;">${u.email}</td>
      <td style="font-size:12px;color:var(--muted);">${fmtDate(u.created_at)}</td>
      <td>
        ${u.is_active
          ? `<span class="badge badge-green">Active</span>`
          : `<span class="badge" style="background:#fef3c7;color:#92400e;">Pending</span>`}
      </td>
      <td>
        ${u.is_active
          ? `<button class="btn btn-ghost deactivate-btn" data-id="${u.id}" data-name="${u.name}"
              style="font-size:11px;padding:4px 10px;color:#f87171;border-color:#f87171;">
              Deactivate
            </button>`
          : `<button class="btn btn-primary activate-btn" data-id="${u.id}" data-name="${u.name}"
              style="font-size:11px;padding:4px 10px;">
              Activate
            </button>`}
      </td>
    </tr>`).join('');

  // Bind activate
  tbody.querySelectorAll('.activate-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Activate ${btn.dataset.name}?`)) return;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      try {
        await api.patch(`/admin/users/${btn.dataset.id}/activate`);
        await loadUsers();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.innerHTML = 'Activate';
      }
    });
  });

  // Bind deactivate
  tbody.querySelectorAll('.deactivate-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Deactivate ${btn.dataset.name}? They will not be able to login.`)) return;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      try {
        await api.patch(`/admin/users/${btn.dataset.id}/deactivate`);
        await loadUsers();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.innerHTML = 'Deactivate';
      }
    });
  });
}