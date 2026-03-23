// ── Auth Store ───────────────────────────────────────────────────────────────
// Manages JWT token and current user session in localStorage

const TOKEN_KEY = 'pharma_token';
const USER_KEY  = 'pharma_user';

export const auth = {
  /** Save token + user after login */
  set(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  /** Get the raw JWT string */
  token() {
    return localStorage.getItem(TOKEN_KEY);
  },

  /** Get the stored user object {id, email, role} */
  user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); }
    catch { return null; }
  },

  /** True if a token exists (does NOT verify expiry — backend will reject) */
  isLoggedIn() {
    return !!this.token();
  },

  isAdmin() {
    const u = this.user();
    return u && u.role === 'ADMIN';
  },

  /** Clear session */
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /** Authorization header for fetch calls */
  headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token()}`
    };
  }
};