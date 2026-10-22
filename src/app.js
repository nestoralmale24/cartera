(function () {
'use strict';

/* =========================================================
   Utilidades
   ========================================================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 86400000;
const pad = n => String(n).padStart(2, '0');
const newId = p => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function toEd(s) { const [y, m, d] = String(s).split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); }
function fromEd(e) { const d = new Date(e * DAY); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
const todayEd = () => toEd(todayStr());
function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && isFinite(toEd(s)); }

const G = { useGrouping: 'always' };
const NF = new Intl.NumberFormat('es-ES', Object.assign({ style: 'currency', currency: 'EUR' }, G));
const NF0 = new Intl.NumberFormat('es-ES', Object.assign({ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }, G));
const NQ = new Intl.NumberFormat('es-ES', Object.assign({ maximumFractionDigits: 6 }, G));
const NP = new Intl.NumberFormat('es-ES', Object.assign({ minimumFractionDigits: 2, maximumFractionDigits: 2 }, G));
const NC = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 });
const DF = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const DFs = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const MINUS = '−';
const okNum = v => v != null && isFinite(v);
function eur(v) { return okNum(v) ? NF.format(v).replace('-', MINUS) : '-'; }
function eur0(v) { return okNum(v) ? NF0.format(v).replace('-', MINUS) : '-'; }
function seur(v) { return okNum(v) ? (v >= 0 ? '+' : MINUS) + NF.format(Math.abs(v)) : '-'; }
function pct(v) { return okNum(v) ? (v >= 0 ? '+' : MINUS) + NP.format(Math.abs(v * 100)) + ' %' : '-'; }
function qtyf(q) { return okNum(q) ? NQ.format(q) : '-'; }
function pxf(v) {
  if (!okNum(v)) return '-';
  const d = Math.abs(v) < 1 ? 4 : 2;
  return new Intl.NumberFormat('es-ES', Object.assign({ style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d }, G)).format(v);
}
function compactEur(v) { return NC.format(v) + ' €'; }
function datef(s) { return validDate(s) ? DF.format(new Date(toEd(s) * DAY)) : '-'; }
function datefs(s) { return validDate(s) ? DFs.format(new Date(toEd(s) * DAY)) : '-'; }
function cls(v) { return v > 0.000001 ? 'up' : v < -0.000001 ? 'down' : 'muted'; }
function parseNum(s) {
  if (typeof s === 'number') return s;
  s = String(s == null ? '' : s).trim().replace(/\s|€|%/g, '');
  if (!s) return NaN;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (s.includes(',')) s = s.replace(',', '.');
  return Number(s);
}
function round(v, d) { const f = Math.pow(10, d); return Math.round(v * f) / f; }
function sig(v) { if (!okNum(v)) return v; const a = Math.abs(v); return round(v, a >= 1000 ? 2 : a >= 1 ? 4 : 8); }
function numIn(v, d = 2) { return okNum(v) ? String(round(v, d)).replace('.', ',') : ''; }
function ago(ts) {
  if (!ts) return '';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'ahora mismo';
  if (m < 60) return 'hace ' + m + ' min';
  const h = Math.round(m / 60);
  if (h < 24) return 'hace ' + h + ' h';
  const d = Math.round(h / 24);
  return d === 1 ? 'hace 1 día' : 'hace ' + d + ' días';
}
function lastLE(arr, x) { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= x) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* almacenamiento no disponible */ } }
const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const STANDALONE = !!window.CARTERA_STANDALONE;
const isDesk = () => window.matchMedia ? window.matchMedia('(min-width:760px)').matches : true;

const svgI = d => '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
const IC = {
  close: svgI('<path d="M6 6l12 12M18 6L6 18"/>'),
  back: svgI('<path d="M15 5l-7 7 7 7"/>'),
  plus: svgI('<path d="M12 5v14M5 12h14"/>'),
  edit: svgI('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  trash: svgI('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>'),
  ext: svgI('<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>')
};

/* =========================================================
   Catálogo y tipos
   ========================================================= */
const TYPES = {
  stock: { l: 'Acción', p: 'Acciones', k: '--k-stock' },
  etf: { l: 'ETF', p: 'ETFs', k: '--k-etf' },
  fund: { l: 'Fondo', p: 'Fondos', k: '--k-fund' },
  crypto: { l: 'Cripto', p: 'Cripto', k: '--k-crypto' },
  other: { l: 'Otro', p: 'Otros', k: '--k-other' }
};
const TYPE_ORDER = ['stock', 'etf', 'fund', 'crypto', 'other'];
const typeOf = a => TYPES[a && a.type] ? a.type : 'other';
const YQ = { EQUITY: 'stock', ETF: 'etf', MUTUALFUND: 'fund', CRYPTOCURRENCY: 'crypto' };
const C = (symbol, name, type, currency, isin, exch) => ({ symbol, name, type, currency, isin, exch });
const CATALOG = [
  C('IWDA.AS', 'iShares Core MSCI World UCITS ETF (Acc)', 'etf', 'EUR', 'IE00B4L5Y983', 'Ámsterdam'),
  C('EUNL.DE', 'iShares Core MSCI World UCITS ETF (Acc)', 'etf', 'EUR', 'IE00B4L5Y983', 'Xetra'),
  C('VWCE.DE', 'Vanguard FTSE All-World UCITS ETF (Acc)', 'etf', 'EUR', 'IE00BK5BQT80', 'Xetra'),
  C('SXR8.DE', 'iShares Core S&P 500 UCITS ETF (Acc)', 'etf', 'EUR', 'IE00B5BMR087', 'Xetra'),
  C('VUSA.AS', 'Vanguard S&P 500 UCITS ETF (Dist)', 'etf', 'EUR', 'IE00B3XXRP09', 'Ámsterdam'),
  C('EMIM.AS', 'iShares Core MSCI EM IMI UCITS ETF (Acc)', 'etf', 'EUR', 'IE00BKM4GZ66', 'Ámsterdam'),
  C('0P00000WLG.F', 'Vanguard Global Stock Index Fund EUR Acc', 'fund', 'EUR', 'IE00B03HD191', 'Fondo'),
  C('', 'Fidelity MSCI World Index Fund P-ACC-EUR', 'fund', 'EUR', 'IE00BYX5NX33', 'Fondo'),
  C('', 'Vanguard U.S. 500 Stock Index Fund EUR Acc', 'fund', 'EUR', 'IE0032126645', 'Fondo'),
  C('', 'Vanguard Emerging Markets Stock Index Fund EUR Acc', 'fund', 'EUR', 'IE0031786696', 'Fondo'),
  C('', 'Amundi Index MSCI World AE-C', 'fund', 'EUR', 'LU0996182563', 'Fondo'),
  C('', 'iShares Developed World Index Fund (IE) D Acc EUR', 'fund', 'EUR', 'IE00BD0NCM55', 'Fondo'),
  C('AAPL', 'Apple', 'stock', 'USD', '', 'NASDAQ'),
  C('MSFT', 'Microsoft', 'stock', 'USD', '', 'NASDAQ'),
  C('NVDA', 'NVIDIA', 'stock', 'USD', '', 'NASDAQ'),
  C('AMZN', 'Amazon', 'stock', 'USD', '', 'NASDAQ'),
  C('GOOGL', 'Alphabet (clase A)', 'stock', 'USD', '', 'NASDAQ'),
  C('META', 'Meta Platforms', 'stock', 'USD', '', 'NASDAQ'),
  C('TSLA', 'Tesla', 'stock', 'USD', '', 'NASDAQ'),
  C('SAN.MC', 'Banco Santander', 'stock', 'EUR', '', 'Madrid'),
  C('BBVA.MC', 'BBVA', 'stock', 'EUR', '', 'Madrid'),
  C('ITX.MC', 'Inditex', 'stock', 'EUR', '', 'Madrid'),
  C('IBE.MC', 'Iberdrola', 'stock', 'EUR', '', 'Madrid'),
  C('TEF.MC', 'Telefónica', 'stock', 'EUR', '', 'Madrid'),
  C('REP.MC', 'Repsol', 'stock', 'EUR', '', 'Madrid'),
  C('BTC-EUR', 'Bitcoin', 'crypto', 'EUR', '', 'Cripto'),
  C('ETH-EUR', 'Ethereum', 'crypto', 'EUR', '', 'Cripto'),
  C('SOL-EUR', 'Solana', 'crypto', 'EUR', '', 'Cripto'),
  C('XRP-EUR', 'XRP', 'crypto', 'EUR', '', 'Cripto'),
  C('ADA-EUR', 'Cardano', 'crypto', 'EUR', '', 'Cripto')
];

/* =========================================================
   Almacén: db por usuario (privado), con respaldo local
   ========================================================= */
const S = {
  mode: 'loading', docs: new Map(), demo: false, demoDocs: new Map(),
  uid: null, col: null, unsub: null, err: null, pendingIds: new Set(), retry: new Set(), diag: [], localReason: ''
};
const LS_CACHE = 'cartera.cache.v1', LS_LOCAL = 'cartera.local.v1', LS_UI = 'cartera.ui.v1';
const WQ = new Map();
const D = () => (S.demo ? S.demoDocs : S.docs);
const all = kind => Array.from(D().values()).filter(d => d && d.kind === kind);
function settings() { return D().get('settings') || { id: 'settings', kind: 'settings', fx: {}, fxHist: {} }; }
function diag(msg) { S.diag.push(new Date().toLocaleTimeString('es-ES') + '  ' + msg); if (S.diag.length > 60) S.diag.shift(); }

function normDoc(s) {
  if (s == null || typeof s !== 'object') return null;
  if (s.exists === false) return null;
  if (typeof s.exists === 'function' && !s.exists()) return null;
  let d = s;
  if (typeof s.data === 'function') d = s.data();
  else if (s.data && typeof s.data === 'object' && !Array.isArray(s.data)) d = s.data;
  if (!d || typeof d !== 'object') return null;
  if (!d.id && s.id) d = Object.assign({}, d, { id: s.id });
  return d;
}
function normList(s) {
  if (!s) return [];
  let arr = Array.isArray(s) ? s : Array.isArray(s.docs) ? s.docs : Array.isArray(s.items) ? s.items : Array.isArray(s.documents) ? s.documents : Array.isArray(s.results) ? s.results : null;
  if (!arr && typeof s.forEach === 'function') { arr = []; s.forEach(x => arr.push(x)); }
  if (!arr) return [];
  return arr.map(normDoc).filter(d => d && d.id && d.kind);
}
function loadInto(map, docs) { map.clear(); for (const d of docs || []) if (d && d.id && d.kind) map.set(d.id, d); }

async function initStore() {
  const cl = window.claude;
  if (!cl || typeof cl.use !== 'function') return startLocal(STANDALONE ? 'Versión independiente' : 'Abierta fuera de Claude');
  const cache = lsGet(LS_CACHE);
  if (cache && Array.isArray(cache.docs) && cache.docs.length) { loadInto(S.docs, cache.docs); S.mode = 'cache'; scheduleRender(); }
  let db = null, user = null;
  try { [db, user] = await Promise.all([cl.use('db'), cl.use('user')]); } catch (e) { diag('use() falló: ' + (e && e.message || e)); }
  if (!db || !user) return startLocal(db ? 'Sin identidad de usuario' : 'Base de datos no disponible (¿sesión iniciada?)');
  try { S.uid = await user.id(); } catch (e) { diag('user.id() falló'); }
  if (!S.uid) return startLocal('Sin identidad de usuario');
  if (cache && cache.uid && cache.uid !== S.uid) { S.docs.clear(); }
  try { S.col = db.collection('data/users/' + S.uid); } catch (e) { diag('collection() falló: ' + (e && e.message)); return startLocal('Ruta de datos no válida'); }
  diag('db lista');
  subscribe();
}
function subscribe() {
  const onData = snap => applyRemote(normList(snap));
  const onErr = e => {
    S.err = 'No pude leer tus datos guardados.';
    diag('lectura falló: ' + (e && (e.code || e.message) || e));
    if (S.mode !== 'db') startLocal('No se pudo leer la base de datos');
    renderBanner();
  };
  try {
    if (typeof S.col.onSnapshot === 'function') S.unsub = S.col.onSnapshot(onData, onErr);
    else if (typeof S.col.get === 'function') S.col.get().then(onData, onErr);
    else throw new Error('API de base de datos desconocida');
  } catch (e) { onErr(e); }
}
function applyRemote(list) {
  const first = S.mode !== 'db';
  const busy = id => WQ.has(id) || S.pendingIds.has(id);
  const incoming = new Map(list.map(d => [d.id, d]));
  for (const [id, d] of incoming) if (!busy(id)) S.docs.set(id, d);
  for (const id of Array.from(S.docs.keys())) if (!incoming.has(id) && !busy(id)) S.docs.delete(id);
  S.mode = 'db'; S.err = null;
  if (first) {
    diag('primera lectura: ' + list.length + ' registros');
    for (const id of S.pendingIds) writeDoc(id);
    S.pendingIds.clear();
    if (S.demo) S.needPlans = true; else runPlans();
  }
  cacheSave();
  scheduleRender();
}
function startLocal(reason) {
  if (S.mode === 'local') return;
  diag('modo local: ' + reason);
  S.localReason = reason;
  const saved = lsGet(LS_LOCAL);
  loadInto(S.docs, saved && saved.docs);
  S.mode = 'local';
  runPlans();
  scheduleRender();
}
let cacheT = 0;
function cacheSave() {
  if (S.mode !== 'db') return;
  clearTimeout(cacheT);
  cacheT = setTimeout(() => lsSet(LS_CACHE, { uid: S.uid, docs: Array.from(S.docs.values()) }), 700);
}
function put(doc, quiet) {
  doc.updatedAt = Date.now();
  D().set(doc.id, doc);
  persist(doc.id);
  if (!quiet) { scheduleRender(); }
}
function remove(id) { D().delete(id); persist(id); scheduleRender(); }
function persist(id) {
  if (S.demo) return;
  if (S.mode === 'local') { lsSet(LS_LOCAL, { docs: Array.from(S.docs.values()) }); return; }
  if (S.mode !== 'db') { S.pendingIds.add(id); return; }
  cacheSave();
  writeDoc(id);
}
function writeDoc(id) {
  const st = WQ.get(id);
  if (st) { st.again = true; return; }
  const me = { again: false };
  WQ.set(id, me); setSync();
  (async () => {
    try {
      do {
        me.again = false;
        const d = S.docs.get(id);
        const ref = S.col.doc(id);
        if (d) {
          const data = clone(d);
          try { await ref.set(data); }
          catch (e) {
            diag('set ' + id + ' falló: ' + (e && (e.code || e.message)));
            if (typeof ref.update === 'function') await ref.update(data); else throw e;
          }
        } else {
          await ref.delete();
        }
      } while (me.again);
      S.err = null; S.retry.delete(id);
    } catch (e) {
      S.err = 'No se pudo guardar el último cambio.';
      diag('escritura ' + id + ' falló: ' + (e && (e.code || '')) + ' ' + (e && e.message || e));
      S.retry.add(id);
    } finally {
      WQ.delete(id); setSync(); renderBanner();
    }
  })();
}
function setSync() {
  const el = $('#sync'); if (!el) return;
  let t = '', err = false;
  if (S.demo) t = 'Ejemplo';
  else if (S.mode === 'local') t = STANDALONE ? 'En este dispositivo' : 'Solo en este navegador';
  else if (S.mode === 'loading' || S.mode === 'cache') t = 'Conectando';
  else if (WQ.size) t = 'Guardando';
  else if (S.err) { t = 'Sin guardar'; err = true; }
  else t = 'Sincronizado';
  el.textContent = t; el.classList.toggle('err', err);
}

/* =========================================================
   Cálculos
   ========================================================= */
function curOf(a) { return a.currency === 'GBp' ? 'GBP' : (a.currency || 'EUR'); }
function mulOf(a) { return a.currency === 'GBp' ? 0.01 : 1; }
function fxNow(cur) { if (cur === 'EUR') return 1; const f = (settings().fx || {})[cur]; return f > 0 ? f : null; }
function fxOn(cur, e) {
  if (cur === 'EUR') return 1;
  const h = (settings().fxHist || {})[cur];
  if (h && h.t && h.t.length) { const i = lastLE(h.t, e); if (i >= 0) return h.c[i]; }
  return fxNow(cur);
}
function unitFx(a, e) { const f = e == null ? fxNow(curOf(a)) : fxOn(curOf(a), e); return mulOf(a) * (f || 1); }
function priceEUR(a) { return a.price > 0 ? a.price * unitFx(a) : null; }
function prevEUR(a) { return a.prev > 0 ? a.prev * unitFx(a) : null; }

function txsOf(a) {
  const seen = new Set();
  return (a.txs || []).filter(t => t && validDate(t.date) && !seen.has(t.id) && seen.add(t.id))
    .sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : (x.side === 'buy' ? -1 : 1));
}
function applyTx(st, t) {
  const noPrice = t.pending || !(t.price > 0) || !(t.qty > 0);
  if (noPrice) { if (t.side !== 'sell') { st.pend += +t.amount || 0; st.pendN++; } return; }
  const fees = +t.fees || 0;
  if (t.side === 'sell') {
    const avg = st.qty > 0 ? st.cost / st.qty : 0;
    const q = Math.min(t.qty, st.qty);
    st.cost -= avg * q; st.realized += q * t.price - fees - avg * q; st.qty -= q;
    if (st.qty < 1e-10) { st.qty = 0; st.cost = 0; }
  } else { st.qty += t.qty; st.cost += t.qty * t.price + fees; }
  if (t.est) st.estN++;
}
function calcPos(a, skipTxId) {
  const st = { qty: 0, cost: 0, realized: 0, pend: 0, pendN: 0, estN: 0 };
  for (const t of txsOf(a)) if (t.id !== skipTxId) applyTx(st, t);
  const px = priceEUR(a), pv = prevEUR(a);
  const value = (px != null ? st.qty * px : st.cost) + st.pend;
  const cost = st.cost + st.pend;
  const pnl = value - cost;
  return {
    qty: st.qty, cost, avg: st.qty > 0 ? st.cost / st.qty : 0, price: px, value, pnl, pnlPct: cost > 0 ? pnl / cost : 0,
    realized: st.realized, day: (px != null && pv != null) ? st.qty * (px - pv) : 0, pendN: st.pendN, estN: st.estN
  };
}
function dedupeSort(arr) {
  const seen = new Set();
  return (arr || []).filter(m => m && validDate(m.date) && !seen.has(m.id) && seen.add(m.id)).sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0);
}
function cashCalc(c, endE) {
  if (endE == null) endE = todayEd();
  const moves = dedupeSort(c.moves);
  const rates = (c.rates || []).filter(r => validDate(r.from)).map(r => ({ e: toEd(r.from), apy: +r.apy || 0 })).sort((a, b) => a.e - b.e);
  let apyNow = rates.length ? rates[0].apy : 0;
  for (const r of rates) if (r.e <= endE) apyNow = r.apy;
  if (!moves.length) return { bal: 0, principal: 0, interest: 0, start: endE, ser: null, pser: null, apy: apyNow };
  const start = Math.min(toEd(moves[0].date), endE);
  const by = new Map();
  for (const m of moves) { const e = toEd(m.date); by.set(e, (by.get(e) || 0) + (+m.amount || 0)); }
  const n = endE - start + 1;
  const ser = new Float64Array(n), pser = new Float64Array(n);
  let b = 0, p = 0, ri = -1;
  for (let i = 0; i < n; i++) {
    const d = start + i;
    while (ri + 1 < rates.length && rates[ri + 1].e <= d) ri++;
    const apy = ri >= 0 ? rates[ri].apy : (rates.length ? rates[0].apy : 0);
    if (i > 0 && b > 0 && apy) b *= Math.pow(1 + apy / 100, 1 / 365);
    const mv = by.get(d) || 0;
    b += mv; p += mv;
    ser[i] = b; pser[i] = p;
  }
  return { bal: b, principal: p, interest: b - p, start, ser, pser, apy: apyNow };
}
let MEMO = null;
function model() {
  if (MEMO) return MEMO;
  const assets = all('asset'), accounts = all('cash'), plans = all('plan');
  const pos = assets.map(a => Object.assign({ a }, calcPos(a), { dayPct: (a.price > 0 && a.prev > 0) ? a.price / a.prev - 1 : null }));
  let invValue = 0, invCost = 0, invDay = 0, realized = 0, pendN = 0, estN = 0;
  const missing = new Set();
  for (const p of pos) {
    invValue += p.value; invCost += p.cost; invDay += p.day; realized += p.realized; pendN += p.pendN; estN += p.estN;
    if (p.qty > 0 && curOf(p.a) !== 'EUR' && !fxNow(curOf(p.a))) missing.add(curOf(p.a));
  }
  const cash = accounts.map(c => Object.assign({ c }, cashCalc(c)));
  let cashTotal = 0, interest = 0, monthInt = 0, yearInt = 0;
  for (const r of cash) {
    cashTotal += r.bal; interest += r.interest;
    if (r.bal > 0) { monthInt += r.bal * (Math.pow(1 + r.apy / 100, 30 / 365) - 1); yearInt += r.bal * r.apy / 100; }
  }
  const alloc = TYPE_ORDER.map(k => ({ k: TYPES[k].k, l: TYPES[k].p, v: pos.filter(p => typeOf(p.a) === k).reduce((s, p) => s + p.value, 0) }));
  alloc.push({ k: '--k-cash', l: 'Liquidez', v: cashTotal });
  const invPnl = invValue - invCost;
  const hasDay = pos.some(p => p.qty > 0 && p.a.prev > 0);
  MEMO = {
    assets, accounts, plans, pos, cash, invValue, invCost, invPnl, invPct: invCost > 0 ? invPnl / invCost : 0,
    invDay, invDayPct: (invValue - invDay) > 0 ? invDay / (invValue - invDay) : 0, hasDay, realized, pendN, estN,
    missingFx: Array.from(missing), cashTotal, interest, monthInt, yearInt, net: invValue + cashTotal,
    totalGain: invPnl + realized + interest, alloc, any: !!(assets.length || accounts.length || plans.length)
  };
  return MEMO;
}
function history(R) {
  const end = todayEd();
  const assets = all('asset'), accounts = all('cash');
  let first = end;
  for (const a of assets) for (const t of a.txs || []) if (validDate(t.date)) first = Math.min(first, toEd(t.date));
  const cc = accounts.map(c => cashCalc(c));
  for (const r of cc) if (r.ser) first = Math.min(first, r.start);
  const start = Math.max(end - R, first);
  const n = end - start + 1;
  if (n < 2) return null;
  const val = new Float64Array(n), con = new Float64Array(n);
  for (const a of assets) {
    const txs = txsOf(a); if (!txs.length) continue;
    const h = a.hist && a.hist.t && a.hist.t.length ? a.hist : null;
    const st = { qty: 0, cost: 0, realized: 0, pend: 0, pendN: 0, estN: 0 };
    const cur = curOf(a), mul = mulOf(a);
    let ti = 0, hi = -1;
    for (let i = 0; i < n; i++) {
      const d = start + i;
      while (ti < txs.length && toEd(txs[ti].date) <= d) { applyTx(st, txs[ti]); ti++; }
      let px = null;
      if (i === n - 1 && a.price > 0) px = priceEUR(a);
      else if (h) { while (hi + 1 < h.t.length && h.t[hi + 1] <= d) hi++; if (hi >= 0) px = h.c[hi] * mul * (fxOn(cur, d) || 1); }
      val[i] += (px != null ? st.qty * px : st.cost) + st.pend;
      con[i] += st.cost + st.pend;
    }
  }
  for (const r of cc) {
    if (!r.ser) continue;
    for (let i = 0; i < n; i++) { const k = start + i - r.start; if (k >= 0 && k < r.ser.length) { val[i] += r.ser[k]; con[i] += r.pser[k]; } }
  }
  return { start, n, val, con };
}

/* =========================================================
   Planes mensuales
   ========================================================= */
function planDates(plan, fromE, toE) {
  const out = [];
  if (!(toE >= fromE)) return out;
  const days = (plan.days || []).map(Number).filter(d => d >= 1 && d <= 31);
  if (!days.length) return out;
  const a = new Date(fromE * DAY), b = new Date(toE * DAY);
  let y = a.getUTCFullYear(), m = a.getUTCMonth() + 1;
  const yb = b.getUTCFullYear(), mb = b.getUTCMonth() + 1;
  const seen = new Set();
  while (y < yb || (y === yb && m <= mb)) {
    const ml = daysInMonth(y, m);
    for (const d of days) {
      const e = toEd(y + '-' + pad(m) + '-' + pad(Math.min(d, ml)));
      if (e >= fromE && e <= toE && !seen.has(e)) { seen.add(e); out.push(e); }
    }
    m++; if (m > 12) { m = 1; y++; }
  }
  return out.sort((p, q) => p - q);
}
function planStartEd(p) { let s = toEd(p.start); if (p.activeFrom && validDate(p.activeFrom)) s = Math.max(s, toEd(p.activeFrom)); return s; }
function planEndEd(p) { return p.end && validDate(p.end) ? toEd(p.end) : Infinity; }
function planList(p) { const t = D().get(p.targetId); if (!t) return []; return (p.target === 'cash' ? t.moves : t.txs) || []; }
function executions(p) {
  let n = 0, sum = 0;
  for (const x of planList(p)) if (x.plan === p.id) { n++; sum += +x.amount || 0; }
  return { n, sum };
}
function doneDates(p) {
  const set = new Set(p.skip || []);
  for (const x of planList(p)) if (x.plan === p.id) set.add(x.date);
  return set;
}
function nextRunEd(p) {
  const t = todayEd();
  const s = Math.max(t, planStartEd(p));
  const e = Math.min(s + 400, planEndEd(p));
  const done = doneDates(p);
  const hit = planDates(p, s, e).find(x => !done.has(fromEd(x)));
  return hit == null ? null : hit;
}
function priceOn(asset, ds) {
  const e = toEd(ds); const h = asset.hist;
  if (h && h.t && h.t.length) {
    const first = h.t[0], last = h.t[h.t.length - 1];
    if (e >= first && e <= last) { const i = lastLE(h.t, e); return { price: h.c[i] * unitFx(asset, e), exact: true, from: fromEd(h.t[i]) }; }
    if (e > last && asset.price > 0) return { price: priceEUR(asset), exact: false };
    return null;
  }
  if (asset.price > 0 && (!asset.symbol || e >= todayEd() - 3)) return { price: priceEUR(asset), exact: false };
  return null;
}
function setTxPrice(t, px) {
  t.price = sig(px);
  t.qty = sig(((+t.amount || 0) - (+t.fees || 0)) / px);
  delete t.pending; delete t.est;
}
function planTx(asset, plan, ds, id) {
  const tx = { id, side: 'buy', date: ds, amount: round(+plan.amount, 2), fees: round(+plan.fees || 0, 2), plan: plan.id, auto: true, note: 'Plan mensual' };
  const p = priceOn(asset, ds);
  if (p && p.price > 0) { setTxPrice(tx, p.price); if (!p.exact) tx.est = true; }
  else { tx.pending = true; tx.price = null; tx.qty = null; }
  return tx;
}
function refineTxs(a) {
  let n = 0;
  for (const t of a.txs || []) {
    if (!t.auto || !(t.pending || t.est)) continue;
    const p = priceOn(a, t.date);
    if (!p || !(p.price > 0)) continue;
    if (p.exact) { setTxPrice(t, p.price); n++; }
    else if (t.pending) { setTxPrice(t, p.price); t.est = true; n++; }
  }
  return n;
}
function runPlans(silent) {
  if (!(S.demo || S.mode === 'db' || S.mode === 'local')) return 0;
  const t = todayEd();
  const changed = new Map();
  let count = 0;
  for (const plan of all('plan')) {
    if (!plan.active || !validDate(plan.start) || !(+plan.amount > 0)) continue;
    const base = changed.get(plan.targetId) || D().get(plan.targetId);
    if (!base) continue;
    const s = planStartEd(plan), e = Math.min(t, planEndEd(plan));
    const dates = planDates(plan, s, e);
    if (!dates.length) continue;
    const key = plan.target === 'cash' ? 'moves' : 'txs';
    const skip = new Set(plan.skip || []);
    const have = new Set((base[key] || []).map(x => x.id));
    let tgt = base;
    for (const ed of dates) {
      const ds = fromEd(ed), id = 'pl_' + plan.id + '_' + ds;
      if (have.has(id) || skip.has(ds)) continue;
      if (tgt === base) tgt = clone(base);
      tgt[key] = tgt[key] || [];
      if (plan.target === 'cash') tgt.moves.push({ id, date: ds, amount: round(+plan.amount, 2), note: 'Plan mensual', plan: plan.id });
      else tgt.txs.push(planTx(tgt, plan, ds, id));
      have.add(id); count++;
    }
    if (tgt !== base) changed.set(tgt.id, tgt);
  }
  for (const d of changed.values()) put(d, true);
  if (count) {
    scheduleRender();
    if (!silent && !S.demo) toast(count === 1 ? 'Plan mensual: 1 aportación apuntada' : 'Planes mensuales: ' + count + ' aportaciones apuntadas');
  }
  return count;
}
function daysText(days) {
  const d = (days || []).map(Number).sort((a, b) => a - b);
  if (!d.length) return '-';
  const s = d.map(x => x >= 29 ? x + ' (o último)' : String(x));
  const list = s.length > 1 ? s.slice(0, -1).join(', ') + ' y ' + s[s.length - 1] : s[0];
  return (d.length === 1 ? 'Día ' : 'Días ') + list + ' de cada mes';
}
function upcoming(days) {
  const t = todayEd(); const out = [];
  for (const p of all('plan')) {
    if (!p.active) continue;
    const tgt = D().get(p.targetId); if (!tgt) continue;
    const s = Math.max(t, planStartEd(p)); const e = Math.min(t + days, planEndEd(p));
    const done = doneDates(p);
    for (const ed of planDates(p, s, e)) if (!done.has(fromEd(ed))) out.push({ ed, p, tgt });
  }
  return out.sort((a, b) => a.ed - b.ed);
}

/* =========================================================
   Precios online: Yahoo Finance a través del navegador de Claude
   ========================================================= */
const B = { mcp: null, checked: false, tabId: null, busy: false };
const BS = 'host:claude_browser';
const YH = 'https://query1.finance.yahoo.com';
async function initBrowser() {
  try { B.mcp = (window.claude && typeof window.claude.use === 'function') ? await window.claude.use('mcp') : null; }
  catch (e) { B.mcp = null; }
  B.checked = true;
  diag('precios online: ' + (B.mcp ? 'disponibles' : 'no disponibles aquí'));
  renderTop(); refreshOpenSheet(true);
  const sf = $('form[data-form="search"]');
  if (sf) {
    const b = sf.querySelector('button[type="submit"]'); if (b) b.textContent = B.mcp && !S.demo ? 'Buscar online' : 'Buscar';
    const hp = sf.querySelector('.help'); if (hp) hp.textContent = B.mcp && !S.demo ? 'Busca en Yahoo Finance con el navegador de Claude. La primera vez te pedirá permiso.' : (STANDALONE ? 'Esta versión no busca online. Elige una sugerencia o añádelo a mano con su precio.' : 'Aquí no hay acceso a precios online. Elige una sugerencia o añádelo a mano; desde el escritorio se actualizará.');
  }
}
function textOf(r) {
  const p = r && typeof r === 'object' && 'payload' in r ? r.payload : r;
  if (p == null) return '';
  if (typeof p === 'string') return p;
  if (Array.isArray(p)) return p.map(x => typeof x === 'string' ? x : (x && x.text) || '').join('\n');
  if (Array.isArray(p.content)) return p.content.map(x => (x && x.text) || '').join('\n');
  if (typeof p.text === 'string') return p.text;
  return JSON.stringify(p);
}
function jsonFrom(t) {
  let s = String(t || '');
  const k = s.indexOf('\n---\n'); if (k >= 0) s = s.slice(k + 5);
  const tc = s.lastIndexOf('Tab Context:'); if (tc > 0) s = s.slice(0, tc);
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('Yahoo Finance no devolvió datos');
  return JSON.parse(s.slice(a, b + 1));
}
async function webJSON(url) {
  if (!B.mcp) { const e = new Error('Sin navegador'); e.code = 'no_browser'; throw e; }
  if (B.tabId) {
    try { await B.mcp.callTool(BS, 'navigate', { url, tabId: B.tabId }); }
    catch (e) {
      diag('navigate falló: ' + (e && (e.code || e.message)));
      if (e && /grant|denied|consent|permission/i.test(String(e.code || ''))) throw e;
      B.tabId = null;
    }
  }
  if (!B.tabId) {
    const r = await B.mcp.callTool(BS, 'preview_start', { url });
    const p = r && r.payload;
    const m = textOf(r).match(/"?tabId"?\s*[:=]\s*"?([\w-]+)/);
    B.tabId = (p && typeof p === 'object' && p.tabId) || (m && m[1]) || null;
    diag('pestaña del navegador: ' + (B.tabId || 'activa'));
  }
  const args = { max_chars: 900000 };
  if (B.tabId) args.tabId = B.tabId;
  const g = await B.mcp.callTool(BS, 'get_page_text', args);
  return jsonFrom(textOf(g));
}
function compactHist(ts, cl) {
  const t = [], c = [];
  for (let i = 0; i < (ts || []).length; i++) {
    const v = cl[i];
    if (v == null || !isFinite(v) || v <= 0) continue;
    const e = Math.floor(ts[i] / 86400);
    if (t.length && t[t.length - 1] === e) { c[c.length - 1] = sig(v); continue; }
    if (t.length && e < t[t.length - 1]) continue;
    t.push(e); c.push(sig(v));
  }
  return { t, c };
}
async function ySearch(q) {
  const j = await webJSON(YH + '/v1/finance/search?q=' + encodeURIComponent(q) + '&quotesCount=12&newsCount=0&listsCount=0');
  return (j.quotes || []).filter(x => x.symbol).map(x => ({
    symbol: x.symbol, name: x.longname || x.shortname || x.symbol, type: YQ[x.quoteType] || 'other', exch: x.exchDisp || x.exchange || ''
  }));
}
function parseChart(j) {
  const r = j && j.chart && j.chart.result && j.chart.result[0];
  if (!r) throw new Error((j && j.chart && j.chart.error && j.chart.error.description) || 'Yahoo no tiene datos de ese ticker');
  const m = r.meta || {};
  const hist = compactHist(r.timestamp || [], (r.indicators && r.indicators.quote && r.indicators.quote[0] && r.indicators.quote[0].close) || []);
  const n = hist.c.length;
  const price = m.regularMarketPrice || (n ? hist.c[n - 1] : null);
  const prev = n >= 2 ? hist.c[n - 2] : (m.chartPreviousClose || null);
  return { currency: m.currency || 'EUR', price, prev, hist, name: m.longName || m.shortName || '' };
}
async function yChart(sym) { return parseChart(await webJSON(YH + '/v8/finance/chart/' + encodeURIComponent(sym) + '?range=1y&interval=1d')); }
async function ySpark(syms) {
  const j = await webJSON(YH + '/v8/finance/spark?symbols=' + syms.map(encodeURIComponent).join(',') + '&range=1y&interval=1d');
  const out = {};
  for (const s of syms) {
    const r = j[s] || j[s.toUpperCase()];
    if (!r || !r.timestamp) continue;
    const hist = compactHist(r.timestamp, r.close || []);
    const n = hist.c.length; if (!n) continue;
    out[s] = { hist, price: hist.c[n - 1], prev: n > 1 ? hist.c[n - 2] : (r.chartPreviousClose || null) };
  }
  return out;
}
function browserErr(e) {
  const c = String(e && e.code || ''), m = String(e && e.message || e || '');
  if (c === 'no_browser') return 'Los precios online solo funcionan en la app de escritorio de Claude.';
  if (/grant|denied|consent|permission/i.test(c)) return 'Hace falta tu permiso para usar el navegador de Claude. Puedes darlo en los permisos de esta página.';
  if (/not_connected|unavailable/i.test(c)) return 'El navegador de Claude no está disponible aquí. Ábrela en la app de escritorio.';
  if (/rate/i.test(c)) return 'Demasiadas consultas seguidas. Prueba en un minuto.';
  return 'No pude leer Yahoo Finance' + (m ? ': ' + m : '.');
}
async function refreshPrices() {
  if (S.demo) return toast('En el ejemplo los precios son inventados y no se actualizan.');
  if (!B.mcp) return toast(STANDALONE ? 'Esta versión no trae precios online. Pon el precio a mano en la ficha de cada activo.' : B.checked ? 'Los precios online se traen desde la app de escritorio de Claude. En el móvil puedes poner el precio a mano en cada activo.' : 'Conectando con el navegador de Claude...');
  if (B.busy) return;
  const assets = all('asset').filter(a => a.symbol);
  if (!assets.length) return toast('Ningún activo tiene ticker de Yahoo. Puedes añadirlo en la ficha de cada activo.');
  B.busy = true; renderTop();
  try {
    const res = {};
    const check = assets.filter(a => a.curCheck);
    for (const a of check.slice(0, 4)) { try { res[a.symbol] = await yChart(a.symbol); } catch (e) { diag('sin datos ' + a.symbol); } }
    const curs = new Set(assets.filter(a => !a.curCheck || res[a.symbol]).map(a => res[a.symbol] && res[a.symbol].currency ? (res[a.symbol].currency === 'GBp' ? 'GBP' : res[a.symbol].currency) : curOf(a)));
    curs.delete('EUR');
    const fxSyms = Array.from(curs).map(c => c + 'EUR=X');
    const syms = Array.from(new Set(assets.map(a => a.symbol))).filter(s => !res[s]).concat(fxSyms);
    for (let i = 0; i < syms.length; i += 15) Object.assign(res, await ySpark(syms.slice(i, i + 15)));
    for (const s of syms.filter(x => !res[x]).slice(0, 6)) { try { res[s] = await yChart(s); } catch (e) { diag('sin datos ' + s); } }
    const st = clone(settings()); st.fx = st.fx || {}; st.fxHist = st.fxHist || {};
    for (const c of curs) { const r = res[c + 'EUR=X']; if (r) { st.fx[c] = r.price; st.fxHist[c] = r.hist; } }
    st.pricesAt = Date.now();
    put(st, true);
    let n = 0; const failed = [];
    for (const a0 of assets) {
      const r = res[a0.symbol];
      if (!r) { failed.push(a0.name); continue; }
      const a = clone(a0);
      if (r.currency) { a.currency = r.currency; delete a.curCheck; }
      a.price = r.price; a.prev = r.prev; a.hist = r.hist; a.priceAt = Date.now();
      refineTxs(a); put(a, true); n++;
    }
    scheduleRender();
    toast(failed.length ? 'Actualizados ' + n + ' de ' + assets.length + '. Sin datos: ' + failed.slice(0, 2).join(', ') : 'Precios actualizados');
  } catch (e) {
    diag('actualizar: ' + (e && (e.code || '')) + ' ' + (e && e.message || e));
    toast(browserErr(e));
  } finally { B.busy = false; renderTop(); refreshOpenSheet(); }
}
async function fillHistory(id, quiet) {
  const a0 = D().get(id);
  if (!a0 || !a0.symbol || !B.mcp) return 0;
  const pend = (a0.txs || []).filter(t => t.auto && (t.pending || t.est));
  if (!pend.length) return 0;
  const eds = pend.map(t => toEd(t.date));
  const from = Math.min.apply(null, eds) - 7, to = Math.max.apply(null, eds) + 1;
  const interval = (to - from) > 700 ? '1wk' : '1d';
  const c = parseChart(await webJSON(YH + '/v8/finance/chart/' + encodeURIComponent(a0.symbol) + '?period1=' + (from * 86400) + '&period2=' + ((to + 1) * 86400) + '&interval=' + interval));
  const a = clone(a0); let n = 0;
  for (const t of a.txs) {
    if (!t.auto || !(t.pending || t.est)) continue;
    const e = toEd(t.date); const i = lastLE(c.hist.t, e);
    if (i >= 0) { setTxPrice(t, c.hist.c[i] * mulOf(a) * (fxOn(curOf(a), e) || 1)); n++; }
  }
  put(a);
  if (!quiet) toast(n ? 'Precio completado en ' + n + (n === 1 ? ' aportación' : ' aportaciones') : 'Yahoo no tiene precios para esas fechas');
  return n;
}

/* =========================================================
   Datos de ejemplo (solo en memoria)
   ========================================================= */
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function demoDocs() {
  const t = todayEd(); const rnd = mulberry(11);
  const mk = (p0, drift, vol, weekends) => {
    const T = [], Cc = []; let p = p0;
    for (let e = t - 372; e <= t; e++) {
      const wd = new Date(e * DAY).getUTCDay();
      if (!weekends && (wd === 0 || wd === 6)) continue;
      p *= 1 + drift + (rnd() - 0.5) * vol; T.push(e); Cc.push(sig(p));
    }
    return { t: T, c: Cc };
  };
  const A = (id, type, name, symbol, currency, hist) => ({ id, kind: 'asset', type, name, symbol, currency, hist, price: hist.c[hist.c.length - 1], prev: hist.c[hist.c.length - 2], priceAt: Date.now(), txs: [], createdAt: Date.now() });
  const fx = { USD: 0.92 };
  const buy = (a, ago, qty, fees, side) => {
    const ds = fromEd(t - ago); const i = lastLE(a.hist.t, t - ago);
    const price = sig(a.hist.c[Math.max(0, i)] * (a.currency === 'USD' ? fx.USD : 1));
    a.txs.push({ id: newId('t'), side: side || 'buy', date: ds, qty, price, fees, amount: round(side === 'sell' ? qty * price - fees : qty * price + fees, 2) });
  };
  const etf = A('a_demo1', 'etf', 'ETF MSCI World (ejemplo)', 'DEMO-ETF', 'EUR', mk(92, 0.0006, 0.018));
  const fund = A('a_demo2', 'fund', 'Fondo indexado global (ejemplo)', 'DEMO-FND', 'EUR', mk(31, 0.0005, 0.014));
  const tec = A('a_demo3', 'stock', 'Acción tecnológica (ejemplo)', 'DEMO-TEC', 'USD', mk(190, 0.0007, 0.03));
  const btc = A('a_demo4', 'crypto', 'Bitcoin (ejemplo)', 'DEMO-BTC', 'EUR', mk(52000, 0.0011, 0.045, true));
  const ele = A('a_demo5', 'stock', 'Eléctrica española (ejemplo)', 'DEMO-ELE', 'EUR', mk(13, 0.0005, 0.02));
  buy(etf, 360, 20, 1); buy(tec, 300, 8, 1); buy(tec, 120, 4, 1); buy(btc, 340, 0.05, 2); buy(btc, 90, 0.03, 2);
  buy(ele, 260, 150, 3); buy(ele, 40, 60, 3, 'sell');
  const plan = (id, target, targetId, amount, days, ago) => ({ id, kind: 'plan', target, targetId, amount, fees: 0, days, start: fromEd(t - ago), end: '', active: true, createdAt: Date.now() });
  const cash = {
    id: 'c_demo1', kind: 'cash', name: 'Cuenta remunerada (ejemplo)', createdAt: Date.now(),
    rates: [{ from: fromEd(t - 345), apy: 2.75 }, { from: fromEd(t - 150), apy: 2.25 }],
    moves: [{ id: 'm_d1', date: fromEd(t - 345), amount: 9000, note: 'Saldo inicial' }, { id: 'm_d2', date: fromEd(t - 200), amount: -1500, note: 'Retirada' }]
  };
  return [etf, fund, tec, btc, ele, cash,
    plan('p_demo1', 'asset', 'a_demo1', 300, [5], 330), plan('p_demo2', 'asset', 'a_demo2', 150, [20], 300), plan('p_demo3', 'cash', 'c_demo1', 200, [1], 280),
    { id: 'settings', kind: 'settings', fx, fxHist: {}, pricesAt: Date.now() }];
}

/* =========================================================
   Estado de interfaz
   ========================================================= */
const TABS = ['resumen', 'inversiones', 'liquidez', 'planes'];
const UI = { tab: 'resumen', range: 182, filter: 'all', sort: 'value', histCache: null };
const AD = { tab: 'inv', q: '', online: null, lastQ: '', searching: false, err: '', mine: [], cat: [], cashMode: null };
function saveUI() { lsSet(LS_UI, { tab: UI.tab, range: UI.range, filter: UI.filter, sort: UI.sort }); }
function setTab(t) {
  if (!TABS.includes(t)) return;
  const changed = t !== UI.tab;
  UI.tab = t; saveUI();
  render(changed);
  if (changed) window.scrollTo({ top: 0, behavior: RM.matches ? 'auto' : 'smooth' });
}

/* =========================================================
   Render principal
   ========================================================= */
let renderQueued = false;
function scheduleRender() {
  MEMO = null; UI.histCache = null;
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); refreshOpenSheet(); });
}
function render(anim) {
  MEMO = null;
  renderTop(); renderBanner();
  const v = $('#view');
  let html;
  if (S.mode === 'loading' && !S.demo) html = vLoading();
  else {
    const M = model();
    html = UI.tab === 'inversiones' ? vInv(M) : UI.tab === 'liquidez' ? vCash(M) : UI.tab === 'planes' ? vPlans(M) : vResumen(M);
  }
  v.innerHTML = html;
  if (anim && !RM.matches) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); }
  afterRender();
}
function renderTop() {
  for (const b of $$('[role="tab"][data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === UI.tab));
  const st = settings();
  const age = $('#priceAge');
  if (age) age.textContent = B.busy ? 'Actualizando...' : st.pricesAt ? 'Precios ' + ago(st.pricesAt) : 'Actualizar precios';
  const rb = $('#refreshBtn');
  if (rb) { rb.disabled = B.busy; rb.title = B.mcp ? 'Actualizar precios desde Yahoo Finance' : 'Precios online: solo en la app de escritorio de Claude'; }
  setSync();
}
function renderBanner() {
  const b = $('#banner'); if (!b) return;
  let h = '';
  if (S.demo) h = '<div class="banner-in"><span>Estás viendo una cartera de ejemplo con precios inventados. No se guarda nada.</span><button class="btn sm ghost" data-action="demo-off">Salir del ejemplo</button></div>';
  else if (S.err) h = '<div class="banner-in err"><span>' + esc(S.err) + ' Lo reintento solo en unos segundos.</span></div>';
  else if (S.mode === 'local' && !STANDALONE) h = '<div class="banner-in warn"><span>Guardando solo en este navegador. Ábrela desde Claude con tu sesión iniciada para tener los mismos datos en el PC y en el móvil.</span></div>';
  else if (S.mode === 'local' && !lsGet('cartera.bannerOk')) h = '<div class="banner-in"><span>Tus datos se guardan en este dispositivo. Haz una copia de seguridad de vez en cuando desde Ajustes.</span><button class="btn sm ghost" data-action="banner-ok">Entendido</button></div>';
  else if (S.mode === 'db' || S.mode === 'cache' || S.mode === 'local') {
    const M = model();
    if (M.pendN) h = '<div class="banner-in warn"><span>' + (M.pendN === 1 ? 'Hay 1 aportación' : 'Hay ' + M.pendN + ' aportaciones') + ' sin precio todavía. Se valoran a coste hasta tenerlo.</span>' + (B.mcp ? '<button class="btn sm ghost" data-action="fill-all">Buscar precios</button>' : '') + '</div>';
    else if (M.missingFx.length) h = '<div class="banner-in warn"><span>Falta el tipo de cambio ' + esc(M.missingFx.join(', ')) + ' a euros. ' + (STANDALONE ? 'Pon el precio en euros en la ficha del activo.' : 'Actualiza precios desde el escritorio o pon el precio en euros en la ficha del activo.') + '</span></div>';
  }
  b.innerHTML = h ? '<div class="banner">' + h + '</div>' : '';
}
function vLoading() {
  return '<div class="stack"><section class="hero"><div class="panel hero-main"><div class="sk" style="height:14px;width:120px"></div><div class="sk" style="height:46px;width:min(260px,80%);margin-top:12px"></div><div class="sk" style="height:200px;margin-top:22px"></div></div><div class="panel"><div class="sk" style="height:14px;width:90px"></div><div class="sk" style="height:12px;margin-top:18px"></div><div class="sk" style="height:130px;margin-top:18px"></div></div></section></div>';
}
function emptyState() {
  return '<section class="panel empty">' +
    '<h2>Tu patrimonio, en un solo sitio</h2>' +
    '<p>Apunta acciones, ETFs, fondos y cripto con su precio y fecha de compra, añade tus cuentas remuneradas con su TAE y deja que los planes mensuales se apunten solos.</p>' +
    '<div class="btns"><button class="btn primary" data-action="add-inv">Añadir inversión</button><button class="btn ghost" data-action="add-cash">Añadir liquidez</button><button class="btn ghost" data-action="demo-on">Ver un ejemplo</button></div>' +
    '<div class="feat">' +
    (STANDALONE ? '<div><b>Funciona sin conexión</b><span>Instalada en la pantalla de inicio abre al momento, con o sin internet.</span></div>' : '<div><b>Precios online</b><span>Busca por nombre, ticker o ISIN y trae la cotización de Yahoo Finance.</span></div>') +
    '<div><b>Planes automáticos</b><span>Elige importe y días del mes. Cada aportación se apunta sola.</span></div>' +
    '<div><b>Liquidez con intereses</b><span>Saldo, TAE e intereses generados día a día.</span></div>' +
    '</div></section>';
}
function emptyInline(title, text, action, label) {
  return '<section class="panel empty"><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p><div class="btns"><button class="btn primary" data-action="' + action + '">' + esc(label) + '</button>' + (model().any ? '' : '<button class="btn ghost" data-action="demo-on">Ver un ejemplo</button>') + '</div></section>';
}
function subDefault(M) {
  let h = '';
  if (M.hasDay) h += '<span class="delta ' + cls(M.invDay) + '">' + seur(M.invDay) + ' (' + pct(M.invDayPct) + ')</span><span class="faint">hoy</span>';
  h += '<span class="faint"' + (M.hasDay ? ' style="margin-left:10px"' : '') + '>Ganancia total</span><span class="delta ' + cls(M.totalGain) + '">' + seur(M.totalGain) + '</span>';
  return h;
}
function vResumen(M) {
  if (!M.any) return emptyState();
  const R = UI.range;
  const ranges = [[30, '1M'], [91, '3M'], [182, '6M'], [365, '1A']];
  return '<div class="stack">' +
    '<section class="hero">' +
      '<div class="panel hero-main">' +
        '<p class="label">Patrimonio total</p>' +
        '<p class="big money" id="bigVal">' + eur(M.net) + '</p>' +
        '<div class="subline" id="bigSub">' + subDefault(M) + '</div>' +
        '<div class="chart-wrap"><div class="chart" id="mainChart" aria-label="Evolución del patrimonio"></div></div>' +
        '<div class="chart-foot"><div class="legend-inline"><span><i></i>Patrimonio</span><span><i class="dash"></i>Aportado</span></div>' +
        '<div class="seg small" role="tablist" aria-label="Periodo">' + ranges.map(r => '<button role="tab" data-action="range" data-r="' + r[0] + '" aria-selected="' + (R === r[0]) + '">' + r[1] + '</button>').join('') + '</div></div>' +
      '</div>' +
      '<div class="panel">' +
        '<h3>Reparto</h3>' + allocHTML(M) +
        '<dl class="kpis">' +
          '<div><dt>Invertido</dt><dd>' + eur(M.invCost) + '</dd></div>' +
          '<div><dt>Ganancia latente</dt><dd class="' + cls(M.invPnl) + '">' + seur(M.invPnl) + '<small>' + pct(M.invPct) + '</small></dd></div>' +
          '<div><dt>Liquidez</dt><dd>' + eur(M.cashTotal) + '</dd></div>' +
          '<div><dt>Intereses generados</dt><dd class="' + cls(M.interest) + '">' + seur(M.interest) + '<small class="muted">' + eur(M.monthInt) + ' el próximo mes</small></dd></div>' +
        '</dl>' +
      '</div>' +
    '</section>' +
    '<section class="grid2">' +
      '<div class="panel"><div class="sec-head"><h3>Próximas aportaciones</h3><button class="linkbtn" data-action="tab" data-tab="planes">Ver planes</button></div>' + upcomingHTML() + '</div>' +
      '<div class="panel"><div class="sec-head"><h3>Mayores posiciones</h3><button class="linkbtn" data-action="tab" data-tab="inversiones">Ver todas</button></div>' + topHTML(M) + '</div>' +
    '</section>' +
  '</div>';
}
function allocHTML(M) {
  const rows = M.alloc.filter(r => r.v > 0.005);
  if (!rows.length) return '<p class="empty-small">Sin posiciones todavía.</p>';
  const tot = rows.reduce((s, r) => s + r.v, 0);
  return '<div class="alloc-bar" role="img" aria-label="Reparto del patrimonio">' + rows.map(r => '<span style="width:' + (r.v / tot * 100).toFixed(2) + '%;background:var(' + r.k + ')"></span>').join('') + '</div>' +
    '<ul class="alloc-list">' + rows.map(r => '<li><span class="sw" style="background:var(' + r.k + ')"></span><span>' + esc(r.l) + '</span><span class="num">' + eur0(r.v) + '</span><span class="pc num">' + NP.format(r.v / tot * 100) + ' %</span></li>').join('') + '</ul>';
}
function upcomingHTML() {
  const list = upcoming(45).slice(0, 6);
  if (!all('plan').length) return '<p class="empty-small">Sin planes mensuales. <button class="linkbtn" data-action="add-plan">Crear un plan</button></p>';
  if (!list.length) return '<p class="empty-small">Ninguna aportación en los próximos 45 días.</p>';
  return '<ul class="simple-list">' + list.map(x => '<li><div class="l"><strong>' + esc(x.tgt.name) + '</strong><small>' + datef(fromEd(x.ed)) + '</small></div><div class="r num">' + eur(x.p.amount) + '</div></li>').join('') + '</ul>';
}
function topHTML(M) {
  const list = M.pos.filter(p => p.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  if (!list.length) return '<p class="empty-small">Aún no hay inversiones. <button class="linkbtn" data-action="add-inv">Añadir la primera</button></p>';
  return '<ul class="simple-list">' + list.map(p => '<li><button class="lb" data-action="open-asset" data-id="' + esc(p.a.id) + '"><span class="l"><strong>' + esc(p.a.name) + '</strong><small>' + TYPES[typeOf(p.a)].l + (p.a.symbol ? ' · ' + esc(p.a.symbol) : '') + '</small></span><span class="r">' + eur(p.value) + '<small class="' + cls(p.pnl) + '">' + pct(p.pnlPct) + '</small></span></button></li>').join('') + '</ul>';
}
function badgeTxt(a) {
  const s = String(a.symbol || '').split(/[.\-=]/)[0];
  if (s && s.length <= 5 && !/^0P/i.test(s) && !/^DEMO/.test(s)) return s.slice(0, 4).toUpperCase();
  return String(a.name || '?').replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}
function sparkSVG(a) {
  const hh = a.hist; if (!hh || !hh.c || hh.c.length < 3) return '';
  const c = hh.c.slice(-64); const w = 92, h = 30;
  let lo = Math.min.apply(null, c), hi = Math.max.apply(null, c); if (hi - lo < 1e-12) { hi += 1; lo -= 1; }
  let d = '';
  for (let i = 0; i < c.length; i++) d += (i ? 'L' : 'M') + (i / (c.length - 1) * w).toFixed(1) + ' ' + (2 + (1 - (c[i] - lo) / (hi - lo)) * (h - 4)).toFixed(1);
  const col = c[c.length - 1] >= c[0] ? 'var(--gain)' : 'var(--loss)';
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><path d="' + d + '" style="fill:none;stroke:' + col + ';stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round"/></svg>';
}
function posRow(p) {
  const a = p.a, t = TYPES[typeOf(a)];
  const sub = [a.symbol, t.l].filter(Boolean).join(' · ') + (p.pendN ? ', sin precio' : '');
  return '<button class="row" data-action="open-asset" data-id="' + esc(a.id) + '">' +
    '<span class="r-name"><span class="badge" style="--k:var(' + t.k + ')">' + esc(badgeTxt(a)) + '</span><span class="tx"><strong>' + esc(a.name) + '</strong><small>' + esc(sub) + '</small></span></span>' +
    '<span class="r-num c-hide c-md">' + qtyf(p.qty) + '<small class="faint">' + pxf(p.avg) + ' medio</small></span>' +
    '<span class="r-num c-hide">' + pxf(p.price) + '<small class="' + cls(p.dayPct || 0) + '">' + (p.dayPct != null ? pct(p.dayPct) + ' hoy' : '&nbsp;') + '</small></span>' +
    '<span class="spark c-hide">' + sparkSVG(a) + '</span>' +
    '<span class="r-num c-hide">' + eur(p.cost) + '<small class="faint">invertido</small></span>' +
    '<span class="r-num">' + eur(p.value) + '<small class="' + cls(p.pnl) + '">' + seur(p.pnl) + ' (' + pct(p.pnlPct) + ')</small></span>' +
  '</button>';
}
function vInv(M) {
  if (!M.assets.length) return emptyInline('Todavía no tienes inversiones', 'Busca una acción, ETF, fondo o cripto y apunta tu primera compra.', 'add-inv', 'Añadir inversión');
  const types = TYPE_ORDER.filter(k => M.pos.some(p => typeOf(p.a) === k));
  if (UI.filter !== 'all' && !types.includes(UI.filter)) UI.filter = 'all';
  const isOpen = p => p.qty > 0 || p.pendN > 0;
  let list = M.pos.filter(p => UI.filter === 'all' || typeOf(p.a) === UI.filter);
  const sorters = {
    value: (a, b) => b.value - a.value,
    pnl: (a, b) => b.pnlPct - a.pnlPct,
    day: (a, b) => (b.dayPct || 0) - (a.dayPct || 0),
    name: (a, b) => String(a.a.name).localeCompare(String(b.a.name), 'es')
  };
  list.sort(sorters[UI.sort] || sorters.value);
  const open = list.filter(isOpen), closed = list.filter(p => !isOpen(p));
  const fv = open.reduce((s, p) => s + p.value, 0), fc = open.reduce((s, p) => s + p.cost, 0);
  const chip = (k, l) => '<button class="chip" data-action="filter" data-k="' + k + '" aria-pressed="' + (UI.filter === k) + '">' + l + '</button>';
  return '<div class="page-head"><div><p class="label">' + (UI.filter === 'all' ? 'Inversiones' : TYPES[UI.filter].p) + '</p><p class="big money">' + eur(fv) + '</p>' +
    '<div class="subline"><span class="delta ' + cls(fv - fc) + '">' + seur(fv - fc) + ' (' + pct(fc > 0 ? (fv - fc) / fc : 0) + ')</span><span class="faint">sobre ' + eur(fc) + ' invertidos</span>' +
    (M.realized && UI.filter === 'all' ? '<span class="faint" style="margin-left:10px">Realizada</span><span class="delta ' + cls(M.realized) + '">' + seur(M.realized) + '</span>' : '') + '</div></div>' +
    '<button class="btn primary sm" data-action="add-inv">' + IC.plus + 'Añadir inversión</button></div>' +
    '<section class="panel" style="padding:12px">' +
      '<div class="sec-head" style="padding:4px 6px 12px;flex-wrap:wrap"><div class="chips">' + chip('all', 'Todo') + types.map(k => chip(k, TYPES[k].p)).join('') + '</div>' +
      '<label for="sortSel" style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2)">Ordenar<select class="field" id="sortSel" style="height:34px;width:auto;font-size:14px;padding:0 34px 0 12px;background-position:calc(100% - 17px) 15px,calc(100% - 12px) 15px">' +
        [['value', 'Valor'], ['pnl', 'Rentabilidad'], ['day', 'Cambio hoy'], ['name', 'Nombre']].map(o => '<option value="' + o[0] + '"' + (UI.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label></div>' +
      '<div class="list-head"><span>Nombre</span><span class="c-hide c-md">Participaciones</span><span class="c-hide">Precio</span><span class="c-hide">3 meses</span><span class="c-hide">Invertido</span><span>Valor</span></div>' +
      '<div class="list">' + (open.length ? open.map(posRow).join('') : '<p class="empty-small" style="padding:12px 10px">Nada abierto en este filtro.</p>') + '</div>' +
      (closed.length ? '<details style="margin-top:8px"><summary class="faint" style="padding:10px;cursor:pointer;font-size:13.5px">Posiciones cerradas (' + closed.length + ')</summary><div class="list">' + closed.map(posRow).join('') + '</div></details>' : '') +
    '</section>';
}
function vCash(M) {
  if (!M.cash.length) return emptyInline('Sin cuentas de liquidez', 'Añade tu cuenta remunerada con su TAE y verás cuánto te genera cada mes.', 'add-cash', 'Añadir cuenta');
  const cards = M.cash.slice().sort((a, b) => b.bal - a.bal).map(r => {
    const c = r.c;
    const month = r.bal > 0 ? r.bal * (Math.pow(1 + r.apy / 100, 30 / 365) - 1) : 0;
    return '<div class="card tappable" role="button" tabindex="0" data-action="open-cash" data-id="' + esc(c.id) + '">' +
      '<div class="card-top"><h4>' + esc(c.name) + '</h4><span class="pill acc">TAE ' + NP.format(r.apy) + ' %</span></div>' +
      '<div class="amt">' + eur(r.bal) + '</div>' +
      '<div class="meta"><span>Aportado neto</span><b>' + eur(r.principal) + '</b><span>Intereses generados</span><b class="' + cls(r.interest) + '">' + seur(r.interest) + '</b><span>Próximo mes</span><b>' + eur(month) + '</b><span>En un año</span><b>' + eur(r.bal > 0 ? r.bal * r.apy / 100 : 0) + '</b></div>' +
    '</div>';
  }).join('');
  return '<div class="page-head"><div><p class="label">Liquidez</p><p class="big money">' + eur(M.cashTotal) + '</p>' +
    '<div class="subline"><span class="delta ' + cls(M.interest) + '">' + seur(M.interest) + '</span><span class="faint">de intereses generados</span><span class="faint" style="margin-left:10px">Unos ' + eur(M.monthInt) + ' el próximo mes</span></div></div>' +
    '<button class="btn primary sm" data-action="add-cash">' + IC.plus + 'Añadir</button></div>' +
    '<div class="cards">' + cards + '</div>' +
    '<p class="help" style="margin-top:16px">Los intereses se calculan día a día con la TAE vigente en cada fecha, capitalizando a diario. Tu banco puede liquidarlos de otra forma, así que trátalo como una estimación.</p>';
}
function planCard(p) {
  const tgt = D().get(p.targetId);
  const ex = executions(p);
  const nx = p.active ? nextRunEd(p) : null;
  const kind = p.target === 'cash' ? 'Liquidez' : (tgt ? TYPES[typeOf(tgt)].l : 'Inversión');
  return '<div class="card">' +
    '<div class="card-top"><div style="min-width:0"><h4>' + esc(tgt ? tgt.name : 'Destino eliminado') + '</h4><span class="faint" style="font-size:13px">' + kind + '</span></div>' +
    '<button class="switch" role="switch" aria-checked="' + (!!p.active) + '" aria-label="' + (p.active ? 'Pausar plan' : 'Reanudar plan') + '" data-action="toggle-plan" data-id="' + esc(p.id) + '"></button></div>' +
    '<div class="amt">' + eur(p.amount) + '<span class="faint" style="font-size:14px;font-weight:500;letter-spacing:0"> por aportación</span></div>' +
    '<div class="meta"><span>Cuándo</span><b>' + esc(daysText(p.days)) + '</b><span>Próxima</span><b>' + (p.active ? (nx != null ? datef(fromEd(nx)) : 'Sin más fechas') : 'En pausa') + '</b>' +
    '<span>Aportaciones</span><b>' + ex.n + '</b><span>Total aportado</span><b>' + eur(ex.sum) + '</b></div>' +
    '<div class="card-actions"><button class="btn ghost sm" data-action="edit-plan" data-id="' + esc(p.id) + '">Editar</button>' +
    (tgt ? '<button class="btn ghost sm" data-action="' + (p.target === 'cash' ? 'open-cash' : 'open-asset') + '" data-id="' + esc(tgt.id) + '">Ver ' + (p.target === 'cash' ? 'cuenta' : 'activo') + '</button>' : '') +
    '<button class="btn danger sm" data-action="plan-del" data-id="' + esc(p.id) + '">Eliminar</button></div>' +
  '</div>';
}
function vPlans(M) {
  if (!M.plans.length) return emptyInline('Sin planes mensuales', 'Elige un activo o una cuenta, el importe y los días del mes. Cada aportación se apunta sola con el precio de ese día.', 'add-plan', 'Crear plan');
  const monthly = M.plans.filter(p => p.active).reduce((s, p) => s + (+p.amount || 0) * (p.days || []).length, 0);
  return '<div class="page-head"><div><p class="label">Planes mensuales</p><p class="big money">' + eur(monthly) + '</p><div class="subline"><span class="faint">al mes entre todos los planes activos</span></div></div>' +
    '<button class="btn primary sm" data-action="add-plan">' + IC.plus + 'Nuevo plan</button></div>' +
    '<div class="cards">' + M.plans.slice().sort((a, b) => (b.active - a.active) || ((+b.amount) - (+a.amount))).map(planCard).join('') + '</div>' +
    '<p class="help" style="margin-top:16px">Cada día que toca, la aportación se apunta sola al abrir la cartera, en el PC o en el móvil. Si pasan días sin abrirla, se recuperan todas en la siguiente apertura con el precio de cada fecha.</p>';
}

/* =========================================================
   Gráficos
   ========================================================= */
let RO = null;
function afterRender() {
  const box = $('#mainChart');
  if (RO) { RO.disconnect(); RO = null; }
  if (!box) return;
  drawMain(box); bindScrub(box);
  if (window.ResizeObserver) { let w = box.clientWidth; RO = new ResizeObserver(() => { if (box.clientWidth !== w) { w = box.clientWidth; drawMain(box); } }); RO.observe(box); }
}
function getHist() { if (!UI.histCache || UI.histCache.r !== UI.range) UI.histCache = { r: UI.range, h: history(UI.range) }; return UI.histCache.h; }
function niceTicks(lo, hi, n) {
  const span = hi - lo; if (!(span > 0)) return [];
  const raw = span / n; const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(x => x * mag).find(x => x >= raw) || raw;
  const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out;
}
function drawMain(box) {
  const H = getHist();
  if (!H) { box.innerHTML = '<div class="chart-empty">La evolución aparecerá cuando tu cartera tenga al menos dos días de historia.</div>'; box.style.cursor = 'default'; box._geo = null; return; }
  const w = Math.max(200, box.clientWidth || 600), h = box.clientHeight || 220;
  const top = 10, bottom = 24, ih = h - top - bottom;
  let lo = Infinity, hi = -Infinity, allPos = true;
  for (let i = 0; i < H.n; i++) { lo = Math.min(lo, H.val[i], H.con[i]); hi = Math.max(hi, H.val[i], H.con[i]); }
  if (lo < 0) allPos = false;
  if (hi - lo < 1) { hi += 1; lo -= 1; }
  const pv = (hi - lo) * 0.12; lo -= pv; hi += pv; if (allPos && lo < 0) lo = 0;
  const X = i => H.n === 1 ? w / 2 : i / (H.n - 1) * w;
  const Y = v => top + (1 - (v - lo) / (hi - lo)) * ih;
  let dv = '', dc = '';
  for (let i = 0; i < H.n; i++) { dv += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(H.val[i]).toFixed(1); dc += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(H.con[i]).toFixed(1); }
  const ticks = niceTicks(lo, hi, 3);
  box.innerHTML = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">' +
    '<defs><linearGradient id="gMain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.22"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>' +
    ticks.map(t => '<line x1="0" x2="' + w + '" y1="' + Y(t).toFixed(1) + '" y2="' + Y(t).toFixed(1) + '" style="stroke:var(--line);stroke-width:1"/>').join('') +
    '<path d="' + dv + 'L' + w + ' ' + (top + ih) + 'L0 ' + (top + ih) + 'Z" style="fill:url(#gMain)"/>' +
    '<path d="' + dc + '" style="fill:none;stroke:var(--ink-3);stroke-width:1.5;stroke-dasharray:4 4"/>' +
    '<path d="' + dv + '" style="fill:none;stroke:var(--accent);stroke-width:2.2;stroke-linejoin:round;stroke-linecap:round"/>' +
    '<circle cx="' + X(H.n - 1).toFixed(1) + '" cy="' + Y(H.val[H.n - 1]).toFixed(1) + '" r="4" style="fill:var(--accent);stroke:var(--surface);stroke-width:2"/>' +
    '<g class="xh" style="display:none"><line class="xhl" y1="' + top + '" y2="' + (top + ih) + '" style="stroke:var(--ink-3);stroke-width:1"/><circle class="xhc" r="5" style="fill:var(--accent);stroke:var(--surface);stroke-width:2"/></g>' +
    '</svg>' +
    ticks.map(t => '<span class="ylab" style="top:' + Y(t).toFixed(1) + 'px">' + compactEur(t) + '</span>').join('') +
    '<span class="xlab" style="left:0">' + datefs(fromEd(H.start)) + '</span><span class="xlab" style="right:0">Hoy</span>';
  box.style.cursor = '';
  box._geo = { X, Y, H, w };
}
function bindScrub(box) {
  const move = e => {
    const g = box._geo; if (!g) return;
    const r = box.getBoundingClientRect();
    const x = Math.max(0, Math.min(g.w, e.clientX - r.left));
    const i = Math.round(x / g.w * (g.H.n - 1));
    const xh = box.querySelector('.xh'); if (!xh) return;
    xh.style.display = '';
    const px = g.X(i).toFixed(1);
    const l = box.querySelector('.xhl'); l.setAttribute('x1', px); l.setAttribute('x2', px);
    const c = box.querySelector('.xhc'); c.setAttribute('cx', px); c.setAttribute('cy', g.Y(g.H.val[i]).toFixed(1));
    const bv = $('#bigVal'), bs = $('#bigSub');
    if (bv) bv.textContent = eur(g.H.val[i]);
    const gain = g.H.val[i] - g.H.con[i];
    if (bs) bs.innerHTML = '<span class="faint">' + datef(fromEd(g.H.start + i)) + '</span><span class="faint" style="margin-left:6px">Aportado ' + eur(g.H.con[i]) + '</span><span class="delta ' + cls(gain) + '">' + seur(gain) + '</span>';
  };
  const reset = () => {
    const xh = box.querySelector('.xh'); if (xh) xh.style.display = 'none';
    const M = model(); const bv = $('#bigVal'), bs = $('#bigSub');
    if (bv) bv.textContent = eur(M.net); if (bs) bs.innerHTML = subDefault(M);
  };
  box.addEventListener('pointerdown', move);
  box.addEventListener('pointermove', move);
  box.addEventListener('pointerleave', reset);
  box.addEventListener('pointercancel', reset);
  box.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') reset(); });
}
function miniSVG(o) {
  const t = o.t, v = o.v, w = o.w, h = o.h || 150, color = o.color || 'var(--accent)', marks = o.marks || [], hline = o.hline;
  const n = v.length; if (n < 2) return '';
  let lo = Infinity, hi = -Infinity;
  for (const x of v) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  const t0 = t[0], t1 = t[n - 1];
  const vis = marks.filter(m => m.e >= t0 && m.e <= t1 && okNum(m.y));
  for (const m of vis) { lo = Math.min(lo, m.y); hi = Math.max(hi, m.y); }
  if (okNum(hline)) { lo = Math.min(lo, hline); hi = Math.max(hi, hline); }
  if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  const pd = (hi - lo) * 0.1; lo -= pd; hi += pd;
  const X = e => (e - t0) / Math.max(1, t1 - t0) * w;
  const Y = y => 6 + (1 - (y - lo) / (hi - lo)) * (h - 12);
  let d = '';
  for (let i = 0; i < n; i++) d += (i ? 'L' : 'M') + X(t[i]).toFixed(1) + ' ' + Y(v[i]).toFixed(1);
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><defs><linearGradient id="gMini" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + color + ';stop-opacity:.2"/><stop offset="1" style="stop-color:' + color + ';stop-opacity:0"/></linearGradient></defs>' +
    '<path d="' + d + 'L' + w + ' ' + h + 'L0 ' + h + 'Z" style="fill:url(#gMini)"/>' +
    (okNum(hline) ? '<line x1="0" x2="' + w + '" y1="' + Y(hline).toFixed(1) + '" y2="' + Y(hline).toFixed(1) + '" style="stroke:var(--ink-3);stroke-width:1;stroke-dasharray:3 4"/>' : '') +
    '<path d="' + d + '" style="fill:none;stroke:' + color + ';stroke-width:2;stroke-linejoin:round;stroke-linecap:round"/>' +
    vis.map(m => '<circle cx="' + X(m.e).toFixed(1) + '" cy="' + Y(m.y).toFixed(1) + '" r="4.5" style="fill:' + m.c + ';stroke:var(--sheet);stroke-width:2"/>').join('') +
    '</svg>';
}
function drawAssetMini(id) {
  const box = $('#miniChart'); const a = D().get(id); if (!box || !a) return;
  const hh = a.hist;
  if (!hh || !hh.c || hh.c.length < 2) { box.innerHTML = '<div class="chart-empty">' + (a.symbol ? 'Actualiza precios para ver la evolución.' : 'Este activo no tiene histórico de precios.') + '</div>'; return; }
  const f = unitFx(a);
  const p = calcPos(a);
  const marks = txsOf(a).filter(t => t.price > 0).map(t => ({ e: toEd(t.date), y: t.price, c: t.side === 'sell' ? 'var(--loss)' : 'var(--accent)' }));
  box.innerHTML = miniSVG({ t: hh.t, v: hh.c.map(x => x * f), w: box.clientWidth || 480, h: 150, marks, hline: p.qty > 0 ? p.avg : null });
}
function drawCashMini(id) {
  const box = $('#miniChart'); const c = D().get(id); if (!box || !c) return;
  const r = cashCalc(c);
  if (!r.ser || r.ser.length < 2) { box.innerHTML = '<div class="chart-empty">El saldo aparecerá con el primer movimiento.</div>'; return; }
  const from = Math.max(0, r.ser.length - 366);
  const t = [], v = [];
  for (let i = from; i < r.ser.length; i++) { t.push(r.start + i); v.push(r.ser[i]); }
  box.innerHTML = miniSVG({ t, v, w: box.clientWidth || 480, h: 150, color: 'var(--k-etf)' });
}

/* =========================================================
   Hoja lateral / inferior con física de muelle
   ========================================================= */
const SH = { stack: [], open: false, anim: null, pos: 0, trigger: null };
function spring(from, to, v0, opt, onUpdate, onDone) {
  const response = opt.response || 0.4, damping = opt.damping == null ? 1 : opt.damping;
  const k = Math.pow(2 * Math.PI / response, 2), c = 4 * Math.PI * damping / response;
  let x = from, v = v0 || 0, last = performance.now(), raf = 0, stopped = false;
  const step = now => {
    if (stopped) return;
    const dt = Math.min(0.064, Math.max(0, (now - last) / 1000)); last = now;
    const N = 8, hh = dt / N;
    for (let i = 0; i < N; i++) { const acc = -k * (x - to) - c * v; v += acc * hh; x += v * hh; }
    if (Math.abs(x - to) < 0.4 && Math.abs(v) < 8) { onUpdate(to); if (onDone) onDone(); return; }
    onUpdate(x); raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return { stop() { stopped = true; cancelAnimationFrame(raf); } };
}
const project = (v, r) => { r = r || 0.998; return (v / 1000) * r / (1 - r); };
const rubber = (o, d) => (o * d * 0.55) / (d + 0.55 * o);
function sheetDim() { const el = $('#sheet'); return isDesk() ? el.offsetWidth + 24 : el.offsetHeight + 12; }
function setSheetPos(p) {
  SH.pos = p;
  const el = $('#sheet');
  el.style.transform = isDesk() ? 'translate3d(' + p + 'px,0,0)' : 'translate3d(0,' + p + 'px,0)';
  const dim = sheetDim() || 1;
  $('#scrim').style.opacity = String(Math.max(0, Math.min(1, 1 - p / dim)));
}
function animateSheet(to, v0, opt, done) {
  if (SH.anim) SH.anim.stop();
  SH.anim = spring(SH.pos, to, v0, opt, setSheetPos, done);
}
function openSheet(view, push) {
  if (!SH.open) {
    SH.stack = [view];
    SH.trigger = document.activeElement;
    const el = $('#sheet'), sc = $('#scrim');
    const wasHidden = el.hidden;
    el.hidden = false; sc.hidden = false;
    if (wasHidden) el.style.transform = isDesk() ? 'translate3d(110%,0,0)' : 'translate3d(0,110%,0)';
    paintSheet(true);
    SH.open = true;
    document.documentElement.style.overflow = 'hidden';
    if (RM.matches) { setSheetPos(0); }
    else { if (wasHidden) SH.pos = sheetDim(); animateSheet(0, 0, { response: 0.42, damping: 1 }); }
    try { el.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
    return;
  }
  if (push) SH.stack.push(view); else SH.stack[SH.stack.length - 1] = view;
  paintSheet(true);
}
function paintSheet(focus) {
  const v = SH.stack[SH.stack.length - 1]; if (!v) return;
  const body = $('#sheetBody');
  body.innerHTML = v.fn.apply(null, v.args || []);
  if (focus) {
    body.scrollTop = 0;
    const f = body.querySelector('[autofocus]');
    if (f && isDesk()) { try { f.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
  }
  if (v.after) v.after();
}
function sheetBack() { if (SH.stack.length > 1) { SH.stack.pop(); paintSheet(true); } else closeSheet(); }
function closeSheet(v0) {
  if (!SH.open) return;
  SH.open = false;
  const done = () => {
    $('#sheet').hidden = true; $('#scrim').hidden = true; $('#sheetBody').innerHTML = '';
    SH.stack = []; document.documentElement.style.overflow = '';
    if (SH.trigger && SH.trigger.isConnected && SH.trigger.focus) { try { SH.trigger.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
  };
  if (RM.matches) { if (SH.anim) SH.anim.stop(); done(); return; }
  animateSheet(sheetDim(), v0 || 0, { response: 0.34, damping: 1 }, done);
}
function refreshOpenSheet(force) {
  if (!SH.open) return;
  const v = SH.stack[SH.stack.length - 1]; if (!v || (!v.live && !force)) return;
  const ae = document.activeElement;
  if (ae && $('#sheet').contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) return;
  if (force && !v.live && $('#sheet').querySelector('input:not([type=hidden]), textarea')) return;
  const body = $('#sheetBody'); const st = body.scrollTop;
  paintSheet(false); body.scrollTop = st;
}
const topCtx = () => { const v = SH.stack[SH.stack.length - 1]; return (v && v.args && v.args[0]) || {}; };
function initDrag() {
  const sheet = $('#sheet');
  let drag = null;
  sheet.addEventListener('pointerdown', e => {
    if (isDesk() || !SH.open) return;
    const h = e.target.closest('.sheet-grip, .sh-head');
    if (!h || e.target.closest('button, input, select, a, textarea')) return;
    if (SH.anim) SH.anim.stop();
    drag = { id: e.pointerId, y0: e.clientY, p0: SH.pos, pts: [[e.timeStamp, e.clientY]] };
    try { sheet.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ }
  });
  sheet.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    let p = drag.p0 + (e.clientY - drag.y0);
    if (p < 0) p = -rubber(-p, 300);
    setSheetPos(p);
    drag.pts.push([e.timeStamp, e.clientY]); if (drag.pts.length > 6) drag.pts.shift();
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const pts = drag.pts; drag = null;
    const a = pts[0], b = pts[pts.length - 1];
    const dt = (b[0] - a[0]) / 1000;
    const vel = dt > 0 ? (b[1] - a[1]) / dt : 0;
    if (SH.pos + project(vel) > sheetDim() * 0.45) closeSheet(vel);
    else animateSheet(0, vel, { response: 0.38, damping: Math.abs(vel) > 300 ? 0.85 : 1 });
  };
  sheet.addEventListener('pointerup', end);
  sheet.addEventListener('pointercancel', end);
}

/* =========================================================
   Aviso flotante con deshacer
   ========================================================= */
let toastT = 0;
function toast(msg, action) {
  const t = $('#toast'); clearTimeout(toastT);
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? '<button type="button" id="toastBtn">' + esc(action.label) + '</button>' : '');
  t.classList.toggle('solo', !action); t.hidden = false;
  if (action) $('#toastBtn').onclick = () => { t.hidden = true; action.fn(); };
  toastT = setTimeout(() => { t.hidden = true; }, action ? 6500 : 4200);
}
function snap(id) { const d = D().get(id); return [id, d ? clone(d) : null]; }
function withUndo(msg, before) {
  toast(msg, { label: 'Deshacer', fn: () => { for (const [id, doc] of before) { if (doc) put(clone(doc)); else remove(id); } toast('Hecho, cambio deshecho'); } });
}

/* =========================================================
   Hojas: piezas comunes
   ========================================================= */
function head(title) {
  const back = SH.stack.length > 1;
  const left = back ? '<button class="iconbtn" data-action="sheet-back" aria-label="Atrás">' + IC.back + '</button>' : '<button class="iconbtn" data-action="sheet-close" aria-label="Cerrar">' + IC.close + '</button>';
  return '<div class="sh-head">' + left + '<h2>' + esc(title) + '</h2>' + (back ? '<button class="iconbtn" data-action="sheet-close" aria-label="Cerrar">' + IC.close + '</button>' : '<span></span>') + '</div>';
}
function shGone() { return head('No disponible') + '<p class="empty-small">Este elemento ya no existe.</p>'; }
function shLoading(msg) { return head('Un momento') + '<div class="loading-box"><span class="spin"></span>' + esc(msg) + '</div>'; }
function chosenHTML(a) {
  const t = TYPES[typeOf(a)];
  const px = priceEUR(a);
  return '<div class="chosen"><span class="badge" style="--k:var(' + t.k + ')">' + esc(badgeTxt(a)) + '</span><div class="tx"><strong>' + esc(a.name) + '</strong><small>' + esc([a.symbol || 'Sin ticker', t.l].join(' · ')) + '</small></div>' +
    '<div class="num" style="text-align:right">' + (px != null ? pxf(px) : '<span class="faint">Sin precio</span>') + '</div></div>';
}
function ferr(f, id, msg) { const el = f.querySelector('#' + id); if (el) { el.textContent = msg || ''; el.hidden = !msg; } return false; }
function typeOptions(sel) { return TYPE_ORDER.map(k => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + TYPES[k].l + '</option>').join(''); }

/* ---------- Añadir */
function openAdd(tab) {
  AD.tab = tab || 'inv'; AD.q = ''; AD.online = null; AD.err = ''; AD.cashMode = null;
  openSheet({ fn: shAdd, title: 'Añadir' });
}
function shAdd() {
  const t = AD.tab;
  const tabs = [['inv', 'Inversión'], ['cash', 'Liquidez'], ['plan', 'Plan mensual']];
  return head('Añadir') +
    '<div class="seg full" role="tablist">' + tabs.map(x => '<button role="tab" data-action="add-tab" data-k="' + x[0] + '" aria-selected="' + (t === x[0]) + '">' + x[1] + '</button>').join('') + '</div>' +
    '<div>' + (t === 'inv' ? addInvPane() : t === 'cash' ? addCashPane() : planFormHTML({ embedded: true })) + '</div>';
}
function addInvPane() {
  const online = B.mcp && !S.demo;
  return '<form class="form" data-form="search" style="margin-top:18px" novalidate>' +
    '<div class="fld"><label class="lbl" for="f-q">Buscar acción, ETF, fondo o cripto</label>' +
    '<div class="inline"><input class="field" id="f-q" name="q" value="' + esc(AD.q) + '" placeholder="Nombre, ticker o ISIN" autocomplete="off" autofocus enterkeyhint="search"><button class="btn primary" type="submit" style="height:46px">' + (online ? 'Buscar online' : 'Buscar') + '</button></div>' +
    '<p class="help">' + (online ? 'Busca en Yahoo Finance con el navegador de Claude. La primera vez te pedirá permiso.' : B.checked ? (STANDALONE ? 'Esta versión no busca online. Elige una sugerencia o añádelo a mano con su precio.' : 'Aquí no hay acceso a precios online. Elige una sugerencia o añádelo a mano; desde el escritorio se actualizará.') : 'Comprobando acceso a precios online...') + '</p></div>' +
    '</form>' +
    '<div id="results">' + resultsHTML() + '</div>' +
    '<p style="margin-top:14px"><button class="linkbtn" data-action="manual-asset">¿No aparece? Añadir a mano</button></p>';
}
function resRow(src, i, name, sub, type) {
  const t = TYPES[type] || TYPES.other;
  return '<button class="res" data-action="pick" data-src="' + src + '" data-i="' + i + '"><span style="min-width:0"><strong>' + esc(name) + '</strong><small>' + esc(sub) + '</small></span><span class="pill" style="color:var(' + t.k + ');background:color-mix(in srgb,var(' + t.k + ') 13%,transparent)">' + t.l + '</span></button>';
}
const group = (title, rows) => '<div class="res-group"><h4>' + esc(title) + '</h4>' + rows.join('') + '</div>';
function resultsHTML() {
  const q = AD.q.trim().toLowerCase();
  const match = xs => !q || xs.some(x => String(x || '').toLowerCase().includes(q));
  AD.mine = q ? all('asset').filter(a => match([a.name, a.symbol, a.isin])).slice(0, 5) : [];
  AD.cat = CATALOG.filter(c => match([c.name, c.symbol, c.isin])).slice(0, q ? 8 : 12);
  let h = '';
  if (AD.mine.length) h += group('En tu cartera', AD.mine.map((a, i) => resRow('mine', i, a.name, [a.symbol, TYPES[typeOf(a)].l].filter(Boolean).join(' · '), typeOf(a))));
  if (AD.searching) h += '<div class="res-group"><h4>Yahoo Finance</h4><div class="loading-box" style="padding:18px 0"><span class="spin"></span>Buscando...</div></div>';
  else if (AD.err) h += '<div class="res-group"><h4>Yahoo Finance</h4><p class="help err">' + esc(AD.err) + '</p></div>';
  else if (AD.online) h += AD.online.length ? group('Yahoo Finance', AD.online.map((o, i) => resRow('online', i, o.name, [o.symbol, o.exch].filter(Boolean).join(' · '), o.type))) : '<div class="res-group"><h4>Yahoo Finance</h4><p class="empty-small">Sin resultados. Prueba con el ticker o el ISIN.</p></div>';
  if (AD.cat.length) h += group(q ? 'Sugerencias' : 'Populares', AD.cat.map((c, i) => resRow('cat', i, c.name, [c.symbol || c.isin, c.exch].filter(Boolean).join(' · '), c.type)));
  if (!h) h = '<p class="empty-small">Nada en las sugerencias. ' + (B.mcp ? 'Pulsa Buscar online.' : 'Añádelo a mano.') + '</p>';
  return h;
}
function paintResults() { const r = $('#results'); if (r) r.innerHTML = resultsHTML(); }
function shManual() {
  return head('Añadir a mano') +
    '<form class="form" data-form="manual" style="margin-top:8px" novalidate>' +
    '<div class="fld"><label class="lbl" for="m-name">Nombre</label><input class="field" id="m-name" name="name" placeholder="Ej. Fondo de mi banco" autofocus maxlength="80"></div>' +
    '<div class="f-row"><div class="fld"><label class="lbl" for="m-type">Tipo</label><select class="field" id="m-type" name="type">' + typeOptions('fund') + '</select></div>' +
    '<div class="fld"><label class="lbl" for="m-sym">Ticker de Yahoo (opcional)</label><input class="field" id="m-sym" name="symbol" placeholder="Ej. SAN.MC" autocapitalize="characters" maxlength="24"></div></div>' +
    '<div class="fld"><label class="lbl" for="m-isin">ISIN (opcional)</label><input class="field" id="m-isin" name="isin" placeholder="Ej. IE00B03HD191" autocapitalize="characters" maxlength="12"></div>' +
    '<div class="fld"><label class="lbl" for="m-price">Precio actual por participación (€)</label><input class="field" id="m-price" name="price" inputmode="decimal" placeholder="0,00"><p class="help">Puedes cambiarlo cuando quieras desde la ficha del activo.</p></div>' +
    '<p class="help err" id="manErr" hidden></p>' +
    '<button class="btn primary wide" type="submit">Continuar</button></form>';
}
function addCashPane() {
  const accs = all('cash');
  const mode = accs.length ? (AD.cashMode || 'move') : 'new';
  return (accs.length ? '<div class="chips" style="margin-top:18px"><button class="chip" data-action="cash-mode" data-m="move" aria-pressed="' + (mode === 'move') + '">Ingreso o retirada</button><button class="chip" data-action="cash-mode" data-m="new" aria-pressed="' + (mode === 'new') + '">Nueva cuenta</button></div>' : '') +
    (mode === 'new' ? cashNewForm() : cashMoveForm(null, accs));
}
function cashNewForm() {
  return '<form class="form" data-form="cashNew" style="margin-top:18px" novalidate>' +
    '<div class="fld"><label class="lbl" for="c-name">Nombre de la cuenta</label><input class="field" id="c-name" name="name" placeholder="Ej. Cuenta remunerada" maxlength="60" autofocus></div>' +
    '<div class="f-row keep"><div class="fld"><label class="lbl" for="c-apy">TAE (%)</label><input class="field" id="c-apy" name="apy" inputmode="decimal" placeholder="2,25"></div>' +
    '<div class="fld"><label class="lbl" for="c-bal">Saldo (€)</label><input class="field" id="c-bal" name="bal" inputmode="decimal" placeholder="0,00"></div></div>' +
    '<div class="fld"><label class="lbl" for="c-date">Fecha de ese saldo</label><input class="field" type="date" id="c-date" name="date" value="' + todayStr() + '" max="' + todayStr() + '"><p class="help">Con una fecha pasada, los intereses se calculan desde ese día.</p></div>' +
    '<p class="help err" id="cashErr" hidden></p>' +
    '<button class="btn primary wide" type="submit">Crear cuenta</button></form>';
}
function cashMoveForm(cashId, accs) {
  return '<form class="form" data-form="cashMove" data-cash="' + esc(cashId || '') + '" style="margin-top:18px" novalidate>' +
    (cashId ? '' : '<div class="fld"><label class="lbl" for="cm-acc">Cuenta</label><select class="field" id="cm-acc" name="acc">' + accs.map(c => '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>').join('') + '</select></div>') +
    '<div class="f-row keep"><div class="fld"><label class="lbl" for="cm-dir">Tipo</label><select class="field" id="cm-dir" name="dir"><option value="in">Ingreso</option><option value="out">Retirada</option></select></div>' +
    '<div class="fld"><label class="lbl" for="cm-amt">Importe (€)</label><input class="field" id="cm-amt" name="amount" inputmode="decimal" placeholder="0,00"></div></div>' +
    '<div class="f-row keep"><div class="fld"><label class="lbl" for="cm-date">Fecha</label><input class="field" type="date" id="cm-date" name="date" value="' + todayStr() + '" max="' + todayStr() + '"></div>' +
    '<div class="fld"><label class="lbl" for="cm-note">Nota</label><input class="field" id="cm-note" name="note" maxlength="80" placeholder="Opcional"></div></div>' +
    '<p class="help err" id="moveErr" hidden></p>' +
    '<button class="btn primary wide" type="submit">Guardar movimiento</button></form>';
}

/* ---------- Operación de compra o venta */
function txAsset(ctx) { return ctx.assetId ? D().get(ctx.assetId) : ctx.draft; }
function priceHelp(a, date, pref, tx) {
  if (tx) return 'Precio guardado en la operación.';
  const canFetch = B.mcp && !S.demo && a.symbol;
  const fetchBtn = canFetch ? ' <button type="button" class="linkbtn" data-action="date-price">Traer el precio de esa fecha</button>' : '';
  if (pref && pref.exact) return 'Cierre del ' + datef(pref.from) + ': ' + pxf(pref.price) + '. Cámbialo si pagaste otro precio.';
  if (pref) return 'Precio actual: ' + pxf(pref.price) + '. Si compraste otro día, escribe tu precio.' + (validDate(date) && toEd(date) < todayEd() - 2 ? fetchBtn : '');
  return 'Escribe el precio al que compraste.' + fetchBtn;
}
function shTx(ctx) {
  const a = txAsset(ctx); if (!a) return shGone();
  const tx = ctx.txId ? (a.txs || []).find(t => t.id === ctx.txId) : null;
  if (ctx.txId && !tx) return shGone();
  const side = ctx.side || (tx && tx.side) || 'buy';
  const date = (tx && tx.date) || ctx.date || todayStr();
  const pref = tx ? null : priceOn(a, date);
  const price = tx ? tx.price : (ctx.price != null ? ctx.price : (pref && pref.price));
  const qty = tx ? tx.qty : null, fees = tx ? tx.fees : null;
  const total = tx && okNum(tx.amount) ? tx.amount : null;
  const isNewAsset = !ctx.assetId;
  return head(tx ? 'Editar operación' : 'Nueva operación') +
    chosenHTML(a) +
    '<form class="form" data-form="tx" style="margin-top:16px" novalidate>' +
      '<div class="seg full" role="radiogroup" aria-label="Tipo de operación"><button type="button" role="radio" data-action="tx-side" data-v="buy" aria-selected="' + (side === 'buy') + '" aria-checked="' + (side === 'buy') + '">Compra</button><button type="button" role="radio" data-action="tx-side" data-v="sell" aria-selected="' + (side === 'sell') + '" aria-checked="' + (side === 'sell') + '"' + (isNewAsset ? ' disabled' : '') + '>Venta</button></div>' +
      '<input type="hidden" name="side" value="' + side + '">' +
      '<div class="f-row keep"><div class="fld"><label class="lbl" for="f-date">Fecha</label><input class="field" type="date" id="f-date" name="date" value="' + esc(date) + '" max="' + todayStr() + '"></div>' +
      '<div class="fld"><label class="lbl" for="f-qty">Participaciones</label><input class="field" id="f-qty" name="qty" inputmode="decimal" autocomplete="off" value="' + numIn(qty, 8) + '" placeholder="0" autofocus></div></div>' +
      '<div class="f-row keep"><div class="fld"><label class="lbl" for="f-price">Precio unitario (€)</label><input class="field" id="f-price" name="price" inputmode="decimal" autocomplete="off" value="' + numIn(price, 4) + '" placeholder="0,00"' + (tx ? ' data-touched="1"' : '') + '></div>' +
      '<div class="fld"><label class="lbl" for="f-fees">Comisión (€)</label><input class="field" id="f-fees" name="fees" inputmode="decimal" autocomplete="off" value="' + numIn(fees, 2) + '" placeholder="0,00"></div></div>' +
      '<p class="help" id="priceHelp">' + priceHelp(a, date, pref, tx) + '</p>' +
      '<div class="fld"><label class="lbl" for="f-total" id="totalLbl">' + (side === 'sell' ? 'Total recibido (€)' : 'Total pagado (€)') + '</label><input class="field" id="f-total" name="total" inputmode="decimal" autocomplete="off" value="' + numIn(total, 2) + '" placeholder="0,00"><p class="help">Si escribes el total, calculo las participaciones con el precio.</p></div>' +
      '<div class="fld"><label class="lbl" for="f-note">Nota (opcional)</label><input class="field" id="f-note" name="note" value="' + esc(tx && tx.note || '') + '" maxlength="120"></div>' +
      (!tx ? '<div class="plan-box" id="planInline"' + (side === 'sell' ? ' hidden' : '') + '><label class="check"><input type="checkbox" name="mkplan" id="f-mkplan"> Repetir esta compra cada mes</label>' +
        '<div id="planInlineBody" hidden><div class="f-row keep"><div class="fld"><label class="lbl" for="f-pamt">Importe por aportación (€)</label><input class="field" id="f-pamt" name="pamount" inputmode="decimal" placeholder="100"></div>' +
        '<div class="fld"><span class="lbl">Desde</span><span class="faint" style="padding-top:12px">Mañana en adelante</span></div></div>' +
        '<div class="fld" style="margin-top:12px"><span class="lbl">Días del mes</span>' + daysPicker([new Date().getDate() === 1 ? 2 : 1]) + '</div></div></div>' : '') +
      '<p class="help err" id="txErr" hidden></p>' +
      '<button class="btn primary wide" type="submit" id="txSubmit">' + (tx ? 'Guardar cambios' : side === 'sell' ? 'Guardar venta' : 'Guardar compra') + '</button>' +
    '</form>';
}
function daysPicker(days) {
  return '<div class="days" role="group" aria-label="Días del mes">' + Array.from({ length: 31 }, (_, i) => '<button type="button" data-action="day" data-d="' + (i + 1) + '" aria-pressed="' + days.includes(i + 1) + '">' + (i + 1) + '</button>').join('') + '</div>' +
    '<input type="hidden" name="days" value="' + days.join(',') + '"><p class="help">Puedes marcar varios. Si un mes no tiene ese día, se usa el último.</p>';
}
function txRecalc(f, src) {
  const el = f.elements;
  const q = parseNum(el.qty.value), p = parseNum(el.price.value), fe = parseNum(el.fees.value) || 0, sell = el.side.value === 'sell';
  if (src === 'total') {
    const tot = parseNum(el.total.value);
    if (p > 0 && isFinite(tot)) { const qq = sell ? (tot + fe) / p : (tot - fe) / p; el.qty.value = qq > 0 ? numIn(qq, 6) : ''; }
    return;
  }
  if (q > 0 && p > 0) el.total.value = numIn(sell ? q * p - fe : q * p + fe, 2);
}
function txDateChanged(f) {
  const ctx = topCtx(); const a = txAsset(ctx); if (!a) return;
  const date = f.elements.date.value;
  ctx.date = date;
  if (ctx.txId || !validDate(date)) return;
  const pref = priceOn(a, date);
  const pr = f.elements.price;
  if (!pr.dataset.touched && pref && pref.price > 0) { pr.value = numIn(pref.price, 4); txRecalc(f, 'price'); }
  const h = $('#priceHelp'); if (h) h.innerHTML = priceHelp(a, date, pref, null);
}

/* ---------- Ficha de activo */
function shAsset(id) {
  const a = D().get(id); if (!a) return shGone();
  const p = calcPos(a); const t = TYPES[typeOf(a)];
  const plans = all('plan').filter(x => x.targetId === id);
  const txs = txsOf(a).reverse();
  const dayPct = (a.price > 0 && a.prev > 0) ? a.price / a.prev - 1 : null;
  const canFetch = B.mcp && !S.demo && a.symbol;
  const q = encodeURIComponent((a.isin || a.symbol || a.name) + ' cotización');
  return head(a.name) +
    '<div class="asset-head"><span class="badge" style="--k:var(' + t.k + ')">' + esc(badgeTxt(a)) + '</span><div style="min-width:0"><p class="label" style="margin:0">' + esc(a.symbol || 'Sin ticker') + '</p><p class="big2 money">' + pxf(priceEUR(a)) + '</p></div></div>' +
    '<div class="subline">' + (dayPct != null ? '<span class="delta ' + cls(dayPct) + '">' + pct(dayPct) + '</span><span class="faint">hoy</span>' : '') + '<span class="pill">' + t.l + '</span>' + (curOf(a) !== 'EUR' ? '<span class="pill">Cotiza en ' + esc(a.currency) + '</span>' : '') + (a.priceAt ? '<span class="faint">' + (a.manualAt && a.manualAt === a.priceAt ? 'Precio manual ' : 'Actualizado ') + ago(a.priceAt) + '</span>' : '') + '</div>' +
    '<div class="mini" id="miniChart"></div>' +
    (a.hist && a.hist.c && a.hist.c.length > 1 ? '<p class="help">Puntos: tus compras y ventas. Línea discontinua: tu precio medio.</p>' : '') +
    '<dl class="stats">' +
      '<div><dt>Participaciones</dt><dd>' + qtyf(p.qty) + '</dd></div>' +
      '<div><dt>Precio medio</dt><dd>' + pxf(p.avg) + '</dd></div>' +
      '<div><dt>Invertido</dt><dd>' + eur(p.cost) + '</dd></div>' +
      '<div><dt>Valor actual</dt><dd>' + eur(p.value) + '</dd></div>' +
      '<div><dt>Rentabilidad</dt><dd class="' + cls(p.pnl) + '">' + seur(p.pnl) + '<br><small>' + pct(p.pnlPct) + '</small></dd></div>' +
      '<div><dt>Ganancia realizada</dt><dd class="' + cls(p.realized) + '">' + seur(p.realized) + '</dd></div>' +
    '</dl>' +
    ((p.pendN || p.estN) ? '<div class="banner-in warn" style="margin-top:14px"><span>' + [p.pendN ? p.pendN + ' sin precio' : '', p.estN ? p.estN + ' con precio aproximado' : ''].filter(Boolean).join(' y ') + '.</span>' + (canFetch ? '<button class="btn sm ghost" data-action="fill-hist" data-id="' + esc(id) + '"' + (B.busy ? ' disabled' : '') + '>Buscar precios</button>' : '') + '</div>' : '') +
    '<div class="card-actions" style="margin-top:16px"><button class="btn primary sm" data-action="tx-new" data-id="' + esc(id) + '">' + IC.plus + 'Operación</button><button class="btn ghost sm" data-action="add-plan" data-target="' + esc(id) + '">Plan mensual</button></div>' +
    '<section class="sh-sec"><h3>Operaciones</h3>' + (txs.length ? '<ul class="tx-list">' + txs.map(x => txItem(a, x)).join('') + '</ul>' : '<p class="empty-small">Sin operaciones.</p>') + '</section>' +
    (plans.length ? '<section class="sh-sec"><h3>Planes de este activo</h3><ul class="simple-list">' + plans.map(pl => '<li><div class="l"><strong>' + eur(pl.amount) + '</strong><small>' + esc(daysText(pl.days)) + (pl.active ? '' : ', en pausa') + '</small></div><button class="btn ghost sm" data-action="edit-plan" data-id="' + esc(pl.id) + '">Editar</button></li>').join('') + '</ul></section>' : '') +
    '<section class="sh-sec"><h3>Datos del activo</h3><form class="form" data-form="assetEdit" data-id="' + esc(id) + '" novalidate>' +
      '<div class="fld"><label class="lbl" for="e-name">Nombre</label><input class="field" id="e-name" name="name" value="' + esc(a.name) + '" maxlength="80"></div>' +
      '<div class="f-row"><div class="fld"><label class="lbl" for="e-type">Tipo</label><select class="field" id="e-type" name="type">' + typeOptions(typeOf(a)) + '</select></div>' +
      '<div class="fld"><label class="lbl" for="e-sym">Ticker de Yahoo</label><input class="field" id="e-sym" name="symbol" value="' + esc(a.symbol || '') + '" placeholder="Ej. IWDA.AS" maxlength="24" autocapitalize="characters"></div></div>' +
      '<div class="f-row"><div class="fld"><label class="lbl" for="e-isin">ISIN</label><input class="field" id="e-isin" name="isin" value="' + esc(a.isin || '') + '" maxlength="12" autocapitalize="characters"></div>' +
      '<div class="fld"><label class="lbl" for="e-mprice">Poner precio a mano (€)</label><input class="field" id="e-mprice" name="mprice" inputmode="decimal" placeholder="' + esc(numIn(priceEUR(a), 4) || '0,00') + '"></div></div>' +
      '<button class="btn ghost" type="submit">Guardar datos</button></form>' +
      '<div class="links" style="margin-top:14px">' + (a.symbol && !S.demo ? '<a class="linkbtn" href="https://finance.yahoo.com/quote/' + encodeURIComponent(a.symbol) + '" target="_blank" rel="noopener">Ver en Yahoo Finance' + IC.ext + '</a>' : '') + '<a class="linkbtn" href="https://www.google.com/search?q=' + q + '" target="_blank" rel="noopener">Buscar en Google' + IC.ext + '</a></div>' +
    '</section>' +
    '<section class="sh-sec"><button class="btn danger wide" data-action="asset-del" data-id="' + esc(id) + '">Eliminar activo</button><p class="help" style="margin-top:8px">Se borran también sus operaciones y planes. Podrás deshacerlo.</p></section>';
}
function txItem(a, x) {
  const flags = [];
  if (x.plan) flags.push('<span class="pill acc">Plan</span>');
  if (x.pending) flags.push('<span class="pill warn">Sin precio</span>');
  else if (x.est) flags.push('<span class="pill warn">Precio aproximado</span>');
  const detail = x.pending ? datef(x.date) + ', pendiente de precio' : datef(x.date) + ' · ' + qtyf(x.qty) + ' a ' + pxf(x.price);
  return '<li><div class="l"><strong>' + (x.side === 'sell' ? 'Venta' : 'Compra') + flags.join('') + '</strong><small>' + detail + '</small></div>' +
    '<div class="r num ' + (x.side === 'sell' ? 'up' : '') + '">' + (x.side === 'sell' ? '+' : '') + eur(x.amount) + '</div>' +
    '<div class="acts"><button class="iconbtn" data-action="tx-edit" data-a="' + esc(a.id) + '" data-t="' + esc(x.id) + '" aria-label="Editar operación">' + IC.edit + '</button><button class="iconbtn" data-action="tx-del" data-a="' + esc(a.id) + '" data-t="' + esc(x.id) + '" aria-label="Eliminar operación">' + IC.trash + '</button></div></li>';
}

/* ---------- Ficha de cuenta */
function shCash(id) {
  const c = D().get(id); if (!c) return shGone();
  const r = cashCalc(c);
  const month = r.bal > 0 ? r.bal * (Math.pow(1 + r.apy / 100, 30 / 365) - 1) : 0;
  const rates = (c.rates || []).map((x, i) => Object.assign({ i }, x)).sort((a, b) => a.from < b.from ? 1 : -1);
  const moves = dedupeSort(c.moves).reverse();
  return head(c.name) +
    '<p class="label" style="margin-top:6px">Saldo hoy</p><p class="big2 money">' + eur(r.bal) + '</p>' +
    '<div class="subline"><span class="pill acc">TAE ' + NP.format(r.apy) + ' %</span><span class="delta ' + cls(r.interest) + '">' + seur(r.interest) + '</span><span class="faint">de intereses</span></div>' +
    '<div class="mini" id="miniChart"></div>' +
    '<dl class="stats"><div><dt>Aportado neto</dt><dd>' + eur(r.principal) + '</dd></div><div><dt>Próximo mes</dt><dd>' + eur(month) + '</dd></div><div><dt>En un año</dt><dd>' + eur(r.bal > 0 ? r.bal * r.apy / 100 : 0) + '</dd></div></dl>' +
    '<section class="sh-sec"><h3>Ingresar o retirar</h3>' + cashMoveForm(id, []).replace('style="margin-top:18px"', '') + '</section>' +
    '<section class="sh-sec"><h3>TAE</h3><ul class="simple-list">' + rates.map(x => '<li><div class="l"><strong>' + NP.format(+x.apy || 0) + ' %</strong><small>Desde el ' + datef(x.from) + '</small></div>' + (rates.length > 1 ? '<button class="iconbtn" data-action="rate-del" data-c="' + esc(id) + '" data-i="' + x.i + '" aria-label="Quitar este tipo">' + IC.trash + '</button>' : '') + '</li>').join('') + '</ul>' +
      '<form class="form" data-form="rate" data-cash="' + esc(id) + '" style="margin-top:10px" novalidate><div class="f-row keep"><div class="fld"><label class="lbl" for="r-apy">Nueva TAE (%)</label><input class="field" id="r-apy" name="apy" inputmode="decimal" placeholder="2,00"></div>' +
      '<div class="fld"><label class="lbl" for="r-from">Desde</label><input class="field" type="date" id="r-from" name="from" value="' + todayStr() + '"></div></div><p class="help err" id="rateErr" hidden></p><button class="btn ghost" type="submit">Cambiar TAE</button></form></section>' +
    '<section class="sh-sec"><h3>Movimientos</h3>' + (moves.length ? '<ul class="tx-list">' + moves.map(m => '<li><div class="l"><strong>' + (m.amount >= 0 ? 'Ingreso' : 'Retirada') + (m.plan ? '<span class="pill acc">Plan</span>' : '') + '</strong><small>' + datef(m.date) + (m.note && !m.plan ? ', ' + esc(m.note) : '') + '</small></div><div class="r num ' + (m.amount >= 0 ? '' : 'down') + '">' + seur(+m.amount) + '</div><div class="acts"><button class="iconbtn" data-action="move-del" data-c="' + esc(id) + '" data-m="' + esc(m.id) + '" aria-label="Eliminar movimiento">' + IC.trash + '</button></div></li>').join('') + '</ul>' : '<p class="empty-small">Sin movimientos.</p>') + '</section>' +
    '<section class="sh-sec"><h3>Cuenta</h3><form class="form" data-form="cashEdit" data-id="' + esc(id) + '" novalidate><div class="inline"><input class="field" id="ce-name" name="name" value="' + esc(c.name) + '" aria-label="Nombre de la cuenta" maxlength="60"><button class="btn ghost" type="submit" style="height:46px">Renombrar</button></div></form>' +
      '<button class="btn danger wide" style="margin-top:16px" data-action="cash-del" data-id="' + esc(id) + '">Eliminar cuenta</button></section>';
}

/* ---------- Plan */
function shPlan(ctx) { return head(ctx.planId ? 'Editar plan' : 'Nuevo plan mensual') + planFormHTML(ctx); }
function planFormHTML(ctx) {
  const plan = ctx.planId ? D().get(ctx.planId) : null;
  const assets = all('asset'), accs = all('cash');
  if (!assets.length && !accs.length) return '<div class="empty" style="padding:24px 0"><p>Primero añade una inversión o una cuenta de liquidez. Después podrás programar aportaciones mensuales.</p><div class="btns"><button class="btn primary" data-action="add-tab" data-k="inv">Añadir inversión</button><button class="btn ghost" data-action="add-tab" data-k="cash">Añadir liquidez</button></div></div>';
  const tgt = (plan && plan.targetId) || ctx.targetId || '';
  const days = (plan && plan.days) || [1];
  return '<form class="form" data-form="plan" data-plan="' + esc(plan ? plan.id : '') + '" style="margin-top:18px" novalidate>' +
    '<div class="fld"><label class="lbl" for="p-target">Destino</label><select class="field" id="p-target" name="target">' +
      (assets.length ? '<optgroup label="Inversiones">' + assets.map(a => '<option value="' + esc(a.id) + '"' + (a.id === tgt ? ' selected' : '') + '>' + esc(a.name) + '</option>').join('') + '</optgroup>' : '') +
      (accs.length ? '<optgroup label="Liquidez">' + accs.map(c => '<option value="' + esc(c.id) + '"' + (c.id === tgt ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</optgroup>' : '') +
    '</select></div>' +
    '<div class="f-row keep"><div class="fld"><label class="lbl" for="p-amount">Importe por aportación (€)</label><input class="field" id="p-amount" name="amount" inputmode="decimal" value="' + numIn(plan && plan.amount) + '" placeholder="100"></div>' +
    '<div class="fld"><label class="lbl" for="p-fees">Comisión (€)</label><input class="field" id="p-fees" name="fees" inputmode="decimal" value="' + numIn(plan && plan.fees) + '" placeholder="0"></div></div>' +
    '<div class="fld"><span class="lbl">Días del mes</span>' + daysPicker(days) + '</div>' +
    '<div class="f-row keep"><div class="fld"><label class="lbl" for="p-start">Desde</label><input class="field" type="date" id="p-start" name="start" value="' + esc((plan && plan.start) || todayStr()) + '"></div>' +
    '<div class="fld"><label class="lbl" for="p-end">Hasta (opcional)</label><input class="field" type="date" id="p-end" name="end" value="' + esc((plan && plan.end) || '') + '"></div></div>' +
    '<p class="preview" id="planPreview">' + planPreviewText(plan, tgt || (assets[0] || accs[0]).id, days, (plan && plan.start) || todayStr(), (plan && plan.end) || '') + '</p>' +
    '<p class="help err" id="planErr" hidden></p>' +
    '<button class="btn primary wide" type="submit">' + (plan ? 'Guardar plan' : 'Crear plan') + '</button></form>';
}
function planPreviewText(plan, targetId, days, start, end) {
  if (!days.length) return 'Marca al menos un día del mes.';
  if (!validDate(start)) return 'Elige la fecha de inicio.';
  const tmp = { id: plan ? plan.id : '__nuevo', days, start, end, activeFrom: plan && plan.activeFrom, skip: plan ? plan.skip : [], target: D().get(targetId) && D().get(targetId).kind === 'cash' ? 'cash' : 'asset', targetId };
  const t = todayEd();
  const s = planStartEd(tmp), e = Math.min(t, planEndEd(tmp));
  const done = plan ? doneDates(tmp) : new Set();
  const past = planDates(tmp, s, e).filter(x => !done.has(fromEd(x)));
  const nx = nextRunEd(tmp);
  let txt = nx != null ? 'Próxima aportación: ' + datef(fromEd(nx)) + '.' : 'No quedan fechas dentro del periodo.';
  if (past.length) txt += ' Se apuntarán ' + past.length + (past.length === 1 ? ' aportación ya pasada' : ' aportaciones ya pasadas') + ', desde el ' + datef(fromEd(past[0])) + ', con el precio de cada fecha.';
  return esc(txt);
}
function updatePlanPreview(f) {
  const el = f.elements; const pv = f.querySelector('#planPreview'); if (!pv) return;
  const plan = f.dataset.plan ? D().get(f.dataset.plan) : null;
  const days = String(el.days.value || '').split(',').map(Number).filter(Boolean);
  pv.innerHTML = planPreviewText(plan, el.target.value, days, el.start.value, el.end.value);
}

/* ---------- Ajustes */
function modeLabel() {
  if (S.demo) return 'Ejemplo en memoria';
  if (S.mode === 'db') return 'Guardados en tu cuenta de Claude (privados)';
  if (S.mode === 'local') return STANDALONE ? 'En este dispositivo (sin conexión con Claude)' : 'Solo en este navegador';
  return 'Conectando';
}
function shSettings() {
  const docs = Array.from(S.docs.values());
  const st = settings();
  return head('Ajustes') +
    '<section class="sh-sec" style="margin-top:8px"><h3>Estado</h3><dl class="kv">' +
      '<dt>Datos</dt><dd>' + modeLabel() + '</dd>' +
      '<dt>Precios online</dt><dd>' + (B.mcp ? 'Disponibles con el navegador de Claude' : STANDALONE ? 'No incluidos en esta versión' : B.checked ? 'No disponibles en este dispositivo' : 'Comprobando') + '</dd>' +
      '<dt>Últimos precios</dt><dd>' + (st.pricesAt ? ago(st.pricesAt) : 'Nunca') + '</dd>' +
      '<dt>Registros</dt><dd>' + docs.length + '</dd>' +
    '</dl></section>' +
    '<section class="sh-sec"><h3>Copia de seguridad</h3><p class="help" style="margin-bottom:10px">Copia este texto y guárdalo donde quieras. Para restaurar, pégalo en el cuadro de abajo.</p>' +
      '<textarea class="field" id="exportTxt" readonly rows="4" aria-label="Copia de seguridad">' + esc(JSON.stringify({ app: 'cartera', v: 1, at: new Date().toISOString(), docs })) + '</textarea>' +
      '<div class="card-actions" style="margin-top:10px"><button class="btn ghost sm" data-action="copy-export">Copiar</button></div></section>' +
    '<section class="sh-sec"><h3>Restaurar</h3><form class="form" data-form="import" novalidate><textarea class="field" id="importTxt" name="txt" rows="3" placeholder="Pega aquí una copia de seguridad" aria-label="Copia para restaurar"></textarea><button class="btn ghost" type="submit">Restaurar copia</button></form></section>' +
    '<section class="sh-sec"><h3>Diagnóstico</h3><textarea class="field" readonly rows="5" id="diagTxt" aria-label="Diagnóstico">' + esc(S.diag.join('\n')) + '</textarea></section>' +
    '<section class="sh-sec"><h3>Borrar</h3><button class="btn danger" data-action="wipe">Borrar todos mis datos</button><p class="help" style="margin-top:8px">Pide un segundo toque para confirmar y se puede deshacer justo después.</p></section>';
}

/* =========================================================
   Acciones
   ========================================================= */
const ACT = {};
const FORM = {};
const INPUT = {};
const CHANGE = {};
const inSheet = el => !!el.closest('#sheet');

ACT.tab = el => { if (SH.open && inSheet(el)) closeSheet(); setTab(el.dataset.tab); };
ACT.range = el => { UI.range = +el.dataset.r; saveUI(); UI.histCache = null; render(); };
ACT.filter = el => { UI.filter = el.dataset.k; saveUI(); render(); };
ACT.add = () => openAdd(UI.tab === 'liquidez' ? 'cash' : UI.tab === 'planes' ? 'plan' : 'inv');
ACT['add-inv'] = () => openAdd('inv');
ACT['add-cash'] = () => openAdd('cash');
ACT['add-plan'] = el => {
  const view = { fn: shPlan, args: [{ targetId: el.dataset.target || '' }], title: 'Nuevo plan' };
  if (SH.open && inSheet(el)) openSheet(view, true); else openSheet(view);
};
ACT['add-tab'] = el => { AD.tab = el.dataset.k; if (SH.stack[0] && SH.stack[0].fn === shAdd) { SH.stack = [SH.stack[0]]; paintSheet(true); } else openAdd(AD.tab); };
ACT['cash-mode'] = el => { AD.cashMode = el.dataset.m; paintSheet(true); };
ACT['sheet-close'] = () => closeSheet();
ACT['banner-ok'] = () => { lsSet('cartera.bannerOk', 1); renderBanner(); };
ACT['sheet-back'] = () => sheetBack();
ACT.refresh = () => refreshPrices();
ACT.settings = () => openSheet({ fn: shSettings, title: 'Ajustes' });
ACT['demo-on'] = () => { S.demo = true; S.demoDocs = new Map(demoDocs().map(d => [d.id, d])); runPlans(true); if (SH.open) closeSheet(); UI.tab = 'resumen'; render(true); };
ACT['demo-off'] = () => { S.demo = false; S.demoDocs = new Map(); if (SH.open) closeSheet(); if (S.needPlans) { S.needPlans = false; runPlans(); } render(true); };
ACT['open-asset'] = el => { const id = el.dataset.id; const v = { fn: shAsset, args: [id], live: true, after: () => drawAssetMini(id), title: 'Activo' }; openSheet(v, SH.open && inSheet(el)); };
ACT['open-cash'] = el => { const id = el.dataset.id; const v = { fn: shCash, args: [id], live: true, after: () => drawCashMini(id), title: 'Cuenta' }; openSheet(v, SH.open && inSheet(el)); };
ACT['edit-plan'] = el => { const v = { fn: shPlan, args: [{ planId: el.dataset.id }], title: 'Plan' }; openSheet(v, SH.open && inSheet(el)); };
ACT['toggle-plan'] = el => {
  const p = clone(D().get(el.dataset.id)); if (!p) return;
  p.active = !p.active;
  if (p.active) p.activeFrom = todayStr();
  put(p);
  if (p.active) runPlans();
  toast(p.active ? 'Plan reanudado. Sigue desde hoy.' : 'Plan en pausa');
};
ACT['plan-del'] = el => { const id = el.dataset.id; const before = [snap(id)]; remove(id); withUndo('Plan eliminado. Sus aportaciones se mantienen.', before); };
ACT.pick = async el => {
  const src = el.dataset.src, i = +el.dataset.i;
  if (src === 'mine') { const a = AD.mine[i]; if (a) openSheet({ fn: shTx, args: [{ assetId: a.id }], title: 'Operación' }, true); return; }
  const item = src === 'online' ? (AD.online || [])[i] : AD.cat[i];
  if (!item) return;
  const existing = item.symbol && all('asset').find(a => a.symbol && a.symbol === item.symbol);
  if (existing) { openSheet({ fn: shTx, args: [{ assetId: existing.id }], title: 'Operación' }, true); return; }
  const draft = { name: item.name, symbol: item.symbol || '', type: item.type, currency: item.currency || null, isin: item.isin || '', exch: item.exch || '' };
  if (B.mcp && !S.demo && (draft.symbol || draft.isin)) {
    openSheet({ fn: shLoading, args: ['Trayendo la cotización de Yahoo Finance...'] }, true);
    try {
      if (!draft.symbol && draft.isin) { const r = await ySearch(draft.isin); if (r[0]) { draft.symbol = r[0].symbol; if (!draft.type) draft.type = r[0].type; } }
      if (draft.symbol) {
        const c = await yChart(draft.symbol);
        Object.assign(draft, { currency: c.currency, price: c.price, prev: c.prev, hist: c.hist });
        if (!draft.name && c.name) draft.name = c.name;
        const cur = draft.currency === 'GBp' ? 'GBP' : draft.currency;
        if (cur && cur !== 'EUR' && !fxNow(cur)) {
          try { const fx = await yChart(cur + 'EUR=X'); const st = clone(settings()); st.fx = Object.assign({}, st.fx, { [cur]: fx.price }); st.fxHist = Object.assign({}, st.fxHist, { [cur]: fx.hist }); put(st, true); }
          catch (e) { diag('cambio ' + cur + ' falló'); }
        }
      } else toast('No encontré ese ISIN en Yahoo Finance. Pon el precio a mano.');
    } catch (e) { toast(browserErr(e)); diag('cotización: ' + (e && (e.code || e.message))); }
    if (!SH.open) return;
    SH.stack.pop();
  }
  const unknownCur = !draft.currency;
  if (unknownCur) draft.currency = 'EUR';
  if (draft.symbol && unknownCur) draft.curCheck = true;
  openSheet({ fn: shTx, args: [{ draft }], title: 'Operación' }, true);
};
ACT['manual-asset'] = () => openSheet({ fn: shManual, title: 'Añadir a mano' }, true);
ACT['tx-new'] = el => openSheet({ fn: shTx, args: [{ assetId: el.dataset.id, back: true }], title: 'Operación' }, true);
ACT['tx-edit'] = el => openSheet({ fn: shTx, args: [{ assetId: el.dataset.a, txId: el.dataset.t, back: true }], title: 'Operación' }, true);
ACT['tx-del'] = el => {
  const a0 = D().get(el.dataset.a); if (!a0) return;
  const tx = (a0.txs || []).find(t => t.id === el.dataset.t); if (!tx) return;
  const before = [snap(a0.id)];
  const a = clone(a0); a.txs = a.txs.filter(t => t.id !== tx.id);
  if (tx.plan && D().get(tx.plan)) { before.push(snap(tx.plan)); const p = clone(D().get(tx.plan)); p.skip = Array.from(new Set((p.skip || []).concat(tx.date))); put(p, true); }
  put(a);
  withUndo('Operación eliminada', before);
};
ACT['tx-side'] = el => {
  const f = el.closest('form'); if (!f || el.disabled) return;
  const v = el.dataset.v; f.elements.side.value = v;
  for (const b of $$('[data-action="tx-side"]', f)) { const on = b.dataset.v === v; b.setAttribute('aria-selected', String(on)); b.setAttribute('aria-checked', String(on)); }
  const lbl = $('#totalLbl'); if (lbl) lbl.textContent = v === 'sell' ? 'Total recibido (€)' : 'Total pagado (€)';
  const pi = $('#planInline'); if (pi) pi.hidden = v === 'sell';
  const sb = $('#txSubmit'); const ctx = topCtx(); if (sb && !ctx.txId) sb.textContent = v === 'sell' ? 'Guardar venta' : 'Guardar compra';
  txRecalc(f, 'qty');
};
ACT.day = el => {
  const f = el.closest('form'); if (!f) return;
  el.setAttribute('aria-pressed', String(el.getAttribute('aria-pressed') !== 'true'));
  const days = $$('[data-action="day"][aria-pressed="true"]', f).map(b => +b.dataset.d);
  f.elements.days.value = days.join(',');
  if (f.dataset.form === 'plan') updatePlanPreview(f);
};
ACT['date-price'] = async el => {
  const f = el.closest('form'); const ctx = topCtx(); const a = txAsset(ctx);
  if (!f || !a || !a.symbol) return;
  const date = f.elements.date.value; if (!validDate(date)) return;
  el.disabled = true; el.textContent = 'Buscando...';
  try {
    const e = toEd(date);
    const c = parseChart(await webJSON(YH + '/v8/finance/chart/' + encodeURIComponent(a.symbol) + '?period1=' + ((e - 7) * 86400) + '&period2=' + ((e + 1) * 86400) + '&interval=1d'));
    const i = lastLE(c.hist.t, e);
    if (i < 0) throw new Error('sin cotización en esa fecha');
    const px = c.hist.c[i] * mulOf(a) * (fxOn(curOf(a), e) || 1);
    if (!SH.open || !f.isConnected) return;
    f.elements.price.value = numIn(px, 4); f.elements.price.dataset.touched = '1'; ctx.price = px;
    txRecalc(f, 'price');
    const h = $('#priceHelp'); if (h) h.textContent = 'Cierre del ' + datef(fromEd(c.hist.t[i])) + ': ' + pxf(px) + '. Cámbialo si pagaste otro precio.';
  } catch (e) { toast(browserErr(e)); if (el.isConnected) { el.disabled = false; el.textContent = 'Traer el precio de esa fecha'; } }
};
ACT['fill-hist'] = async el => {
  B.busy = true; el.disabled = true;
  try { await fillHistory(el.dataset.id); } catch (e) { toast(browserErr(e)); }
  finally { B.busy = false; renderTop(); refreshOpenSheet(); }
};
ACT['fill-all'] = async () => {
  if (B.busy) return;
  B.busy = true; renderTop();
  let n = 0;
  try {
    for (const a of all('asset').filter(x => x.symbol && (x.txs || []).some(t => t.auto && (t.pending || t.est)))) n += await fillHistory(a.id, true);
    toast(n ? 'Precio completado en ' + n + (n === 1 ? ' aportación' : ' aportaciones') : 'No encontré precios nuevos para esas fechas');
  } catch (e) { toast(browserErr(e)); }
  finally { B.busy = false; renderTop(); }
};
ACT['asset-del'] = el => {
  const id = el.dataset.id; const before = [snap(id)];
  for (const p of all('plan').filter(p => p.targetId === id)) { before.push(snap(p.id)); remove(p.id); }
  remove(id); closeSheet();
  withUndo('Activo eliminado', before);
};
ACT['cash-del'] = el => {
  const id = el.dataset.id; const before = [snap(id)];
  for (const p of all('plan').filter(p => p.targetId === id)) { before.push(snap(p.id)); remove(p.id); }
  remove(id); closeSheet();
  withUndo('Cuenta eliminada', before);
};
ACT['move-del'] = el => {
  const c0 = D().get(el.dataset.c); if (!c0) return;
  const m = (c0.moves || []).find(x => x.id === el.dataset.m); if (!m) return;
  const before = [snap(c0.id)];
  const c = clone(c0); c.moves = c.moves.filter(x => x.id !== m.id);
  if (m.plan && D().get(m.plan)) { before.push(snap(m.plan)); const p = clone(D().get(m.plan)); p.skip = Array.from(new Set((p.skip || []).concat(m.date))); put(p, true); }
  put(c);
  withUndo('Movimiento eliminado', before);
};
ACT['rate-del'] = el => {
  const c0 = D().get(el.dataset.c); if (!c0) return;
  const before = [snap(c0.id)];
  const c = clone(c0); c.rates.splice(+el.dataset.i, 1); put(c);
  withUndo('Tipo eliminado', before);
};
ACT['copy-export'] = () => {
  const ta = $('#exportTxt'); if (!ta) return;
  try {
    navigator.clipboard.writeText(ta.value).then(() => toast('Copia guardada en el portapapeles'), () => { ta.focus(); ta.select(); toast('Selecciona el texto y cópialo con Ctrl+C'); });
  } catch (e) { ta.focus(); ta.select(); toast('Selecciona el texto y cópialo con Ctrl+C'); }
};
ACT.wipe = el => {
  if (el.dataset.armed !== '1') {
    el.dataset.armed = '1'; el.textContent = 'Toca otra vez para borrar todo';
    setTimeout(() => { if (el.isConnected) { el.dataset.armed = ''; el.textContent = 'Borrar todos mis datos'; } }, 4000);
    return;
  }
  const before = Array.from(D().values()).map(d => [d.id, clone(d)]);
  for (const [id] of before) remove(id);
  closeSheet();
  withUndo('Datos borrados', before);
};

/* ---------- Formularios */
FORM.search = async f => {
  const q = f.elements.q.value.trim(); AD.q = q;
  if (!q) { paintResults(); return; }
  if (!B.mcp || S.demo) { paintResults(); if (!S.demo && B.checked && !STANDALONE) toast('La búsqueda online funciona en la app de escritorio de Claude.'); return; }
  AD.searching = true; AD.err = ''; AD.lastQ = q; paintResults();
  try { AD.online = await ySearch(q); }
  catch (e) { AD.err = browserErr(e); AD.online = null; diag('búsqueda: ' + (e && (e.code || e.message))); }
  AD.searching = false; paintResults();
};
INPUT.search = (f, t) => {
  if (t.name !== 'q') return;
  AD.q = t.value;
  if (AD.online && t.value.trim() !== AD.lastQ) { AD.online = null; AD.err = ''; }
  paintResults();
};
FORM.manual = f => {
  const el = f.elements; const name = el.name.value.trim();
  if (!name) return ferr(f, 'manErr', 'Ponle un nombre.');
  const price = parseNum(el.price.value);
  const symbol = el.symbol.value.trim().toUpperCase();
  const draft = { name, type: el.type.value, symbol, isin: el.isin.value.trim().toUpperCase(), currency: 'EUR', price: price > 0 ? price : null, curCheck: !!symbol };
  if (draft.price) draft.manualAt = Date.now();
  openSheet({ fn: shTx, args: [{ draft }], title: 'Operación' }, true);
};
INPUT.tx = (f, t) => {
  if (t.name === 'price') t.dataset.touched = '1';
  if (t.name === 'date') { txDateChanged(f); return; }
  if (t.name === 'mkplan') { const b = $('#planInlineBody'); if (b) b.hidden = !t.checked; return; }
  if (['qty', 'price', 'fees', 'total'].includes(t.name)) txRecalc(f, t.name);
};
CHANGE.tx = (f, t) => { if (t.name === 'mkplan') { const b = $('#planInlineBody'); if (b) b.hidden = !t.checked; } };
function newAssetFrom(d) {
  return {
    id: newId('a'), kind: 'asset', type: d.type || 'other', name: d.name || d.symbol || 'Activo', symbol: d.symbol || '', isin: d.isin || '', exchange: d.exch || '',
    currency: d.currency || 'EUR', price: d.price > 0 ? sig(d.price) : null, prev: d.prev > 0 ? sig(d.prev) : null, hist: d.hist || null,
    priceAt: d.price > 0 ? Date.now() : null, manualAt: d.manualAt || null, curCheck: d.curCheck || undefined, txs: [], createdAt: Date.now()
  };
}
FORM.tx = f => {
  const ctx = topCtx(); const el = f.elements;
  const side = el.side.value, date = el.date.value;
  const qty = parseNum(el.qty.value), price = parseNum(el.price.value), fees = parseNum(el.fees.value) || 0;
  if (!validDate(date)) return ferr(f, 'txErr', 'Pon una fecha válida.');
  if (toEd(date) > todayEd()) return ferr(f, 'txErr', 'La fecha no puede ser futura.');
  if (!(qty > 0)) return ferr(f, 'txErr', 'Indica cuántas participaciones.');
  if (!(price > 0)) return ferr(f, 'txErr', 'Indica el precio por participación.');
  if (fees < 0) return ferr(f, 'txErr', 'La comisión no puede ser negativa.');
  let a;
  if (ctx.assetId) { const cur = D().get(ctx.assetId); if (!cur) return ferr(f, 'txErr', 'Este activo ya no existe.'); a = clone(cur); }
  else {
    const ex = ctx.draft.symbol && all('asset').find(x => x.symbol === ctx.draft.symbol);
    a = ex ? clone(ex) : newAssetFrom(ctx.draft);
    if (!ex && !(a.price > 0)) { a.price = sig(price / (unitFx(a) || 1)); a.priceAt = Date.now(); a.manualAt = a.priceAt; }
  }
  if (side === 'sell') {
    const held = calcPos(a, ctx.txId).qty;
    if (qty > held + 1e-9) return ferr(f, 'txErr', 'Solo tienes ' + qtyf(held) + ' participaciones en esa fecha o antes.');
  }
  const before = [snap(a.id)];
  a.txs = a.txs || [];
  let t = ctx.txId ? a.txs.find(x => x.id === ctx.txId) : null;
  if (!t) { t = { id: newId('t') }; a.txs.push(t); }
  Object.assign(t, { side, date, qty: sig(qty), price: sig(price), fees: round(fees, 2), amount: round(side === 'sell' ? qty * price - fees : qty * price + fees, 2), note: el.note.value.trim() });
  delete t.est; delete t.pending; delete t.auto;
  put(a);
  let msg = ctx.txId ? 'Operación actualizada' : side === 'sell' ? 'Venta guardada' : 'Compra guardada';
  if (!ctx.txId && side === 'buy' && el.mkplan && el.mkplan.checked) {
    const amt = parseNum(el.pamount.value);
    const days = String(el.days.value || '').split(',').map(Number).filter(Boolean);
    if (amt > 0 && days.length) {
      const plan = { id: newId('p'), kind: 'plan', target: 'asset', targetId: a.id, amount: round(amt, 2), fees: 0, days, start: fromEd(todayEd() + 1), end: '', active: true, createdAt: Date.now() };
      before.push([plan.id, null]); put(plan);
      msg += ' y plan creado';
    }
  }
  if (ctx.back) sheetBack(); else { closeSheet(); }
  withUndo(msg, before);
};
FORM.assetEdit = f => {
  const id = f.dataset.id; const cur = D().get(id); if (!cur) return;
  const before = [snap(id)]; const a = clone(cur); const el = f.elements;
  a.name = el.name.value.trim() || a.name;
  a.type = el.type.value;
  const sym = el.symbol.value.trim().toUpperCase();
  if (sym !== (a.symbol || '')) { a.symbol = sym; a.hist = null; a.curCheck = !!sym || undefined; if (!sym) a.currency = 'EUR'; }
  a.isin = el.isin.value.trim().toUpperCase();
  const mp = parseNum(el.mprice.value);
  if (mp > 0) {
    if (curOf(a) !== 'EUR' && !fxNow(curOf(a))) { a.currency = 'EUR'; a.hist = null; }
    a.price = sig(mp / (unitFx(a) || 1)); a.priceAt = Date.now(); a.manualAt = a.priceAt;
  }
  put(a);
  withUndo('Datos del activo guardados', before);
};
FORM.cashNew = f => {
  const el = f.elements; const name = el.name.value.trim();
  const apy = parseNum(el.apy.value), bal = parseNum(el.bal.value), date = el.date.value;
  if (!name) return ferr(f, 'cashErr', 'Ponle un nombre a la cuenta.');
  if (!(apy >= 0) || apy > 50) return ferr(f, 'cashErr', 'Escribe la TAE en %, por ejemplo 2,25.');
  if (!validDate(date) || toEd(date) > todayEd()) return ferr(f, 'cashErr', 'Pon una fecha válida, hoy o anterior.');
  if (el.bal.value.trim() && !(bal >= 0)) return ferr(f, 'cashErr', 'El saldo debe ser un número positivo.');
  const c = { id: newId('c'), kind: 'cash', name, rates: [{ from: date, apy: round(apy, 3) }], moves: bal > 0 ? [{ id: newId('m'), date, amount: round(bal, 2), note: 'Saldo inicial' }] : [], createdAt: Date.now() };
  put(c); closeSheet();
  withUndo('Cuenta creada', [[c.id, null]]);
};
FORM.cashMove = f => {
  const el = f.elements; const id = f.dataset.cash || (el.acc && el.acc.value);
  const c0 = D().get(id); if (!c0) return ferr(f, 'moveErr', 'Elige una cuenta.');
  const amt = parseNum(el.amount.value), date = el.date.value;
  if (!(amt > 0)) return ferr(f, 'moveErr', 'Escribe un importe mayor que cero.');
  if (!validDate(date) || toEd(date) > todayEd()) return ferr(f, 'moveErr', 'Pon una fecha válida, hoy o anterior.');
  const before = [snap(id)];
  const c = clone(c0); c.moves = c.moves || [];
  c.moves.push({ id: newId('m'), date, amount: round(el.dir.value === 'out' ? -amt : amt, 2), note: el.note.value.trim() });
  put(c);
  if (!f.dataset.cash) closeSheet(); else { el.amount.value = ''; el.note.value = ''; }
  withUndo(el.dir.value === 'out' ? 'Retirada guardada' : 'Ingreso guardado', before);
};
FORM.rate = f => {
  const id = f.dataset.cash; const c0 = D().get(id); if (!c0) return;
  const apy = parseNum(f.elements.apy.value), from = f.elements.from.value;
  if (!(apy >= 0) || apy > 50) return ferr(f, 'rateErr', 'Escribe la TAE en %, por ejemplo 2,00.');
  if (!validDate(from)) return ferr(f, 'rateErr', 'Pon una fecha válida.');
  const before = [snap(id)];
  const c = clone(c0); c.rates = (c.rates || []).filter(r => r.from !== from); c.rates.push({ from, apy: round(apy, 3) });
  put(c);
  withUndo('TAE actualizada', before);
};
FORM.cashEdit = f => {
  const id = f.dataset.id; const c0 = D().get(id); if (!c0) return;
  const name = f.elements.name.value.trim(); if (!name) return;
  const before = [snap(id)]; const c = clone(c0); c.name = name; put(c);
  withUndo('Cuenta renombrada', before);
};
FORM.plan = f => {
  const el = f.elements;
  const targetId = el.target.value; const tgt = D().get(targetId);
  const amount = parseNum(el.amount.value), fees = parseNum(el.fees.value) || 0;
  const days = String(el.days.value || '').split(',').map(Number).filter(Boolean);
  const start = el.start.value, end = el.end.value;
  if (!tgt) return ferr(f, 'planErr', 'Elige el destino del plan.');
  if (!(amount > 0)) return ferr(f, 'planErr', 'Escribe el importe de cada aportación.');
  if (fees < 0 || fees >= amount) return ferr(f, 'planErr', 'La comisión debe ser menor que el importe.');
  if (!days.length) return ferr(f, 'planErr', 'Marca al menos un día del mes.');
  if (!validDate(start)) return ferr(f, 'planErr', 'Elige la fecha de inicio.');
  if (end && (!validDate(end) || end < start)) return ferr(f, 'planErr', 'La fecha final debe ser posterior al inicio.');
  const old = f.dataset.plan ? D().get(f.dataset.plan) : null;
  const before = [old ? snap(old.id) : null].filter(Boolean);
  const p = old ? clone(old) : { id: newId('p'), kind: 'plan', active: true, createdAt: Date.now(), skip: [] };
  Object.assign(p, { target: tgt.kind === 'cash' ? 'cash' : 'asset', targetId, amount: round(amount, 2), fees: tgt.kind === 'cash' ? 0 : round(fees, 2), days, start, end: end || '' });
  if (!old) before.push([p.id, null]);
  const tBefore = snap(targetId);
  put(p);
  const n = runPlans(true);
  if (n) before.push(tBefore);
  if (SH.stack.length > 1) sheetBack(); else closeSheet();
  withUndo((old ? 'Plan guardado' : 'Plan creado') + (n ? '. ' + n + (n === 1 ? ' aportación apuntada' : ' aportaciones apuntadas') : ''), before);
};
INPUT.plan = f => updatePlanPreview(f);
CHANGE.plan = f => updatePlanPreview(f);
FORM.import = f => {
  let j;
  try { j = JSON.parse(f.elements.txt.value); } catch (e) { toast('Ese texto no es una copia válida.'); return; }
  const docs = ((j && j.docs) || []).filter(d => d && typeof d === 'object' && typeof d.id === 'string' && /^[A-Za-z0-9_\-.~:@+]{1,200}$/.test(d.id) && ['asset', 'cash', 'plan', 'settings'].includes(d.kind));
  if (!docs.length) { toast('No encontré datos en esa copia.'); return; }
  const before = docs.map(d => snap(d.id));
  for (const d of docs) put(clone(d), true);
  runPlans(true); scheduleRender(); closeSheet();
  withUndo('Restaurados ' + docs.length + ' registros', before);
};

/* =========================================================
   Arranque
   ========================================================= */
function bindGlobal() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]'); if (!el) return;
    const fn = ACT[el.dataset.action]; if (!fn) return;
    if (el.tagName === 'A') return;
    e.preventDefault(); fn(el, e);
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-form]'); if (!f) return;
    e.preventDefault();
    const fn = FORM[f.dataset.form]; if (fn) fn(f, e);
  });
  document.addEventListener('input', e => {
    const f = e.target.closest && e.target.closest('form[data-form]');
    if (f && INPUT[f.dataset.form]) INPUT[f.dataset.form](f, e.target);
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'sortSel') { UI.sort = e.target.value; saveUI(); render(); return; }
    const f = e.target.closest && e.target.closest('form[data-form]');
    if (f && CHANGE[f.dataset.form]) CHANGE[f.dataset.form](f, e.target);
  });
  $('#scrim').addEventListener('click', () => closeSheet());
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && SH.open) { e.preventDefault(); sheetBack(); return; }
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button' && t.dataset.action) { e.preventDefault(); t.click(); }
  });
  window.addEventListener('resize', () => { if (SH.open) { if (SH.anim) SH.anim.stop(); setSheetPos(0); } });
}
function boot() {
  const saved = lsGet(LS_UI);
  if (saved) {
    if (TABS.includes(saved.tab)) UI.tab = saved.tab;
    if ([30, 91, 182, 365].includes(saved.range)) UI.range = saved.range;
    if (saved.filter) UI.filter = saved.filter;
    if (saved.sort) UI.sort = saved.sort;
  }
  const h = String(location.hash || '').slice(1);
  if (TABS.includes(h)) UI.tab = h;
  bindGlobal(); initDrag();
  if (STANDALONE) {
    const rb = $('#refreshBtn'); if (rb) rb.hidden = true;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* sin persistencia */ }
  }
  render();
  initStore(); initBrowser();
  setInterval(() => {
    if (S.retry.size && S.mode === 'db') { const ids = Array.from(S.retry); S.retry.clear(); for (const id of ids) writeDoc(id); }
  }, 10000);
  setInterval(() => { renderTop(); }, 60000);
  setInterval(() => { if (S.mode === 'db' || S.mode === 'local') runPlans(); }, 30 * 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (S.mode === 'db' || S.mode === 'local')) { runPlans(); renderTop(); } });
}
window.__cartera = { calcPos, cashCalc, planDates, history, priceOn, runPlans, S, D, model };
boot();
})();
