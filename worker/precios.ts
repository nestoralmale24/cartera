/* Servidor de brokers para la versión web de Nido.
   Se despliega gratis en Cloudflare Workers. Reenvía consultas de SOLO LECTURA a
   Trading 212 (cuenta, posiciones, historial) y añade las cabeceras CORS que el
   navegador necesita. No guarda nada.

   Orígenes permitidos: variable ALLOWED_ORIGINS (separados por comas) o, si no existe,
   la lista DEFAULT_ORIGINS de abajo (solo tu equipo en desarrollo). Para usarla desde
   GitHub Pages u otro dominio, crea ALLOWED_ORIGINS en el panel (Settings → Variables)
   o en [vars] de wrangler.toml. Usa "*" para permitir cualquiera.

   Trading 212: autenticación Basic con las variables secretas del Worker
   T212_KEY (API Key) y T212_SECRET (API Secret). Configúralas en el panel de
   Cloudflare (Settings → Variables → Secrets). La API Key jamás se envía al navegador.

   Clave de acceso opcional: si defines el secreto ACCESS_KEY, las rutas /t212/*
   exigen la cabecera X-Access con ese valor (la app la pide en Ajustes →
   "Clave de acceso"). Evita que cualquiera con la URL del Worker lea tu cuenta
   sorteando el control de origen con curl. El token nunca se reenvía a Trading 212.

   Trade Republic NO se sirve desde aquí: usa un servidor local en tu PC
   (carpeta tr-server/) porque requiere un flujo QR con WebSocket y WAF (Puppeteer)
   que un Worker no puede hacer. Ver README. */
/** Variables y secretos del Worker (panel de Cloudflare). */
export interface Env {
  ALLOWED_ORIGINS?: string;
  T212_KEY?: string;
  T212_SECRET?: string;
  ACCESS_KEY?: string;
}
type Cors = Record<string, string>;

const DEFAULT_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000';
const T212 = 'https://live.trading212.com/api/v0';

/* =========================================================
   Utilidades
   ========================================================= */
function reply(obj: unknown, status: number, cors: Cors) {
  return new Response(JSON.stringify(obj), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, cors) });
}
function raw(body: BodyInit | null, status: number, cors: Cors, headers?: Record<string, string>) {
  return new Response(body, { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, cors, headers || {}) });
}

/* =========================================================
   Trading 212 (solo lectura)
   ========================================================= */
const T212_PATHS = {
  '/t212/account': '/equity/account/summary',
  '/t212/positions': '/equity/positions',
  '/t212/history': '/equity/history/orders'
};
function t212Auth(env?: Env) {
  const key = env && env.T212_KEY;
  const secret = env && env.T212_SECRET;
  if (!key || !secret) return null;
  const rawBytes = new TextEncoder().encode(key + ':' + secret);
  let bin = '';
  for (const b of rawBytes) bin += String.fromCharCode(b);
  return 'Basic ' + btoa(bin);
}
async function t212(url: URL, env: Env | undefined, cors: Cors) {
  const auth = t212Auth(env);
  if (!auth) return reply({ error: 'Trading 212 no está configurado', code: 't212_unconfigured' }, 200, cors);
  const path = T212_PATHS[url.pathname];
  if (!path) return reply({ error: 'Ruta no permitida' }, 404, cors);
  // limit y cursor para la paginación del histórico
  const q = new URLSearchParams();
  const limit = url.searchParams.get('limit');
  const cursor = url.searchParams.get('cursor');
  if (limit && /^\d{1,2}$/.test(limit)) q.set('limit', limit);
  if (cursor) q.set('cursor', cursor);
  const qs = q.toString();
  try {
    const upstream = await fetch(T212 + path + (qs ? '?' + qs : ''), {
      headers: { 'Authorization': auth, 'Accept': 'application/json' }
    });
    const body = await upstream.text();
    return raw(body, upstream.status, cors);
  } catch (e) {
    return reply({ error: 'Trading 212 no responde', code: 't212_unreachable' }, 502, cors);
  }
}

/* =========================================================
   Histórico de precios (Yahoo Finance, solo lectura, sin claves)
   Trading 212 no publica histórico; la app lo pide aquí por ISIN para
   dibujar las gráficas. Yahoo no admite CORS desde el navegador, por eso
   pasa por el Worker. Devuelve { symbol, currency, t:[días], c:[cierre] }.
   ========================================================= */
const YF = 'https://query1.finance.yahoo.com';
const YF_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; nido)', 'Accept': 'application/json' };
const RANGES = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'];
// Intradía (t en segundos): 1m en el día, 5m en la semana, 1h en 1 y 3 meses. El resto, diario/semanal (t en días).
const INTRADAY = { '1d': '1m', '5d': '5m', '1mo': '60m', '3mo': '60m' };
const DAILY = { '5y': '1wk', 'max': '1mo' };
/* Resuelve un ISIN a símbolos de Yahoo (hasta 3 candidatos con tipo válido). */
async function yfSymbols(isin) {
  const s = await fetch(YF + '/v1/finance/search?q=' + isin + '&quotesCount=8&newsCount=0', { headers: YF_HEADERS });
  const sj = await s.json();
  return ((sj && sj.quotes) || []).filter(x => x && x.symbol && /^(EQUITY|ETF|MUTUALFUND|CRYPTOCURRENCY)$/.test(x.quoteType))
    .map(x => ({ symbol: String(x.symbol).toUpperCase(), name: String(x.longname || x.shortname || '') })).slice(0, 3);
}
/* Velas de un símbolo: { symbol, currency, unit, prev, t, c, v } o null. Intradía: t en segundos; diario: t en días. */
async function yfChart(symbol, range) {
  const intra = !!INTRADAY[range];
  const r = await fetch(YF + '/v8/finance/chart/' + encodeURIComponent(symbol) + '?range=' + range + '&interval=' + (INTRADAY[range] || DAILY[range] || '1d'), { headers: YF_HEADERS });
  const j = await r.json();
  const res = j && j.chart && j.chart.result && j.chart.result[0];
  const q = res && res.indicators && res.indicators.quote && res.indicators.quote[0];
  const ts = res && res.timestamp, cl = q && q.close, vo = q && q.volume;
  if (!Array.isArray(ts) || !Array.isArray(cl)) return null;
  const t = [], c = [], v = [];
  for (let i = 0; i < ts.length; i++) {
    if (typeof cl[i] !== 'number' || !(cl[i] > 0)) continue;
    const d = intra ? ts[i] : Math.floor(ts[i] / 86400);
    const vol = vo && typeof vo[i] === 'number' ? vo[i] : 0;
    if (t.length && t[t.length - 1] === d) { c[c.length - 1] = cl[i]; v[v.length - 1] += vol; continue; }
    t.push(d); c.push(cl[i]); v.push(vol);
  }
  if (t.length < 2) return null;
  const meta = res.meta || {};
  const prev = meta.chartPreviousClose > 0 ? meta.chartPreviousClose : (meta.previousClose > 0 ? meta.previousClose : null);
  return { symbol, currency: meta.currency || '', unit: intra ? 's' : 'd', prev, t, c, v: v.some(x => x > 0) ? v : null };
}
async function marketChart(url, cors) {
  const range = url.searchParams.get('range') || '1y';
  if (RANGES.indexOf(range) < 0) return reply({ error: 'Rango no válido' }, 400, cors);
  let symbol = (url.searchParams.get('symbol') || '').toUpperCase();
  const isin = (url.searchParams.get('isin') || '').toUpperCase();
  try {
    let list;
    if (symbol) {
      if (!/^[A-Z0-9.^=-]{1,16}$/.test(symbol)) return reply({ error: 'Símbolo no válido' }, 400, cors);
      list = [{ symbol }];
    } else {
      if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) return reply({ error: 'Falta un ISIN válido' }, 400, cors);
      list = await yfSymbols(isin);
      if (!list.length) return reply({ error: 'Sin cotización para ese ISIN', code: 'market_not_found' }, 404, cors);
    }
    for (const q of list) {
      const out: any = await yfChart(q.symbol, range);
      if (out) { if (q.name) out.name = q.name; return reply(out, 200, cors); }
    }
    return reply({ error: 'Sin histórico para ' + list[0].symbol, code: 'market_not_found' }, 404, cors);
  } catch (e) {
    return reply({ error: 'El servicio de precios no responde', code: 'market_unreachable' }, 502, cors);
  }
}

/* Clave de acceso (secreto ACCESS_KEY). Si no está definida, no se exige. */
function accessDenied(request, env) {
  const key = env && env.ACCESS_KEY;
  if (!key) return false;
  return request.headers.get('X-Access') !== key;
}

/* =========================================================
   Enrutador
   ========================================================= */
export default {
  async fetch(request: Request, env?: Env): Promise<Response> {
    const origins = String((env && env.ALLOWED_ORIGINS) || DEFAULT_ORIGINS).split(',').map(s => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin');
    const any = origins.includes('*');
    const allowed = any || !origin || origins.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': any ? '*' : (origin && origins.includes(origin) ? origin : origins[0]),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept, Content-Type, X-Access',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!allowed) return reply({ error: 'Origen no permitido: ' + origin + '. Añádelo a la variable ALLOWED_ORIGINS de este Worker, separado por comas.', code: 'origin_denied' }, 403, cors);

    const url = new URL(request.url);
    if (url.pathname === '/') return reply({ ok: true, servicio: 'nido-brokers' }, 200, cors);

    // Trading 212 (solo lectura)
    if (url.pathname.startsWith('/t212/')) {
      if (request.method !== 'GET') return reply({ error: 'Solo se admite GET' }, 405, cors);
      if (accessDenied(request, env)) return reply({ error: 'Falta la cabecera X-Access con la clave de acceso.', code: 'access_denied' }, 401, cors);
      return t212(url, env, cors);
    }

    // Histórico de precios (mismo control de acceso que Trading 212)
    if (url.pathname === '/market/chart') {
      if (request.method !== 'GET') return reply({ error: 'Solo se admite GET' }, 405, cors);
      if (accessDenied(request, env)) return reply({ error: 'Falta la cabecera X-Access con la clave de acceso.', code: 'access_denied' }, 401, cors);
      return marketChart(url, cors);
    }

    return reply({ error: 'Ruta no permitida' }, 404, cors);
  }
};