// ── Admin Setup Page ──────────────────────────────────────────────────────────
// Hidden page — access via /#admin-setup?token=YOUR_SECRET_TOKEN
// POST /admin/create?setup_token=YOUR_SECRET_TOKEN

import { api }      from '../js/api.js';
import { navigate } from '../js/router.js';

export function renderAdmin() {
  return `
  <div class="page-enter" style="min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:40px 20px;">
    <div style="width:100%;max-width:400px;">

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" width="17" height="17" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
          </svg>
        </div>
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--text)">PharmaIMS</div>
          <div style="font-size:10px;color:var(--muted)">Admin Setup</div>
        </div>
      </div>

      <div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);border-radius:8px;padding:10px 14px;margin-bottom:24px;display:flex;gap:8px;align-items:flex-start;">
        <svg width="14" height="14" fill="none" stroke="#fbbf24" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:1px">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span style="font-size:12px;color:#fbbf24;line-height:1.5">
          This page is for system administrators only. A valid setup token is required.
        </span>
      </div>

      <h1 style="font-family:var(--font-head);font-size:28px;color:var(--text);margin-bottom:6px;">Create Admin</h1>
      <p style="font-size:13px;color:var(--muted);margin-bottom:24px;line-height:1.6;">
        Set up the administrator account for PharmaIMS.
      </p>

      <div id="admin-error" class="banner banner-error">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span id="admin-error-msg"></span>
      </div>
      <div id="admin-success" class="banner banner-success">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Admin account created! Redirecting to login…</span>
      </div>

      <form id="admin-form" novalidate style="display:flex;flex-direction:column;gap:13px;">
        <div>
          <label class="field-label" for="a-name">Full Name</label>
          <input class="field-input" id="a-name" type="text" placeholder="Admin name" maxlength="20"/>
          <p class="field-hint hint-error" id="a-name-hint"></p>
        </div>
        <div>
          <label class="field-label" for="a-username">Username</label>
          <input class="field-input" id="a-username" type="text" placeholder="e.g. admin_john" maxlength="20"/>
          <p class="field-hint hint-error" id="a-username-hint"></p>
        </div>
        <div>
          <label class="field-label" for="a-email">Email</label>
          <input class="field-input" id="a-email" type="email" placeholder="admin@example.com"/>
          <p class="field-hint hint-error" id="a-email-hint"></p>
        </div>
        <div>
          <label class="field-label" for="a-password">Password</label>
          <input class="field-input" id="a-password" type="password" placeholder="••••••••"/>
          <p class="field-hint hint-error" id="a-password-hint"></p>
          <div id="a-pw-rules" style="display:none;flex-direction:column;gap:4px;margin-top:8px;">
            ${[
              ['a-rule-len',   '8–20 characters'],
              ['a-rule-alpha', 'At least one letter'],
              ['a-rule-upper', 'At least one uppercase letter'],
            ].map(([id, label]) => `
              <div id="${id}" style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);">
                <span style="width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0;"></span>${label}
              </div>`).join('')}
          </div>
        </div>
        <button type="submit" id="admin-btn" class="btn btn-primary btn-full" style="margin-top:4px;">
          Create Admin Account
        </button>
      </form>

      <div style="margin-top:16px;text-align:center;">
        <a data-nav="login" style="font-size:12px;color:var(--muted);cursor:pointer;">← Back to login</a>
      </div>
    </div>
  </div>`;
}

export function initAdmin(params = {}) {
  const pwInput = document.getElementById('a-password');
  const pwRules = document.getElementById('a-pw-rules');

  // Live password rules
  pwInput?.addEventListener('focus', () => { pwRules.style.display = 'flex'; });
  pwInput?.addEventListener('input', () => {
    const v = pwInput.value;
    const checks = {
      'a-rule-len':   v.length >= 8 && v.length <= 20,
      'a-rule-alpha': /[a-zA-Z]/.test(v),
      'a-rule-upper': /[A-Z]/.test(v),
    };
    Object.entries(checks).forEach(([id, pass]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.color = v.length === 0 ? 'var(--muted)' : pass ? 'var(--accent-lt)' : '#f87171';
    });
  });

  const validators = {
    'a-name':     v => !v.trim() ? 'Name is required.'     : v.trim().length < 3 ? 'Min 3 characters.' : null,
    'a-username': v => !v.trim() ? 'Username is required.' : v.trim().length < 3 ? 'Min 3 characters.' : null,
    'a-email':    v => !v.trim() ? 'Email is required.'    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email.' : null,
    'a-password': v => {
      if (!v || !v.trim()) return 'Password cannot be empty.';
      if (!/[a-zA-Z]/.test(v)) return 'Must contain at least one letter.';
      if (!/[A-Z]/.test(v))    return 'Must contain at least one uppercase letter.';
      if (v.length < 8 || v.length > 20) return 'Must be 8–20 characters.';
      return null;
    }
  };

  const hintMap = {
    'a-name': 'a-name-hint', 'a-username': 'a-username-hint',
    'a-email': 'a-email-hint', 'a-password': 'a-password-hint'
  };

  function setField(id, err) {
    const inp  = document.getElementById(id);
    const hint = document.getElementById(hintMap[id]);
    if (!inp || !hint) return !err;
    inp.classList.remove('input-ok', 'input-error');
    hint.classList.remove('hint-ok', 'hint-error');
    if (err) {
      inp.classList.add('input-error');
      hint.classList.add('hint-error');
      hint.textContent = err;
    } else {
      inp.classList.add('input-ok');
      hint.textContent = '';
    }
    return !err;
  }

  // Blur validation
  Object.entries(validators).forEach(([id, fn]) => {
    document.getElementById(id)?.addEventListener('blur', () => {
      setField(id, fn(document.getElementById(id).value));
    });
  });

  // Form submit
  document.getElementById('admin-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('admin-error').classList.remove('show');
    document.getElementById('admin-success').classList.remove('show');

    let ok = true;
    Object.entries(validators).forEach(([id, fn]) => {
      if (!setField(id, fn(document.getElementById(id).value))) ok = false;
    });
    if (!ok) return;

    // Get token from URL query string
    // e.g. http://localhost:3001/?token=pharma-admin-2024-xK9mP3#admin-setup
    const token = params.token || '';

    const btn = document.getElementById('admin-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating…';

    try {
      await api.post(`/admin/create?setup_token=${encodeURIComponent(token)}`, {
        name:      document.getElementById('a-name').value.trim(),
        user_name: document.getElementById('a-username').value.trim(),
        email:     document.getElementById('a-email').value.trim(),
        password:  document.getElementById('a-password').value,
      }, false);

      document.getElementById('admin-success').classList.add('show');
      e.target.reset();
      pwRules.style.display = 'none';
      ['a-name','a-username','a-email','a-password'].forEach(id =>
        document.getElementById(id)?.classList.remove('input-ok','input-error'));

      setTimeout(() => navigate('login'), 2000);

    } catch (err) {
      document.getElementById('admin-error-msg').textContent = err.message;
      document.getElementById('admin-error').classList.add('show');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Create Admin Account';
    }
  });
}