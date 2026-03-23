// ── Login Page ────────────────────────────────────────────────────────────────
// POST /auth/login → { access_token, token_type, email, user_id }
// After login, GET /auth/me to get role, then store full user object

import { api }      from '../js/api.js';
import { auth }     from '../js/auth.js';
import { navigate } from '../js/router.js';

export function renderLogin() {
  return `
  <div class="page-enter" style="min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:40px 20px;">
    <div style="width:100%;max-width:400px;">

      <!-- Logo -->
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

      <h1 style="font-family:var(--font-head);font-size:28px;color:var(--text);margin-bottom:6px;">Welcome back</h1>
      <p style="font-size:13px;color:var(--muted);margin-bottom:24px;line-height:1.6;">Sign in to your account to continue.</p>

      <!-- Error banner -->
      <div id="login-error" class="banner banner-error" style="margin-bottom:16px;">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span id="login-error-msg">Invalid credentials.</span>
      </div>

      <form id="login-form" novalidate style="display:flex;flex-direction:column;gap:14px;">

        <div>
          <label class="field-label" for="l-email">Email address</label>
          <input class="field-input" id="l-email" type="email" placeholder="you@example.com" autocomplete="email" required/>
          <p class="field-hint hint-error" id="l-email-hint"></p>
        </div>

        <div>
          <label class="field-label" for="l-password">Password</label>
          <div style="position:relative;">
            <input class="field-input" id="l-password" type="password" placeholder="••••••••" autocomplete="current-password" required style="padding-right:42px;"/>
            <button type="button" id="pw-toggle" tabindex="-1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:0;display:flex;">
              <svg id="eye-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          <p class="field-hint hint-error" id="l-pw-hint"></p>
        </div>

        <button type="submit" id="login-btn" class="btn btn-primary btn-full" style="margin-top:4px;">
          Sign in
        </button>
      </form>

      <div style="margin-top:20px;text-align:center;font-size:13px;color:var(--muted);">
        Don't have an account?
        <a data-nav="register" style="color:var(--accent-lt);cursor:pointer;text-decoration:none;"> Register</a>
      </div>
      <div style="margin-top:8px;text-align:center;">
        <a data-nav="home" style="font-size:12px;color:var(--muted);cursor:pointer;text-decoration:none;">← Back to home</a>
      </div>
    </div>
  </div>`;
}

// ── Login logic (called after render) ────────────────────────────────────────
export function initLogin() {
  const form    = document.getElementById('login-form');
  const btn     = document.getElementById('login-btn');
  const errEl   = document.getElementById('login-error');
  const errMsg  = document.getElementById('login-error-msg');
  const pwInput = document.getElementById('l-password');
  const toggle  = document.getElementById('pw-toggle');

  // Password show/hide
  toggle?.addEventListener('click', () => {
    const show = pwInput.type === 'password';
    pwInput.type = show ? 'text' : 'password';
    document.getElementById('eye-icon').innerHTML = show
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.classList.remove('show');

    const email    = document.getElementById('l-email').value.trim();
    const password = document.getElementById('l-password').value;

    // Basic front-end validation
    let hasErr = false;
    if (!email) { document.getElementById('l-email-hint').textContent = 'Email is required.'; hasErr = true; }
    else { document.getElementById('l-email-hint').textContent = ''; }
    if (!password) { document.getElementById('l-pw-hint').textContent = 'Password is required.'; hasErr = true; }
    else { document.getElementById('l-pw-hint').textContent = ''; }
    if (hasErr) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in…';

    try {
      // Step 1: Login → get token
      const data = await api.post('/auth/login', { email, password }, false);

      // Step 2: Fetch /auth/me to get name, role etc.
      // Temporarily store token so api.get can use it
      auth.set(data.access_token, { id: data.user_id, email: data.email, role: '' });
      const me = await api.get('/auth/me');

      // Step 3: Store full user
      auth.set(data.access_token, {
        id:    data.user_id,
        email: data.email,
        name:  me.name,
        role:  me.role,
      });

      navigate('dashboard');
    } catch (err) {
      errMsg.textContent = err.message;
      errEl.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Sign in';
    }
  });
}