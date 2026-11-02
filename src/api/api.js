/**
 * api.js — satu-satunya pintu komunikasi frontend → Google Apps Script.
 */

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error('[api] VITE_API_URL belum di-set. Cek file .env di root project.');
}

const TOKEN_KEY = 'finance.token';
const USER_KEY = 'finance.user';

// ---------- Token & user helpers ----------

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function setUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser() {
  try {
    var raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// ---------- Callback auto-logout ----------

let onUnauthorized = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// ---------- Core request ----------

async function request(action, payload, opts) {
  opts = opts || {};
  var token = opts.token === false ? '' : getToken();

  var body = { action: action, payload: payload || {} };
  if (token) body.token = token;

  var res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      // text/plain tidak memicu preflight OPTIONS (GAS tidak mendukung OPTIONS)
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify(body),
    });
  } catch (e) {
    return {
      ok: false,
      data: null,
      message: 'Tidak bisa terhubung ke server. Periksa koneksi internet.',
      code: 'NETWORK_ERROR',
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      data: null,
      message: 'Server membalas status ' + res.status,
      code: 'HTTP_' + res.status,
    };
  }

  var json;
  try {
    json = await res.json();
  } catch (e) {
    return {
      ok: false,
      data: null,
      message: 'Response server bukan JSON yang valid',
      code: 'BAD_RESPONSE',
    };
  }

  if (!json.success && json.code === 'UNAUTHORIZED') {
    clearToken();
    if (typeof onUnauthorized === 'function') onUnauthorized();
  }

  return {
    ok: !!json.success,
    data: json.data,
    message: json.message || '',
    code: json.code || null,
  };
}

async function requestGet(action, params) {
  params = params || {};
  var qs = Object.keys(params)
    .filter(function (k) { return params[k] !== undefined && params[k] !== null && params[k] !== ''; })
    .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
    .join('&');
  var url = API_URL + '?action=' + encodeURIComponent(action) + (qs ? '&' + qs : '');

  var res;
  try {
    res = await fetch(url, { method: 'GET', redirect: 'follow' });
  } catch (e) {
    return { ok: false, data: null, message: 'Tidak bisa terhubung ke server.', code: 'NETWORK_ERROR' };
  }
  try {
    var json = await res.json();
    return {
      ok: !!json.success,
      data: json.data,
      message: json.message || '',
      code: json.code || null,
    };
  } catch (e) {
    return { ok: false, data: null, message: 'Response server bukan JSON yang valid', code: 'BAD_RESPONSE' };
  }
}

// ======================================================
// Modul: AUTH
// ======================================================

export const auth = {
  async register(payload) {
    var r = await request('auth.register', payload, { token: false });
    if (r.ok && r.data && r.data.token) {
      setToken(r.data.token);
      setUser({ user_id: r.data.user_id, nama: r.data.nama, email: r.data.email });
    }
    return r;
  },

  async login(payload) {
    var r = await request('auth.login', payload, { token: false });
    if (r.ok && r.data && r.data.token) {
      setToken(r.data.token);
      setUser({ user_id: r.data.user_id, nama: r.data.nama, email: r.data.email });
    }
    return r;
  },

  async logout() {
    var r = await request('auth.logout', {}, {});
    clearToken();
    return r;
  },

  async me() {
    var token = getToken();
    var r = await requestGet('auth.me', { token: token });
    if (r.ok && r.data) setUser(r.data);
    return r;
  },
};

// ======================================================
// Modul: CATEGORIES
// ======================================================

export const categories = {
  list(params) {
    return request('categories.list', params || {});
  },
  create(payload) {
    return request('categories.create', payload);
  },
  update(payload) {
    return request('categories.update', payload);
  },
  remove(payload) {
    return request('categories.delete', payload);
  },
};

// ======================================================
// Modul: TRANSACTIONS
// ======================================================

export const transactions = {
  list(params) {
    return request('transactions.list', params || {});
  },
  create(payload) {
    return request('transactions.create', payload);
  },
  update(payload) {
    return request('transactions.update', payload);
  },
  remove(payload) {
    return request('transactions.delete', payload);
  },
  summary(params) {
    return request('transactions.summary', params || {});
  },
};

// ======================================================
// Modul: SAVINGS
// ======================================================

export const savings = {
  goals: {
    list(params) {
      return request('savings.goals.list', params || {});
    },
    create(payload) {
      return request('savings.goals.create', payload);
    },
    update(payload) {
      return request('savings.goals.update', payload);
    },
    remove(payload) {
      return request('savings.goals.delete', payload);
    },
  },
  history: {
    list(params) {
      return request('savings.history.list', params || {});
    },
    create(payload) {
      return request('savings.history.create', payload);
    },
  },
};

// ======================================================
// Modul: BUDGETS
// ======================================================

export const budgets = {
  list(params) {
    return request('budgets.list', params || {});
  },
  create(payload) {
    return request('budgets.create', payload);
  },
  update(payload) {
    return request('budgets.update', payload);
  },
  remove(payload) {
    return request('budgets.delete', payload);
  },
  status(params) {
    return request('budgets.status', params || {});
  },
};

// ======================================================
// Ping
// ======================================================

export function ping() {
  return requestGet('ping', {});
}

// ======================================================
// Helper tampilan
// ======================================================

export function formatRupiah(n) {
  var num = Number(n) || 0;
  return 'Rp ' + num.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

export function formatTanggal(iso) {
  if (!iso) return '-';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function namaBulan(m) {
  var arr = ['Januari','Februari','Maret','April','Mei','Juni',
             'Juli','Agustus','September','Oktober','November','Desember'];
  return arr[(Number(m) || 1) - 1];
}