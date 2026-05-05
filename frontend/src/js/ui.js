import { auth }     from './auth.js';
import { navigate } from './router.js';

export const icons = {
  grid:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  box:      `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  stack:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
  cart:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
  chart:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  user:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  logout:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  search:   `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  plus:     `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  x:        `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  check:    `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  alert:    `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  refresh:  `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  receipt:  `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  wallet:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h.01"/><path d="M2 10h20"/></svg>`,
  shopping: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  hamburger:`<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  close:    `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  recon:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
};

export function logoHTML() {
  return `
    <div class="logo-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
      </svg>
    </div>
    <div>
      <div style="font-size:14px;font-weight:600;color:var(--text);line-height:1.2">PharmaIMS</div>
      <div style="font-size:10px;color:var(--muted)">Wellspring</div>
    </div>`;
}

export function renderSidebar(activePage) {
  const user    = auth.user();
  const isAdmin = auth.isAdmin();

  const navItems = [
    { page: 'dashboard',      icon: icons.grid,     label: 'Dashboard'                          },
    { page: 'sales',          icon: icons.cart,     label: 'Sales',          roles: ['ADMIN','USER'] },
    { page: 'products',       icon: icons.box,      label: 'Products',       roles: ['ADMIN']        },
    { page: 'stock',          icon: icons.stack,    label: 'Stock',          roles: ['ADMIN']        },
    { page: 'expenses',       icon: icons.wallet,   label: 'Expenses',       roles: ['ADMIN']        },
    { page: 'purchases',      icon: icons.shopping, label: 'Purchases',      roles: ['ADMIN']        },
    { page: 'reports',        icon: icons.chart,    label: 'Reports',        roles: ['ADMIN']        },
    { page: 'reconciliation', icon: icons.recon,    label: 'Reconciliation', roles: ['ADMIN']        },
    { page: 'profile',        icon: icons.user,     label: 'Profile',        roles: ['ADMIN','USER'] },
  ];

  const navHTML = navItems
    .filter(item => !item.roles || item.roles.includes(user?.role))
    .map(item => `
      <a class="nav-item ${activePage === item.page ? 'active' : ''}" data-nav="${item.page}">
        ${item.icon} ${item.label}
      </a>`).join('');

  return `
    <!-- Mobile overlay backdrop -->
    <div id="sidebar-overlay" style="
      display:none;
      position:fixed;
      inset:0;
      background:rgba(0,0,0,0.5);
      z-index:99;
    "></div>

    <aside class="sidebar" id="sidebar" style="
      position:fixed;
      top:0; left:0; bottom:0;
      z-index:100;
      transform:translateX(-100%);
      transition:transform 0.25s ease;
      width:220px;
    ">
      <div style="padding:20px 16px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border);">
        ${logoHTML()}
        <!-- Close button — mobile only -->
        <button id="sidebar-close-btn" style="
          margin-left:auto;
          background:none;
          border:none;
          color:var(--muted);
          cursor:pointer;
          padding:4px;
          display:none;
        ">${icons.close}</button>
      </div>
      <nav style="flex:1;padding:12px 0;overflow-y:auto;">${navHTML}</nav>
      <div style="padding:14px 16px;border-top:1px solid var(--border);">
        <div style="display:flex;align-items:center;gap:10px;padding:10px 6px;margin-bottom:4px;">
          <div style="width:32px;height:32px;border-radius:50%;background:rgba(16,185,129,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="font-size:12px;font-weight:600;color:var(--accent-lt)">${(user?.name||'U')[0].toUpperCase()}</span>
          </div>
          <div style="min-width:0;">
            <div style="font-size:12px;font-weight:500;color:var(--text)">${user?.name||'User'}</div>
            <div style="font-size:10px;color:var(--muted)">${user?.role||''}</div>
          </div>
        </div>
        <button id="logout-btn" class="nav-item" style="width:100%;color:#f87171;border:none;background:none;">
          ${icons.logout} Logout
        </button>
      </div>
    </aside>`;
}

export function renderTopbar(title, subtitle = '') {
  return `
    <header class="topbar" style="display:flex;align-items:center;gap:12px;">
      <!-- Hamburger button -->
      <button id="hamburger-btn" style="
        background:none;
        border:none;
        color:var(--text);
        cursor:pointer;
        padding:6px;
        border-radius:6px;
        display:flex;
        align-items:center;
        justify-content:center;
        flex-shrink:0;
      ">${icons.hamburger}</button>
      <div>
        <div style="font-family:var(--font-head);font-size:18px;color:var(--text)">${title}</div>
        ${subtitle ? `<div style="font-size:11px;color:var(--muted);margin-top:1px">${subtitle}</div>` : ''}
      </div>
    </header>`;
}

export function bindSidebar() {
  const sidebar      = document.getElementById('sidebar');
  const overlay      = document.getElementById('sidebar-overlay');
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const closeBtn     = document.getElementById('sidebar-close-btn');

  function openSidebar() {
    sidebar.style.transform = 'translateX(0)';
    overlay.style.display   = 'block';
    closeBtn.style.display  = 'flex';
  }

  function closeSidebar() {
    sidebar.style.transform = 'translateX(-100%)';
    overlay.style.display   = 'none';
    closeBtn.style.display  = 'none';
  }

  function handleResize() {
    if (window.innerWidth >= 768) {
      sidebar.style.transform = 'translateX(0)';
      overlay.style.display   = 'none';
      closeBtn.style.display  = 'none';
      if (hamburgerBtn) hamburgerBtn.style.display = 'none';
    } else {
      sidebar.style.transform = 'translateX(-100%)';
      if (hamburgerBtn) hamburgerBtn.style.display = 'flex';
    }
  }

  handleResize();
  window.addEventListener('resize', handleResize);

  hamburgerBtn?.addEventListener('click', openSidebar);
  closeBtn?.addEventListener('click', closeSidebar);
  overlay?.addEventListener('click', closeSidebar);

  document.querySelectorAll('.nav-item[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      if (window.innerWidth < 768) closeSidebar();
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    auth.logout();
    navigate('login');
  });
}

export function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
export function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
export function bindModalClose(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', e => { if (e.target === el) closeModal(id); });
  el.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => closeModal(id)));
}

export function tableLoadingRow(cols) {
  return `<tr><td colspan="${cols}" style="padding:40px;text-align:center;color:var(--muted);font-size:13px;">
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
      <div class="spinner" style="border-top-color:var(--accent)"></div> Loading…
    </div></td></tr>`;
}
export function tableEmptyRow(cols, msg = 'No records found.') {
  return `<tr><td colspan="${cols}" style="padding:48px;text-align:center;color:var(--muted);font-size:13px;">${msg}</td></tr>`;
}

export function fmt(n, d = 2) {
  return Number(n).toLocaleString('en-NG', { minimumFractionDigits: d, maximumFractionDigits: d });
}
export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
export function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

export function showBanner(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `banner banner-${type} show`;
  const span = el.querySelector('span');
  if (span) span.textContent = msg;
  else el.innerHTML = `<span>${msg}</span>`;
}

export function hideBanner(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}