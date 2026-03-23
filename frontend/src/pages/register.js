// ── Register Page ─────────────────────────────────────────────────────────────
// POST /user/user/create → UserResponse

import { api }      from '../js/api.js';
import { navigate } from '../js/router.js';

export function renderRegister() {
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
          <div style="font-size:10px;color:var(--muted)">Wellspring</div>
        </div>
      </div>

      <h1 style="font-family:var(--font-head);font-size:28px;color:var(--text);margin-bottom:6px;">Create account</h1>
      <p style="font-size:13px;color:var(--muted);margin-bottom:24px;line-height:1.6;">
        Register for a standard user account. Admin accounts are created by the system owner.
      </p>

      <div id="reg-error" class="banner banner-error">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span id="reg-error-msg"></span>
      </div>
      <div id="reg-success" class="banner banner-success">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Account created! Redirecting to login…</span>
      </div>

      <form id="reg-form" novalidate style="display:flex;flex-direction:column;gap:13px;">
        <div>
          <label class="field-label" for="r-name">Full name</label>
          <input class="field-input" id="r-name" type="text" placeholder="Your name" autocomplete="name" maxlength="20"/>
          <p class="field-hint" id="r-name-hint"></p>
        </div>
        <div>
          <label class="field-label" for="r-username">Username</label>
          <input class="field-input" id="r-username" type="text" placeholder="e.g. john_doe" autocomplete="username" maxlength="20"/>
          <p class="field-hint" id="r-username-hint"></p>
        </div>
        <div>
          <label class="field-label" for="r-email">Email</label>
          <input class="field-input" id="r-email" type="email" placeholder="you@example.com" autocomplete="email"/>
          <p class="field-hint" id="r-email-hint"></p>
        </div>
        <div>
          <label class="field-label" for="r-password">Password</label>
          <input class="field-input" id="r-password" type="password" placeholder="••••••••" autocomplete="new-password"/>
          <p class="field-hint" id="r-pw-hint"></p>
          <div id="pw-rules" style="display:none;flex-direction:column;gap:4px;margin-top:8px;">
            ${[
              ['rule-len',   '8–20 characters'],
              ['rule-alpha', 'At least one letter'],
              ['rule-upper', 'At least one uppercase letter'],
              ['rule-space', 'Not blank or whitespace-only'],
            ].map(([id,label]) => `
              <div id="${id}" style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);transition:color .2s;">
                <span style="width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0;"></span>${label}
              </div>`).join('')}
          </div>
        </div>
        <button type="submit" id="reg-btn" class="btn btn-primary btn-full" style="margin-top:4px;">Create account</button>
      </form>

      <div style="margin-top:16px;text-align:center;font-size:13px;color:var(--muted);">
        Already have an account?
        <a data-nav="login" style="color:var(--accent-lt);cursor:pointer;"> Sign in</a>
      </div>
      <div style="margin-top:8px;text-align:center;">
        <a data-nav="home" style="font-size:12px;color:var(--muted);cursor:pointer;">← Back to home</a>
      </div>
    </div>
  </div>`;
}

export function initRegister() {
  const pwInput = document.getElementById('r-password');
  const pwRules = document.getElementById('pw-rules');

  function setField(inputId, hintId, err) {
    const inp  = document.getElementById(inputId);
    const hint = document.getElementById(hintId);
    inp.classList.remove('input-ok','input-error');
    hint.classList.remove('hint-ok','hint-error');
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

  const validators = {
    'r-name':     v => !v.trim() ? 'Name is required.' : v.trim().length < 3 ? 'Min 3 characters.' : v.trim().length > 20 ? 'Max 20 characters.' : null,
    'r-username': v => !v.trim() ? 'Username is required.' : v.trim().length < 3 ? 'Min 3 characters.' : v.trim().length > 20 ? 'Max 20 characters.' : null,
    'r-email':    v => !v.trim() ? 'Email is required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email.' : null,
    'r-password': v => {
      if (!v || !v.trim()) return 'Password cannot be empty.';
      if (!/[a-zA-Z]/.test(v)) return 'Must contain at least one letter.';
      if (!/[A-Z]/.test(v)) return 'Must contain at least one uppercase letter.';
      if (v.length < 8 || v.length > 20) return 'Must be 8–20 characters.';
      return null;
    }
  };

  const hintMap = { 'r-name':'r-name-hint','r-username':'r-username-hint','r-email':'r-email-hint','r-password':'r-pw-hint' };

  // Blur validation
  Object.entries(validators).forEach(([id, fn]) => {
    document.getElementById(id)?.addEventListener('blur', () => {
      setField(id, hintMap[id], fn(document.getElementById(id).value));
    });
  });

  // Live password rules
  pwInput?.addEventListener('focus', () => { pwRules.style.display = 'flex'; });
  pwInput?.addEventListener('input', () => {
    const v = pwInput.value;
    const checks = {
      'rule-len':   v.length >= 8 && v.length <= 20,
      'rule-alpha': /[a-zA-Z]/.test(v),
      'rule-upper': /[A-Z]/.test(v),
      'rule-space': v.trim().length > 0,
    };
    Object.entries(checks).forEach(([id, pass]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.color = v.length === 0 ? 'var(--muted)' : pass ? 'var(--accent-lt)' : '#f87171';
    });
  });

  document.getElementById('reg-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('reg-error').classList.remove('show');
    document.getElementById('reg-success').classList.remove('show');

    let ok = true;
    Object.entries(validators).forEach(([id, fn]) => {
      if (!setField(id, hintMap[id], fn(document.getElementById(id).value))) ok = false;
    });
    if (!ok) return;

    const btn = document.getElementById('reg-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating account…';

    try {
      await api.post('/user/user/create', {
        name:      document.getElementById('r-name').value.trim(),
        user_name: document.getElementById('r-username').value.trim(),
        email:     document.getElementById('r-email').value.trim(),
        password:  document.getElementById('r-password').value,
      }, false);

      document.getElementById('reg-success').classList.add('show');
      e.target.reset();
      ['r-name','r-username','r-email','r-password'].forEach(id =>
        document.getElementById(id)?.classList.remove('input-ok','input-error'));
      pwRules.style.display = 'none';

      setTimeout(() => navigate('login'), 1500);
    } catch (err) {
      document.getElementById('reg-error-msg').textContent = err.message;
      document.getElementById('reg-error').classList.add('show');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Create account';
    }
  });
}