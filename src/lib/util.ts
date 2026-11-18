export const $ = (s: string, el: ParentNode = document): any => el.querySelector(s);
export const $$ = (s: string, el: ParentNode = document): any[] => Array.from(el.querySelectorAll(s));
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const DAY = 86400000;
export const pad = n => String(n).padStart(2, '0');
export const newId = p => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
export const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
export function todayStr() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
export function toEd(s) { const [y, m, d] = String(s).split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); }
export function fromEd(e) { const d = new Date(e * DAY); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
export const todayEd = () => toEd(todayStr());
export function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
export function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && isFinite(toEd(s)); }

export const G: any = { useGrouping: 'always' };
export const NF = new Intl.NumberFormat('es-ES', Object.assign({ style: 'currency', currency: 'EUR' }, G));
export const NF0 = new Intl.NumberFormat('es-ES', Object.assign({ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }, G));
export const NQ = new Intl.NumberFormat('es-ES', Object.assign({ maximumFractionDigits: 6 }, G));
export const NP = new Intl.NumberFormat('es-ES', Object.assign({ minimumFractionDigits: 2, maximumFractionDigits: 2 }, G));
export const NC = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 });
export const DF = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const DFs = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const MYF = new Intl.DateTimeFormat('es-ES', { month: 'short', year: '2-digit', timeZone: 'UTC' });
export const MINUS = '−';
export const okNum = v => v != null && isFinite(v);
export function eur(v) { return okNum(v) ? NF.format(v).replace('-', MINUS) : '-'; }
export function eur0(v) { return okNum(v) ? NF0.format(v).replace('-', MINUS) : '-'; }
// valor tal cual o guion si está vacío (para campos externos, p.ej. Trading 212)
export function f(v) { return (v == null || v === '') ? '—' : v; }
// importe en euros si es número, o tal cual si viene como texto
export function money(v) { return okNum(v) ? eur(v) : f(v); }
export function seur(v) { return okNum(v) ? (v >= 0 ? '+' : MINUS) + NF.format(Math.abs(v)) : '-'; }
export function pct(v) { return okNum(v) ? (v >= 0 ? '+' : MINUS) + NP.format(Math.abs(v * 100)) + ' %' : '-'; }
export function qtyf(q) { return okNum(q) ? NQ.format(q) : '-'; }
export function pxf(v) {
  if (!okNum(v)) return '-';
  const d = Math.abs(v) < 1 ? 4 : 2;
  return new Intl.NumberFormat('es-ES', Object.assign({ style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d }, G)).format(v);
}
export function compactEur(v) { return NC.format(v) + ' €'; }
export function datef(s) { return validDate(s) ? DF.format(new Date(toEd(s) * DAY)) : '-'; }
export function datefs(s) { return validDate(s) ? DFs.format(new Date(toEd(s) * DAY)) : '-'; }
export function cls(v) { return v > 0.000001 ? 'up' : v < -0.000001 ? 'down' : 'muted'; }
export function parseNum(s) {
  if (typeof s === 'number') return s;
  s = String(s == null ? '' : s).trim().replace(/\s|€|%/g, '');
  if (!s) return NaN;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (s.includes(',')) s = s.replace(',', '.');
  return Number(s);
}
export function round(v, d) { const f = Math.pow(10, d); return Math.round(v * f) / f; }
export function sig(v) { if (!okNum(v)) return v; const a = Math.abs(v); return round(v, a >= 1000 ? 2 : a >= 1 ? 4 : 8); }
export function numIn(v, d = 2) { return okNum(v) ? String(round(v, d)).replace('.', ',') : ''; }
export function ago(ts) {
  if (!ts) return '';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'ahora mismo';
  if (m < 60) return 'hace ' + m + ' min';
  const h = Math.round(m / 60);
  if (h < 24) return 'hace ' + h + ' h';
  const d = Math.round(h / 24);
  return d === 1 ? 'hace 1 día' : 'hace ' + d + ' días';
}
export function lastLE(arr, x) { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= x) { r = m; lo = m + 1; } else hi = m - 1; } return r; }
export function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
export function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* almacenamiento no disponible */ } }
export const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
export const STANDALONE = !!window.NIDO_STANDALONE;
/* Móvil o tableta (por dispositivo, no por ancho de ventana): ahí no se puede conectar Trade Republic, que necesita el servidor local del PC. */
export const isMobileDevice = () => /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent || '') || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform || '')) || (window.matchMedia ? window.matchMedia('(pointer:coarse)').matches && window.matchMedia('(hover:none)').matches : false);
export const isDesk = () => window.matchMedia ? window.matchMedia('(min-width:760px)').matches : true;

export const svgI = d => '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>';
export const IC = {
  close: svgI('<path d="M6 6l12 12M18 6L6 18"/>'),
  back: svgI('<path d="M15 5l-7 7 7 7"/>'),
  plus: svgI('<path d="M12 5v14M5 12h14"/>'),
  edit: svgI('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  trash: svgI('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>'),
  ext: svgI('<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>')
};

