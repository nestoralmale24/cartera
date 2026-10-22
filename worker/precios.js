/* Servidor de precios para la versión web de Cartera.
   Se despliega gratis en Cloudflare Workers. Reenvía solo tres consultas de lectura
   de Yahoo Finance (búsqueda, histórico y cotización múltiple) y añade las cabeceras CORS
   que el navegador necesita. No guarda nada ni ve tus posiciones: solo tickers.

   Orígenes permitidos: variable ALLOWED_ORIGINS (separados por comas) o, si no existe,
   la lista DEFAULT_ORIGINS de abajo. Usa "*" para permitir cualquiera. */
const DEFAULT_ORIGINS = 'https://nestoralmale24.github.io,http://localhost:3000,http://127.0.0.1:3000';
const YAHOO = 'https://query1.finance.yahoo.com';
const PATHS = [
  /^\/v1\/finance\/search$/,
  /^\/v8\/finance\/chart\/[A-Za-z0-9.\-^=%]{1,40}$/,
  /^\/v8\/finance\/spark$/
];
const PARAMS = new Set(['q', 'quotesCount', 'newsCount', 'listsCount', 'lang', 'region', 'range', 'interval', 'period1', 'period2', 'symbols', 'includePrePost']);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export default {
  async fetch(request, env) {
    const origins = String((env && env.ALLOWED_ORIGINS) || DEFAULT_ORIGINS).split(',').map(s => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin');
    const any = origins.includes('*');
    const allowed = any || !origin || origins.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': any ? '*' : (origin && origins.includes(origin) ? origin : origins[0]),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return reply({ error: 'Solo se admite GET' }, 405, cors);
    if (!allowed) return reply({ error: 'Origen no permitido: ' + origin }, 403, cors);

    const url = new URL(request.url);
    if (url.pathname === '/') return reply({ ok: true, servicio: 'cartera-precios' }, 200, cors);
    if (!PATHS.some(re => re.test(url.pathname))) return reply({ error: 'Ruta no permitida' }, 404, cors);

    const q = new URLSearchParams();
    for (const [k, v] of url.searchParams) if (PARAMS.has(k) && v.length <= 400) q.set(k, v);
    const qs = q.toString();
    const target = YAHOO + url.pathname + (qs ? '?' + qs : '');
    const ttl = url.pathname.endsWith('/search') ? 3600 : url.searchParams.has('period1') ? 21600 : 120;

    let upstream;
    try {
      upstream = await fetch(target, {
        headers: { 'User-Agent': UA, 'Accept': 'application/json,text/plain,*/*' },
        cf: { cacheTtl: ttl, cacheEverything: true }
      });
    } catch (e) {
      return reply({ error: 'Yahoo Finance no responde' }, 502, cors);
    }
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=' + Math.min(ttl, 300) }, cors)
    });
  }
};

function reply(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors) });
}
