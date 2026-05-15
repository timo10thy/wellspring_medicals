import { auth }            from './auth.js';
import { renderHome }      from '../pages/home.js';
import { renderLogin,      initLogin }      from '../pages/login.js';
import { renderRegister,   initRegister }   from '../pages/register.js';
import { renderDashboard,  initDashboard }  from '../pages/dashboard.js';
import { renderProducts,   initProducts }   from '../pages/products.js';
import { renderStock,      initStock }      from '../pages/stock.js';
import { renderSales,      initSales }      from '../pages/sales.js';
import { renderReports,    initReports }    from '../pages/reports.js';
import { renderProfile,    initProfile }    from '../pages/profile.js';
import { renderAdmin,      initAdmin }      from '../pages/admin.js';
import { renderExpenses,   initExpenses }   from '../pages/expenses.js';
import { renderPurchases,  initPurchases }  from '../pages/purchases.js';
import { renderStockMovement, initStockMovement } from '../pages/stock_movement.js';
import { renderReconciliation, initReconciliation } from '../pages/reconciliation.js';

const app = document.getElementById('app');

const PUBLIC_PAGES = ['home', 'login', 'register', 'admin-setup'];
const ADMIN_PAGES = ['products', 'stock', 'stock_movement', 'reports', 'expenses', 'purchases', 'reconciliation'];
const PAGES = {
  home:            { render: renderHome                                              },
  login:           { render: renderLogin,          init: initLogin                  },
  register:        { render: renderRegister,        init: initRegister              },
  dashboard:       { render: renderDashboard,       init: initDashboard             },
  products:        { render: renderProducts,        init: initProducts              },
  stock:           { render: renderStock,           init: initStock                 },
  sales:           { render: renderSales,           init: initSales                 },
  reports:         { render: renderReports,         init: initReports               },
  profile:         { render: renderProfile,         init: initProfile               },
  'admin-setup':   { render: renderAdmin,           init: initAdmin                 },
  expenses:        { render: renderExpenses,        init: initExpenses              },
  purchases:       { render: renderPurchases,       init: initPurchases             },
  reconciliation:  { render: renderReconciliation,  init: initReconciliation        },
  stock_movement: { render: renderStockMovement, init: initStockMovement },
};

export function navigate(page, params = {}) {
  if (page === 'admin-setup') {
    _render(page, params); return;
  }
  if ((page === 'login' || page === 'register') && auth.isLoggedIn()) {
    _render('dashboard'); return;
  }
  if (!PUBLIC_PAGES.includes(page) && !auth.isLoggedIn()) {
    _render('login'); return;
  }
  if (ADMIN_PAGES.includes(page) && !auth.isAdmin()) {
    _render('dashboard'); return;
  }
  _render(page, params);
}

async function _render(page, params = {}) {
  const config = PAGES[page];
  if (!config) { _render('home'); return; }

  app.innerHTML = config.render(params);
  if (app.firstElementChild) app.firstElementChild.classList.add('page-enter');

  app.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.getAttribute('data-nav'));
    });
  });

  history.pushState({ page }, '', `#${page}`);

  if (config.init) {
    try { await config.init(params); }
    catch (err) { console.error(`[PharmaIMS] Init error on "${page}":`, err); }
  }
}

window.addEventListener('popstate', (e) => {
  const page = e.state?.page || 'home';
  _render(page);
});

export function initRouter() {
  const full = location.hash.replace('#', '').trim() || 'home';
  const [page, queryString] = full.split('?');

  const hashParams   = Object.fromEntries(new URLSearchParams(queryString || ''));
  const searchParams = Object.fromEntries(new URLSearchParams(location.search || ''));
  const params       = { ...searchParams, ...hashParams };

  navigate(page, params);
}