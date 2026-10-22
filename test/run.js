'use strict';
/* Pruebas de humo con jsdom: npm install && npm test
   1) Versión Claude abierta fuera de Claude (modo local) + cartera de ejemplo
   2) Versión Claude con base de datos y Yahoo Finance simulados
   3) Versión web instalable (modo independiente), sin servidor de precios
   4) Versión web con servidor de precios simulado
   5) Servidor de precios (worker/precios.js) con Yahoo simulado */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const claudeHtml = fs.readFileSync(path.join(root, 'dist/cartera-claude.html'), 'utf8');
const webHtml = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function open(html, opts = {}) {
  const errors = [];
  const doc = opts.full ? html : '<!doctype html><html><head></head><body>' + html + '</body></html>';
  const dom = new JSDOM(doc, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/',
    beforeParse(w) {
      w.matchMedia = q => ({ matches: /min-width:760px/.test(q), addListener() {}, removeListener() {} });
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.scrollTo = () => {};
      w.addEventListener('error', e => errors.push(e.message + ' ' + (e.error && e.error.stack)));
      w.console.error = (...a) => errors.push(a.join(' '));
      if (opts.claude) w.claude = opts.claude;
      if (opts.fetch) w.fetch = opts.fetch;
    }
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
}
const fire = (w, el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true, cancelable: true }));
const ok = (name, cond, extra) => { assert.ok(cond, name + (extra ? ' -> ' + extra : '')); console.log('  ok  ' + name); };

async function testLocalDemo() {
  console.log('1) Versión Claude en modo local + ejemplo');
  const { w, d, errors } = open(claudeHtml);
  await sleep(200);
  ok('muestra el estado vacío', !!d.querySelector('.empty h2'));
  d.querySelector('[data-action="demo-on"]').click(); await sleep(100);
  const M = w.__cartera.model();
  ok('el ejemplo tiene patrimonio', M.net > 0, String(M.net));
  ok('dibuja el gráfico', !!d.querySelector('#mainChart svg'));
  for (const t of ['inversiones', 'liquidez', 'planes', 'resumen']) { d.querySelector('#topTabs [data-tab="' + t + '"]').click(); await sleep(40); }
  d.querySelector('#topTabs [data-tab="inversiones"]').click(); await sleep(40);
  d.querySelector('.row[data-action="open-asset"]').click(); await sleep(60);
  const before = d.querySelectorAll('.tx-list li').length;
  d.querySelector('[data-action="tx-new"]').click(); await sleep(40);
  const f = d.querySelector('form[data-form="tx"]');
  ok('precio sugerido', f.elements.price.value !== '');
  f.elements.qty.value = '2'; fire(w, f, 'submit'); await sleep(80);
  ok('guarda una compra', d.querySelectorAll('.tx-list li').length === before + 1);
  d.querySelector('[data-action="sheet-close"]').click(); await sleep(600);
  d.querySelector('[data-action="demo-off"]').click(); await sleep(60);
  d.querySelector('#topTabs [data-tab="liquidez"]').click(); await sleep(40);
  d.querySelector('[data-action="add-cash"]').click(); await sleep(60);
  const cf = d.querySelector('form[data-form="cashNew"]');
  cf.elements.name.value = 'Cuenta'; cf.elements.apy.value = '2'; cf.elements.bal.value = '10000';
  cf.elements.date.value = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  fire(w, cf, 'submit'); await sleep(600);
  const M2 = w.__cartera.model();
  ok('interés de 10.000 € al 2 % TAE en un año ≈ 200 €', Math.abs(M2.interest - 200) < 1.5, M2.interest.toFixed(2));
  ok('sin errores de JavaScript', errors.length === 0, errors.join('\n'));
  w.close();
}

async function testDbMock() {
  console.log('2) Versión Claude con base de datos y Yahoo simulados');
  const store = new Map(); const listeners = [];
  const emit = () => { const snap = { docs: [...store.entries()].map(([id, x]) => ({ id, data: () => JSON.parse(JSON.stringify(x)) })) }; listeners.forEach(cb => setTimeout(() => cb(snap), 5)); };
  const now = Math.floor(Date.now() / 1000);
  const series = (n, p0, step) => { const ts = [], c = []; for (let i = n; i >= 0; i--) { ts.push(now - i * 86400); c.push(+(p0 + (n - i) * step).toFixed(2)); } return { ts, c }; };
  let cur = '';
  const page = url => {
    let body;
    if (url.includes('/v1/finance/search')) body = { quotes: [{ quoteType: 'EQUITY', symbol: 'AAPL', longname: 'Apple Inc.', exchDisp: 'NASDAQ' }] };
    else if (url.includes('/v8/finance/chart/')) { const sym = decodeURIComponent(url.split('/chart/')[1].split('?')[0]); const s = series(250, sym === 'AAPL' ? 200 : 0.9, sym === 'AAPL' ? 0.1 : 0); body = { chart: { result: [{ meta: { currency: sym === 'AAPL' ? 'USD' : 'EUR', regularMarketPrice: s.c[s.c.length - 1] }, timestamp: s.ts, indicators: { quote: [{ close: s.c }] } }] } }; }
    else { const syms = decodeURIComponent(url.split('symbols=')[1].split('&')[0]).split(','); body = {}; for (const sym of syms) { const s = series(250, sym === 'AAPL' ? 210 : 0.9, sym === 'AAPL' ? 0.1 : 0); body[sym] = { timestamp: s.ts, close: s.c }; } }
    return 'Title: \nURL: ' + url + '\n---\n' + JSON.stringify(body) + '\n\nTab Context:\n- tabId seed';
  };
  const claude = {
    use: async name => {
      if (name === 'db') return { collection: () => ({ doc: id => ({ set: async x => { store.set(id, x); emit(); }, delete: async () => { store.delete(id); emit(); } }), onSnapshot: cb => { listeners.push(cb); emit(); return () => {}; } }) };
      if (name === 'user') return { id: async () => 'u_prueba' };
      if (name === 'mcp') return { callTool: async (s, tool, input) => { if (tool === 'preview_start') { cur = input.url; return { payload: '{"tabId":"seed"}' }; } if (tool === 'navigate') { cur = input.url; return { payload: 'ok' }; } return { payload: page(cur) }; } };
      return null;
    }
  };
  const { w, d, errors } = open(claudeHtml, { claude });
  await sleep(300);
  ok('conecta con la base de datos', w.__cartera.S.mode === 'db');
  d.querySelector('[data-action="add-inv"]').click(); await sleep(50);
  const q = d.querySelector('#f-q'); q.value = 'apple'; fire(w, q, 'input');
  fire(w, d.querySelector('form[data-form="search"]'), 'submit'); await sleep(100);
  ok('búsqueda online', d.querySelectorAll('#results [data-src="online"]').length === 1);
  d.querySelector('#results [data-src="online"]').click(); await sleep(200);
  const f = d.querySelector('form[data-form="tx"]');
  ok('precio convertido a euros', f.elements.price.value === '202,5', f.elements.price.value);
  f.elements.qty.value = '10'; fire(w, f, 'submit'); await sleep(300);
  const a = [...store.values()].find(x => x.kind === 'asset');
  ok('guarda el activo en la base de datos', a && a.symbol === 'AAPL' && a.currency === 'USD' && a.txs.length === 1);
  ok('guarda el tipo de cambio', store.get('settings') && store.get('settings').fx.USD === 0.9);
  d.querySelector('#refreshBtn').click(); await sleep(300);
  ok('actualiza precios', [...store.values()].find(x => x.kind === 'asset').price === 235);
  ok('sin errores de JavaScript', errors.length === 0, errors.join('\n'));
  w.close();
}

async function testWeb() {
  console.log('3) Versión web instalable');
  const { w, d, errors } = open(webHtml, { full: true });
  await sleep(200);
  ok('modo independiente', w.__cartera.S.mode === 'local');
  ok('enlaza el manifiesto', !!d.querySelector('link[rel="manifest"]'));
  ok('oculta la actualización de precios', d.querySelector('#refreshBtn').hidden === true);
  ok('aviso de datos en el dispositivo', /este dispositivo/.test(d.querySelector('#banner').textContent));
  ok('sin errores de JavaScript', errors.length === 0, errors.join('\n'));
  w.close();
}

function yahooBody(url) {
  const now = Math.floor(Date.now() / 1000);
  const series = (n, p0, step) => { const ts = [], c = []; for (let i = n; i >= 0; i--) { ts.push(now - i * 86400); c.push(+(p0 + (n - i) * step).toFixed(2)); } return { ts, c }; };
  if (url.includes('/v1/finance/search')) return { quotes: [{ quoteType: 'EQUITY', symbol: 'AMZN', longname: 'Amazon.com, Inc.', exchDisp: 'NASDAQ' }] };
  if (url.includes('/v8/finance/chart/')) {
    const sym = decodeURIComponent(url.split('/chart/')[1].split('?')[0]);
    const s = series(250, sym === 'AMZN' ? 180 : 0.9, sym === 'AMZN' ? 0.1 : 0);
    return { chart: { result: [{ meta: { currency: sym === 'AMZN' ? 'USD' : 'EUR', regularMarketPrice: s.c[s.c.length - 1] }, timestamp: s.ts, indicators: { quote: [{ close: s.c }] } }] } };
  }
  const syms = decodeURIComponent(url.split('symbols=')[1].split('&')[0]).split(',');
  const out = {};
  for (const sym of syms) { const s = series(250, sym === 'AMZN' ? 190 : 0.9, sym === 'AMZN' ? 0.1 : 0); out[sym] = { timestamp: s.ts, close: s.c }; }
  return out;
}
const resp = (obj, status) => ({ ok: (status || 200) < 400, status: status || 200, text: async () => JSON.stringify(obj), json: async () => obj });

async function testWebProxy() {
  console.log('4) Versión web con servidor de precios');
  const calls = [];
  const fetchMock = async url => {
    url = String(url); calls.push(url);
    if (url.endsWith('config.json')) return resp({ priceProxy: 'https://precios.test' });
    if (!url.startsWith('https://precios.test/')) throw new Error('dirección inesperada ' + url);
    return resp(yahooBody(url));
  };
  const { w, d, errors } = open(webHtml, { full: true, fetch: fetchMock });
  await sleep(250);
  ok('lee config.json', calls.some(u => u.endsWith('config.json')));
  ok('muestra el botón de precios', d.querySelector('#refreshBtn').hidden === false);
  d.querySelector('[data-action="add-inv"]').click(); await sleep(60);
  ok('ofrece buscar online', /Buscar online/.test(d.querySelector('form[data-form="search"] button[type=submit]').textContent));
  const q = d.querySelector('#f-q'); q.value = 'amazon'; fire(w, q, 'input');
  fire(w, d.querySelector('form[data-form="search"]'), 'submit'); await sleep(100);
  ok('encuentra Amazon en Yahoo', /Amazon/.test(d.querySelector('#results [data-src="online"]').textContent));
  d.querySelector('#results [data-src="online"]').click(); await sleep(200);
  const f = d.querySelector('form[data-form="tx"]');
  ok('trae el precio en euros', f.elements.price.value === '184,5', f.elements.price.value);
  ok('ya no pone Sin precio', !/Sin precio/.test(d.querySelector('.chosen').textContent));
  f.elements.qty.value = '3'; fire(w, f, 'submit'); await sleep(700);
  d.querySelector('#refreshBtn').click(); await sleep(300);
  const a = [...w.__cartera.D().values()].find(x => x.kind === 'asset');
  ok('actualiza la cotización', a.price === 215, String(a.price));
  d.querySelector('[data-action="settings"]').click(); await sleep(60);
  ok('Ajustes muestra el servidor', /Activos con tu servidor/.test(d.querySelector('.kv').textContent) && d.querySelector('#px-url').value === 'https://precios.test');
  ok('todas las consultas van a tu servidor', calls.filter(u => !u.endsWith('config.json')).every(u => u.startsWith('https://precios.test/v')));
  ok('sin errores de JavaScript', errors.length === 0, errors.join('\n'));
  w.close();
}

async function testWorker() {
  console.log('5) Servidor de precios');
  const mod = await import(require('url').pathToFileURL(path.join(root, 'worker/precios.js')).href);
  const worker = mod.default;
  const seen = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { seen.push({ url: String(url), init }); return new Response(JSON.stringify(yahooBody(String(url))), { status: 200 }); };
  try {
    const ORIGIN = 'https://nestoralmale24.github.io';
    let r = await worker.fetch(new Request('https://w.test/v8/finance/chart/USDEUR%3DX?range=1y&interval=1d&malo=1', { headers: { Origin: ORIGIN } }), {});
    ok('reenvía el histórico a Yahoo', r.status === 200 && seen[0].url === 'https://query1.finance.yahoo.com/v8/finance/chart/USDEUR%3DX?range=1y&interval=1d', seen[0] && seen[0].url);
    ok('cabecera CORS para tu web', r.headers.get('Access-Control-Allow-Origin') === ORIGIN);
    r = await worker.fetch(new Request('https://w.test/v8/finance/spark?symbols=AMZN,EURUSD=X&range=1y&interval=1d', { headers: { Origin: ORIGIN } }), {});
    ok('reenvía la cotización múltiple', r.status === 200 && /symbols=AMZN%2CEURUSD%3DX/.test(seen[1].url));
    r = await worker.fetch(new Request('https://w.test/v1/finance/search?q=amazon', { headers: { Origin: ORIGIN } }), {});
    ok('reenvía la búsqueda', r.status === 200 && seen[2].url.startsWith('https://query1.finance.yahoo.com/v1/finance/search?q=amazon'));
    r = await worker.fetch(new Request('https://w.test/v10/finance/quoteSummary/AAPL', { headers: { Origin: ORIGIN } }), {});
    ok('rechaza otras rutas', r.status === 404 && seen.length === 3);
    r = await worker.fetch(new Request('https://w.test/v1/finance/search?q=x', { headers: { Origin: 'https://otra-web.example' } }), {});
    ok('rechaza otras webs', r.status === 403 && seen.length === 3);
    r = await worker.fetch(new Request('https://w.test/v1/finance/search?q=x', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), {});
    ok('responde a la comprobación previa', r.status === 204);
    r = await worker.fetch(new Request('https://w.test/v1/finance/search?q=x', { headers: { Origin: 'https://otra-web.example' } }), { ALLOWED_ORIGINS: '*' });
    ok('ALLOWED_ORIGINS="*" abre a cualquier web', r.status === 200);
  } finally { globalThis.fetch = realFetch; }
}

(async () => {
  await testLocalDemo();
  await testDbMock();
  await testWeb();
  await testWebProxy();
  await testWorker();
  console.log('Todas las pruebas han pasado.');
})().catch(e => { console.error('FALLO: ' + e.stack); process.exit(1); });
