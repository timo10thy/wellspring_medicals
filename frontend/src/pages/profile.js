// ── Profile Page ──────────────────────────────────────────────────────────────

import { auth }                                    from '../js/auth.js';
import { navigate }                                from '../js/router.js';
import { renderSidebar, renderTopbar, bindSidebar,
         fmtDate }                                 from '../js/ui.js';

export function renderProfile() {
  const user = auth.user();

  return `
  <div class="page-enter app-layout">
    ${renderSidebar('profile')}
    <div class="main-content">
      ${renderTopbar('Profile', 'Your account information')}
      <div class="page-body" style="max-width:560px;">

        <div class="card" style="padding:28px;">
          <!-- Avatar -->
          <div style="display:flex;align-items:center;gap:18px;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid var(--border);">
            <div style="width:60px;height:60px;border-radius:50%;background:rgba(16,185,129,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="font-size:22px;font-weight:600;color:var(--accent-lt)">${(user?.name || 'U')[0].toUpperCase()}</span>
            </div>
            <div>
              <div style="font-family:var(--font-head);font-size:20px;color:var(--text)">${user?.name || '—'}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px">${user?.email || '—'}</div>
              <span class="badge ${user?.role === 'ADMIN' ? 'badge-yellow' : 'badge-green'}" style="margin-top:6px;">${user?.role || 'USER'}</span>
            </div>
          </div>

          <!-- Fields -->
          ${profileRow('User ID', `#${user?.id || '—'}`)}
          ${profileRow('Name', user?.name || '—')}
          ${profileRow('Email', user?.email || '—')}
          ${profileRow('Role', user?.role || '—')}

          <div style="margin-top:24px;">
            <button id="profile-logout" class="btn btn-danger" style="width:100%;">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>`;
}

export function initProfile() {
  bindSidebar();
  document.getElementById('profile-logout')?.addEventListener('click', () => {
    auth.logout();
    navigate('login');
  });
}

function profileRow(label, value) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;">
      <span style="color:var(--muted)">${label}</span>
      <span style="color:var(--text);font-weight:500">${value}</span>
    </div>`;
}