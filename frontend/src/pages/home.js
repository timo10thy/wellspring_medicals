// ── Home / Landing Page ───────────────────────────────────────────────────────
import { auth } from '../js/auth.js';

export function renderHome() {
  return `
  <div class="page-enter" style="min-height:100vh;background:var(--bg);display:flex;flex-direction:column;">

    <!-- Nav -->
    <nav style="display:flex;align-items:center;justify-content:space-between;padding:18px 40px;border-bottom:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" width="17" height="17" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
          </svg>
        </div>
        <div>
          <span style="font-size:14px;font-weight:600;color:var(--text)">PharmaIMS</span>
          <span style="font-size:10px;color:var(--muted);margin-left:6px">Wellspring</span>
        </div>
      </div>
      <div style="display:flex;gap:10px;">
        ${auth.isLoggedIn()
          ? `<button class="btn btn-primary" data-nav="dashboard">Go to Dashboard</button>`
          : `<button class="btn btn-ghost" data-nav="login">Login</button>
             <button class="btn btn-primary" data-nav="register">Register</button>`
        }
      </div>
    </nav>

    <!-- Hero -->
    <main style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 40px;text-align:center;gap:24px;">

      <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);border-radius:99px;padding:5px 14px;font-size:12px;color:var(--accent-lt);margin-bottom:8px;">
        <span style="width:6px;height:6px;border-radius:50%;background:var(--accent);display:inline-block;animation:pulse 2s infinite"></span>
        Pharmaceutical Inventory Management System
      </div>

      <h1 style="font-family:var(--font-head);font-size:clamp(36px,6vw,64px);line-height:1.1;color:var(--text);max-width:720px;">
        Manage your pharmacy<br/><em style="color:var(--accent-lt)">with precision.</em>
      </h1>

      <p style="font-size:16px;color:var(--muted);max-width:480px;line-height:1.7;">
        Track inventory, manage sales, monitor stock expiry, and get real-time consumption reports — all in one place.
      </p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px;">
        ${auth.isLoggedIn()
          ? `<button class="btn btn-primary" style="padding:12px 28px;font-size:15px;" data-nav="dashboard">Open Dashboard</button>`
          : `<button class="btn btn-primary" style="padding:12px 28px;font-size:15px;" data-nav="register">Get Started Free</button>
             <button class="btn btn-ghost" style="padding:12px 28px;font-size:15px;" data-nav="login">Sign In</button>`
        }
      </div>

      <!-- Feature cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;max-width:800px;width:100%;margin-top:56px;">
        ${[
          { icon: '📦', title: 'Stock Tracking', desc: 'Real-time stock levels with expiry alerts' },
          { icon: '💊', title: 'Product Catalog', desc: 'Manage your full pharmaceutical product list' },
          { icon: '🧾', title: 'Sales & Receipts', desc: 'Process sales and generate instant receipts' },
          { icon: '📊', title: 'Consumption Reports', desc: 'Daily consumption rates and forecasts' },
        ].map(f => `
          <div class="card" style="padding:20px;text-align:left;">
            <div style="font-size:24px;margin-bottom:10px;">${f.icon}</div>
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px;">${f.title}</div>
            <div style="font-size:12px;color:var(--muted);line-height:1.5">${f.desc}</div>
          </div>`).join('')}
      </div>
    </main>

    <!-- Footer -->
    <footer style="text-align:center;padding:20px;font-size:12px;color:var(--muted);border-top:1px solid var(--border);">
      PharmaIMS — Wellspring &copy; ${new Date().getFullYear()}
    </footer>

    <style>
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    </style>
  </div>`;
}