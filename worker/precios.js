/* Servidor de brokers para la versión web de Cartera.
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
const DEFAULT_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000';
const T212 = 'https://live.trading212.com/api/v0';

/* =========================================================
   Utilidades
   ========================================================= */
function reply(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, cors) });
}
function raw(body, status, cors, headers) {
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
function t212Auth(env) {
  const key = env && env.T212_KEY;
  const secret = env && env.T212_SECRET;
  if (!key || !secret) return null;
  const rawBytes = new TextEncoder().encode(key + ':' + secret);
  let bin = '';
  for (const b of rawBytes) bin += String.fromCharCode(b);
  return 'Basic ' + btoa(bin);
}
async function t212(url, env, cors) {
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
  async fetch(request, env) {
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
    if (url.pathname === '/') return reply({ ok: true, servicio: 'cartera-brokers' }, 200, cors);

    // Trading 212 (solo lectura)
    if (url.pathname.startsWith('/t212/')) {
      if (request.method !== 'GET') return reply({ error: 'Solo se admite GET' }, 405, cors);
      if (accessDenied(request, env)) return reply({ error: 'Falta la cabecera X-Access con la clave de acceso.', code: 'access_denied' }, 401, cors);
      return t212(url, env, cors);
    }

    return reply({ error: 'Ruta no permitida' }, 404, cors);
  }
};