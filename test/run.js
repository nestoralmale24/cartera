'use strict';
/* Pruebas de humo con jsdom: npm install && npm test
   1) Versión Claude abierta fuera de Claude (modo local) + cartera de ejemplo
   2) Versión Claude con base de datos y Yahoo Finance simulados
   3) Versión web instalable (modo independiente) */
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

(async () => {
  await testLocalDemo();
  await testDbMock();
  await testWeb();
  console.log('Todas las pruebas han pasado.');
})().catch(e => { console.error('FALLO: ' + e.stack); process.exit(1); });
