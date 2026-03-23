import { auth }     from './auth.js';
import { navigate } from './router.js';

const IS_DEV = location.port === '5500';
const BASE   = IS_DEV ? 'http://localhost:8002' : '/api';

async function request(method, path, body = null, requiresAuth = true) {
  const headers = requiresAuth
    ? auth.headers()
    : { 'Content-Type': 'application/json' };

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);

  if (res.status === 401) {
    auth.logout();
    navigate('login');
    return;
  }

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    let msg = 'Something went wrong.';
    if (typeof data.detail === 'string') msg = data.detail;
    else if (Array.isArray(data.detail) && data.detail[0]?.msg) msg = data.detail[0].msg;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  get:    (path, useAuth = true)       => request('GET',    path, null, useAuth),
  post:   (path, body, useAuth = true) => request('POST',   path, body, useAuth),
  put:    (path, body, useAuth = true) => request('PUT',    path, body, useAuth),
  delete: (path, useAuth = true)       => request('DELETE', path, null, useAuth),
};
