/* Servidor local de Trade Republic para Nido.
   Corre con Bun. Hace de puente con Trade Republic (NO oficial) usando la
   librería "trapi": gestiona el login por QR (incluido el WAF de AWS con
   Puppeteer que ese flujo requiere) y sirve el portfolio en SOLO LECTURA.

   Uso:
     cd tr-server
     bun install          (o: npm run serve desde la raíz, que lo hace solo)
     bun server.ts

   Endpoints (todos devuelven JSON y llevan CORS para localhost):
     GET  /            -> { ok:true, servicio:"nido-tr-local" }
     POST /login       -> inicia el flujo QR. El QR se obtiene con GET /qr.
     GET  /qr          -> { ok:true, qrPayload, status }  (payload actual para pintar)
     GET  /status      -> { ok:true, status:"pending"|"connected" }
     GET  /portfolio   -> { ok:true, positions:[...], cash:[...], plans:[...] } en solo lectura
      GET  /history?isin=..&range=..&exchange=.. -> velas de precio { ok:true, candles:[[ms,cierre],...] }
     GET  /market/chart?isin=..&range=..  -> precios de mercado (Yahoo) de respaldo { t, c, unit, prev }
     GET  /portfolio también devuelve interest:[{date,amount}] (intereses cobrados por el saldo)

   La sesión se guarda en ~/.tr_api_cookies.json (lo hace trapi) para no tener
   que volver a escanear el QR en cada arranque. */
import { TradeRepublicApi, createMessage, silentLogger } from "trapi";
import os from "os";
import fs from "fs";
import path from "path";

const PORT = Number(process.env.PORT || 8788);
// Solo escucha en tu equipo (127.0.0.1). Si quieres usar la app desde otro
// dispositivo de tu red, arranca con HOST=0.0.0.0.
const HOST = process.env.HOST || "127.0.0.1";
// Orígenes de navegador que pueden consultar este servidor. Por defecto solo
// tu equipo en desarrollo. Para usarla desde GitHub Pages u otro dominio,
// arranca con ALLOWED_ORIGINS=https://TU-USUARIO.github.io,http://localhost:3000
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
  .split(",").map(s => s.trim()).filter(Boolean);

// Estado global del puente. Vive mientras el proceso esté corriendo.
const state = {
  status: "idle",          // idle | pending | connected | error
  qrPayload: null,         // payload del QR mientras está en "pending"
  error: null,
  portfolio: null,         // última lectura de posiciones
  cash: null,              // último saldo
  plans: null,             // últimos planes de ahorro
  interest: [],            // intereses cobrados por el saldo [{date, amount}]
  at: null,                // timestamp de la última lectura
  histCache: {}            // velas por "isin|range|exchange" -> { at, data }
};

let api = null;            // instancia de TradeRepublicApi (trapi)
let loginPromise = null;   // login en curso

/* Crear una instancia de trapi con el evento 'error' manejado: si Trade
   Republic rechaza la sesión (401), trapi emite 'error'; sin listener, ese
   evento es una excepción no capturada y mata el proceso. Con listener, el
   login() simplemente falla y podemos pedir un QR nuevo. */
function newApi() {
  const a = new TradeRepublicApi(undefined, undefined, undefined, silentLogger);
  a.on("error", (err) => log("trapi (esperado si la sesión caducó):", err && err.message));
  return a;
}

/* Borra la cookie de sesión guardada por trapi (la ruta por defecto). */
function clearSavedSessionFile() {
  try {
    const p = path.join(os.homedir(), ".tr_api_cookies.json");
    if (fs.existsSync(p)) { fs.unlinkSync(p); log("Sesión guardada borrada:", p); }
  } catch (e) { log("No pude borrar la sesión guardada:", e && e.message); }
}

function log(...a) { console.log(new Date().toISOString(), ...a); }

function corsHeaders(origin) {
  const any = ALLOWED_ORIGINS.includes("*");
  const allow = any ? "*" : (origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8"
  };
}
function json(origin, obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: corsHeaders(origin) });
}

/* Suscripción única con timeout y reintentos si la sesión aún no está lista
   (trapi devuelve -1 cuando el token no está listo); resuelve null si falla. */
function subOnce(api, msg, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    let id = -1;
    let tries = 0;
    const attempt = () => {
      if (done) return;
      try { id = api.subscribeOnce(msg, (data) => { if (!done) { done = true; resolve(data); } }); }
      catch (e) { id = -1; }
      if (id < 0) {
        if (tries < 6) { tries++; setTimeout(attempt, 600); }
        else { resolve(null); }
        return;
      }
      setTimeout(() => { if (!done) { done = true; resolve(null); } }, timeoutMs);
    };
    attempt();
  });
}

/* averageBuyIn puede venir como número o como { value, currency } según la
   versión del mensaje de Trade Republic. */
function numAvg(ab) {
  if (ab == null) return null;
  const v = typeof ab === 'object' ? ab.value : ab;
  const n = Number(v);
  return isFinite(n) ? n : null;
}
function curOf(ab) {
  if (ab && typeof ab === 'object' && ab.currency) return ab.currency;
  return 'EUR';
}

/* Extrae positions de una respuesta compactPortfolioByType(o V2). */
function parsePositions(payload) {
  const out = [];
  if (payload && Array.isArray(payload.categories)) {
    for (const cat of payload.categories) {
      for (const p of (cat.positions || [])) {
        if (!p.isin) continue;
        out.push({
          name: p.name || '',
          isin: p.isin,
          netSize: Number(p.netSize || 0),
          averageBuyIn: numAvg(p.averageBuyIn),
          currency: curOf(p.averageBuyIn),
          instrumentType: p.instrumentType || cat.categoryType || ''
        });
      }
    }
  }
  return out;
}

/* ¿Es una posición de cripto? (Trade Republic usa ISINs XF* para cripto). */
function isCryptoPos(p) {
  const it = String(p.instrumentType || '').toLowerCase();
  return it.includes('crypto') || /^XF/i.test(String(p.isin || ''));
}

/* Precio del ticker en un exchange concreto; prefiere ask y luego last. */
async function tickerPrice(api, isin, slug) {
  const t = await subOnce(api, createMessage("ticker", { id: isin + '.' + slug }), 6000);
  if (!t) return null;
  const ask = t.ask && t.ask.price != null ? Number(t.ask.price) : null;
  const last = t.last && t.last.price != null ? Number(t.last.price) : null;
  return ask != null ? ask : (last != null ? last : null);
}

/* Slugs de exchange activos de un instrumento (fallback vía mensaje "instrument"). */
async function slugsFromInstrument(api, isin) {
  try {
    const inst = await subOnce(api, createMessage("instrument", { id: isin, jurisdiction: 'DE' }), 8000);
    if (inst && Array.isArray(inst.exchanges)) {
      return inst.exchanges.filter(e => e && e.active && e.slug).map(e => e.slug).slice(0, 3);
    }
  } catch (e) { /* sin datos del instrumento */ }
  return [];
}

async function readPortfolio() {
  // Número de cuenta de valores (Trade Republic pide secAccNo en cuentas nuevas).
  let secAccNo;
  const acc = await subOnce(api, createMessage("accountPairs"), 8000);
  if (acc && Array.isArray(acc.accounts) && acc.accounts.length) {
    secAccNo = acc.accounts[0].securitiesAccountNumber;
  }

  // Posiciones: compactPortfolioByType; si viene vacío, probamos con V2.
  let positions = parsePositions(await subOnce(api, createMessage("compactPortfolioByType", secAccNo ? { secAccNo } : undefined), 15000));
  if (!positions.length) {
    positions = parsePositions(await subOnce(api, createMessage("compactPortfolioByTypeV2", { secAccNo: secAccNo || "" }), 15000));
  }
  log("Posiciones leídas:", positions.length);

  // Invertido por posición.
  for (const p of positions) {
    const qty = p.netSize || 0;
    p.invested = (p.averageBuyIn != null && qty) ? p.averageBuyIn * qty : null;
  }

  // Emisor y nombre completo de fondos/ETF (Nido los usa para mostrar el logo de la gestora).
  for (const p of positions) {
    if (!p.isin || !/fund|etf/i.test(String(p.instrumentType || ""))) continue;
    try {
      const inst = await subOnce(api, createMessage("instrument", { id: p.isin, jurisdiction: "DE" }), 6000);
      if (!inst) continue;
      const iss = inst.issuerDisplayName || inst.issuer;
      p.issuer = typeof iss === "string" ? iss : ((iss && (iss.displayName || iss.name)) || "");
      p.fullName = inst.name || "";
    } catch (e) { /* sin datos del emisor */ }
  }

  // Precio actual por ISIN. Las criptos no cotizan en LSX: se prueban los
  // exchanges de cripto (BSX, TUB) y, si no, los que devuelva el instrumento.
  for (const p of positions) {
    if (!p.isin) continue;
    const qty = p.netSize || 0;
    const slugs = isCryptoPos(p) ? ['BSX', 'TUB'] : ['LSX'];
    let price = null;
    for (const s of slugs) {
      price = await tickerPrice(api, p.isin, s);
      if (price != null) break;
    }
    if (price == null) {
      for (const s of await slugsFromInstrument(api, p.isin)) {
        if (s === 'LSX' || slugs.includes(s)) continue;
        price = await tickerPrice(api, p.isin, s);
        if (price != null) break;
      }
    }
    p.currentPrice = price;
    p.value = (price != null && qty) ? price * qty : null;
    p.ppl = (p.value != null && p.invested != null) ? p.value - p.invested : null;
  }

  // Saldo disponible.
  let cash = [];
  await new Promise((resolve) => {
    api.subscribeOnce(createMessage("availableCash"), (data) => {
      if (Array.isArray(data)) cash = data.map(c => ({ amount: c.amount, currency: c.currencyId }));
      resolve();
    });
    setTimeout(resolve, 10000);
  });

  // Planes de ahorro de Trade Republic.
  const plansData = await subOnce(api, createMessage("savingsPlans"), 8000);
  const plans = (plansData && plansData.savingsPlans) || [];
  log("Planes leídos:", plans.length);

  // Nombre del instrumento de cada plan si TR no lo trae (búsqueda por ISIN).
  for (const plan of plans) {
    const ins = plan && plan.instrument;
    const isin = (ins && (ins.isin || ins.wkn)) || (plan && (plan.instrumentId || plan.isin)) || '';
    const curName = ins && ins.name;
    if (!curName && isin) {
      plan.instrumentName = await planNameByIsin(api, isin);
    }
  }

  const interest = await readInterest(api);
  return { positions, cash, plans, interest };
}

/* Intereses cobrados por el saldo: se buscan en el historial de movimientos de
   Trade Republic (mensaje "timelineTransactions", no oficial). Devuelve
   [{ date:"YYYY-MM-DD", amount }]. Si el formato cambia o no hay datos, [] sin romper nada. */
async function readInterest(api) {
  const out = [];
  try {
    let after = null;
    for (let page = 0; page < 8; page++) {
      const res = await subOnce(api, createMessage("timelineTransactions", after ? { after } : undefined), 8000);
      const items = res && Array.isArray(res.items) ? res.items : [];
      for (const it of items) {
        if (!it || it.deleted) continue;
        const text = (String(it.title || "") + " " + String(it.subtitle || "") + " " + String(it.eventType || "")).toLowerCase();
        const v = it.amount && Number(it.amount.value);
        if (/interest|zins|inter[eé]s/.test(text) && isFinite(v) && v > 0 && it.timestamp) out.push({ date: String(it.timestamp).slice(0, 10), amount: v });
      }
      after = res && res.cursors && res.cursors.after;
      if (!after || !items.length) break;
    }
  } catch (e) { log("intereses: no pude leerlos:", e && e.message); }
  log("Intereses leídos:", out.length);
  return out;
}

/* =========================================================
   Histórico de precios (mensaje "aggregateHistory" de TR)
   ========================================================= */
const HIST_TTL = 20 * 60 * 1000; // las velas se reutilizan 20 minutos
const HIST_RANGES = new Set(["1d", "5d", "1m", "3m", "6m", "1y", "5y", "max"]);

/* Normaliza la respuesta de aggregateHistory (no oficial; el formato puede
   variar) a una lista [[ms, cierre], ...] ordenada por tiempo. */
function parseCandles(data) {
  const raw = data && (data.aggregates || data.candles || data.values || data.timeseries);
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const k of raw) {
    if (!k || typeof k !== "object") continue;
    let t = k.t != null ? k.t : (k.timestamp != null ? k.timestamp : k.time);
    let c = k.c != null ? k.c : (k.close != null ? k.close : (k.adjValue != null ? k.adjValue : null));
    if (t == null || c == null) continue;
    t = Number(t); c = Number(c);
    if (!isFinite(t) || !isFinite(c)) continue;
    if (t < 1e11) t *= 1000; // segundos -> milisegundos
    const vol = k.volume != null ? Number(k.volume) : 0;
    out.push([t, c, isFinite(vol) ? vol : 0]);
  }
  if (out.length < 2) return null;
  out.sort((a, b) => a[0] - b[0]);
  return out;
}

/* Velas de un instrumento. "range" va de 1d a max (tal y como los entiende
   Trade Republic). Con caché en memoria para no repetir peticiones al
   WebSocket con la actualización automática cada pocos segundos. */
async function readHistory(api, isin, range, exchange) {
  const key = isin + "|" + range + "|" + exchange;
  const hit = state.histCache[key];
  if (hit && Date.now() - hit.at < HIST_TTL) return hit.data;
  // El mensaje vigente es aggregateHistoryLight (velas en "aggregates"); se prueban variantes antiguas por si cambia.
  const id = isin + "." + exchange;
  let data = parseCandles(await subOnce(api, createMessage("aggregateHistoryLight", { id, range }), 10000));
  if (!data) data = parseCandles(await subOnce(api, createMessage("aggregateHistoryLight", { id, range, resolution: 86400000 }), 10000));
  if (!data) data = parseCandles(await subOnce(api, createMessage("aggregateHistory", { id, range }), 10000));
  if (data) state.histCache[key] = { at: Date.now(), data };
  else delete state.histCache[key];
  return data;
}

/* Nombre de un instrumento buscando su ISIN en el buscador de Trade Republic. */
async function planNameByIsin(api, isin) {
  try {
    const res = await subOnce(api, createMessage("neonSearch", { data: { q: String(isin), page: 1, pageSize: 3, filter: [] } }), 8000);
    const list = (res && res.results) || [];
    const hit = list.find(r => String(r.isin || '').toUpperCase() === String(isin).toUpperCase());
    return hit && hit.name ? hit.name : null;
  } catch (e) { return null; }
}

/* Precios de mercado de respaldo (Yahoo Finance, sin claves) por ISIN. Se usa cuando
   Trade Republic no devuelve velas. Misma respuesta que /market/chart del Worker. */
const YF = "https://query1.finance.yahoo.com";
const YF_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; nido)", "Accept": "application/json" };
const YF_RANGES = new Set(["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"]);
const INTRADAY = { "1d": "1m", "5d": "5m", "1mo": "60m", "3mo": "60m" };
const DAILY = { "5y": "1wk", "max": "1mo" };

/* Resuelve un ISIN a símbolos de Yahoo (hasta 3 candidatos con tipo válido). */
async function yfSymbols(isin) {
  const s = await fetch(YF + "/v1/finance/search?q=" + isin + "&quotesCount=8&newsCount=0", { headers: YF_HEADERS });
  const sj = await s.json();
  return ((sj && sj.quotes) || []).filter(x => x && x.symbol && /^(EQUITY|ETF|MUTUALFUND|CRYPTOCURRENCY)$/.test(x.quoteType))
    .map(x => ({ symbol: String(x.symbol).toUpperCase(), name: String(x.longname || x.shortname || "") })).slice(0, 3);
}
/* Velas de un símbolo: { symbol, currency, unit, prev, t, c, v } o null. Intradía: t en segundos; diario: t en días. */
async function yfChart(symbol, range) {
  const intra = !!INTRADAY[range];
  const r = await fetch(YF + "/v8/finance/chart/" + encodeURIComponent(symbol) + "?range=" + range + "&interval=" + (INTRADAY[range] || DAILY[range] || "1d"), { headers: YF_HEADERS });
  const j = await r.json();
  const res = j && j.chart && j.chart.result && j.chart.result[0];
  const q = res && res.indicators && res.indicators.quote && res.indicators.quote[0];
  const ts = res && res.timestamp, cl = q && q.close, vo = q && q.volume;
  if (!Array.isArray(ts) || !Array.isArray(cl)) return null;
  const t = [], c = [], v = [];
  for (let i = 0; i < ts.length; i++) {
    if (typeof cl[i] !== "number" || !(cl[i] > 0)) continue;
    const d = intra ? ts[i] : Math.floor(ts[i] / 86400);
    const vol = vo && typeof vo[i] === "number" ? vo[i] : 0;
    if (t.length && t[t.length - 1] === d) { c[c.length - 1] = cl[i]; v[v.length - 1] += vol; continue; }
    t.push(d); c.push(cl[i]); v.push(vol);
  }
  if (t.length < 2) return null;
  const meta = res.meta || {};
  const prev = meta.chartPreviousClose > 0 ? meta.chartPreviousClose : (meta.previousClose > 0 ? meta.previousClose : null);
  return { symbol, currency: meta.currency || "", unit: intra ? "s" : "d", prev, t, c, v: v.some(x => x > 0) ? v : null };
}
async function marketChart(isin, range) {
  for (const q of await yfSymbols(isin)) {
    const out = await yfChart(q.symbol, range);
    if (out) { if (q.name) out.name = q.name; return out; }
  }
  return null;
}

function startLogin() {
  if (loginPromise) return loginPromise;
  state.status = "pending";
  state.qrPayload = null;
  state.error = null;

  api = newApi();

  loginPromise = api.loginWithQrCode((qrCodePayload) => {
    // trapI llama a este callback cuando el QR está listo (o rota).
    if (qrCodePayload) { state.qrPayload = qrCodePayload; log("QR listo (payload recibido)"); }
  }).then(async (ok) => {
    if (!ok) {
      state.status = "error";
      state.error = "No se pudo iniciar sesión QR. Revisa la app de Trade Republic y reintenta.";
      return false;
    }
    try {
      state.status = "loading"; // QR aprobado: leyendo la cartera (tarda unos segundos)
      const { positions, cash, plans, interest } = await readPortfolio();
      state.portfolio = positions;
      state.cash = cash;
      state.plans = plans;
      state.interest = interest;
      state.at = Date.now();
      state.status = "connected";
      log("Conectado. Posiciones:", positions.length, "Planes:", plans.length);
    } catch (e) {
      state.status = "error";
      state.error = "Conectado pero no pude leer el portfolio: " + (e && e.message);
    }
    return true;
  }).catch((e) => {
    state.status = "error";
    state.error = "Login QR falló: " + (e && e.message);
    return false;
  }).finally(() => { loginPromise = null; });

  return loginPromise;
}

/* Sesión disponible para rutas protegidas. Devuelve null si hay sesión o una
   respuesta JSON lista para enviar si no la hay. */
async function guardSession(origin) {
  if (state.status === "pending") return json(origin, { ok: false, code: "tr_pending", error: "Escanea y confirma el QR en la app." }, 409);
  if (state.status === "loading") return json(origin, { ok: false, code: "tr_pending", error: "Cargando tu cartera de Trade Republic..." }, 409);
  const ok = await ensureConnected();
  if (!ok) {
    if (state.error) return json(origin, { ok: false, code: "tr_login", error: state.error }, 401);
    return json(origin, { ok: false, code: "tr_login", error: "No hay sesión. Haz login con el QR primero." }, 401);
  }
  return null;
}

async function ensureConnected() {
  // Reutiliza la sesión guardada por trapi si existe, sin QR.
  if (state.status === "connected") return true;
  if (state.status === "pending" || state.status === "loading") return false;
  // La sesión ya falló una vez: no reintentemos en bucle; hay que re-vincular con QR.
  if (state.status === "expired") return false;

  // Intento de login con sesión guardada (la librería la reutiliza si es válida).
  try {
    const fresh = newApi();
    const ok = await fresh.login();
    if (ok) {
      api = fresh;
      const { positions, cash, plans, interest } = await readPortfolio();
      state.portfolio = positions;
      state.cash = cash;
      state.plans = plans;
      state.interest = interest;
      state.at = Date.now();
      state.status = "connected";
      return true;
    }
    log("login con sesión guardada no válido");
  } catch (e) {
    log("login con sesión guardada falló:", e && e.message);
  }
  // La sesión guardada no sirve (p.ej. 401): la borramos y pedimos re-vincular.
  clearSavedSessionFile();
  state.status = "expired";
  state.error = "La sesión de Trade Republic caducó. Vuelve a vincular con el QR.";
  return false;
}

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url);
    const origin = req.headers.get("origin") || "";
    const cors = corsHeaders(origin);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    if (url.pathname === "/") return json(origin, { ok: true, servicio: "nido-tr-local" });
    if (url.pathname === "/login" && req.method === "POST") {
      startLogin();
      return json(origin, { ok: true, status: "qr" });
    }
    if (url.pathname === "/qr" && req.method === "GET") {
      return json(origin, { ok: true, status: state.status, qrPayload: state.qrPayload });
    }
    if (url.pathname === "/status" && req.method === "GET") {
      return json(origin, { ok: true, status: state.status, error: state.error });
    }
    if (url.pathname === "/portfolio" && req.method === "GET") {
      const g = await guardSession(origin);
      if (g) return g;
      return json(origin, { ok: true, positions: state.portfolio, cash: state.cash, plans: state.plans, interest: state.interest || [], at: state.at });
    }
    if (url.pathname === "/history" && req.method === "GET") {
      const isin = String(url.searchParams.get("isin") || "").toUpperCase();
      const range = String(url.searchParams.get("range") || "1y").toLowerCase();
      const exchange = String(url.searchParams.get("exchange") || "LSX").toUpperCase();
      if (!/^[A-Z0-9]{4,12}$/.test(isin)) return json(origin, { ok: false, code: "tr_bad_isin", error: "ISIN no válido." }, 400);
      if (!HIST_RANGES.has(range)) return json(origin, { ok: false, code: "tr_bad_range", error: "Rango no válido." }, 400);
      if (!/^[A-Z0-9]{1,10}$/.test(exchange)) return json(origin, { ok: false, code: "tr_bad_exchange", error: "Exchange no válido." }, 400);
      const g = await guardSession(origin);
      if (g) return g;
      const candles = await readHistory(api, isin, range, exchange);
      if (!candles) return json(origin, { ok: false, code: "tr_no_history", error: "Trade Republic no devolvió histórico para ese instrumento." }, 404);
      return json(origin, { ok: true, isin, range, exchange, candles });
    }
    if (url.pathname === "/market/chart" && req.method === "GET") {
      const isin = String(url.searchParams.get("isin") || "").toUpperCase();
      const range = String(url.searchParams.get("range") || "1y").toLowerCase();
      if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) return json(origin, { ok: false, code: "market_bad_isin", error: "ISIN no válido." }, 400);
      if (!YF_RANGES.has(range)) return json(origin, { ok: false, code: "market_bad_range", error: "Rango no válido." }, 400);
      try {
        const data = await marketChart(isin, range);
        if (!data) return json(origin, { ok: false, code: "market_not_found", error: "Sin histórico de mercado para ese ISIN." }, 404);
        return json(origin, data);
      } catch (e) { return json(origin, { ok: false, code: "market_unreachable", error: "El servicio de precios no responde." }, 502); }
    }
    return json(origin, { ok: false, error: "Ruta no permitida" }, 404);
  }
});

log("Servidor local de Trade Republic escuchando en http://localhost:" + PORT + "/");