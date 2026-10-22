'use strict';
/* Genera las dos versiones de la cartera a partir de src/:
     dist/cartera-claude.html  -> página para publicar como artefacto en Claude (datos sincronizados y precios online)
     docs/                      -> app web instalable (PWA) para GitHub Pages: funciona sin conexión, datos en el dispositivo,
                                   precios online a través de tu servidor (worker/, dirección en config.json)
   Uso: node scripts/build.js */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const wr = (p, s) => { const f = path.join(root, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const cp = (a, b) => { const t = path.join(root, b); fs.mkdirSync(path.dirname(t), { recursive: true }); fs.copyFileSync(path.join(root, a), t); };

const page = rd('src/page.html');
const app = rd('src/app.js');
const MARK = /<script>\s*\/\*__APP__\*\/\s*<\/script>/;
if (!MARK.test(page)) throw new Error('Falta el bloque <script>/*__APP__*/</script> en src/page.html');
if (app.includes('</script')) throw new Error('src/app.js no puede contener la cadena </script');

// 1) Versión Claude (el publicador de artefactos añade doctype, head y body)
const claude = page.replace(MARK, () => '<script>\n' + app + '\n</script>');
wr('dist/cartera-claude.html', claude);

// 2) Versión web instalable
const cut = page.indexOf('<div class="app">');
if (cut < 0) throw new Error('No encuentro <div class="app"> en src/page.html');
const headPart = page.slice(0, cut).trim();
const bodyPart = page.slice(cut).replace(MARK, () => '<script>window.CARTERA_STANDALONE = true;</script>\n<script>\n' + app + '\n</script>');
const version = crypto.createHash('sha1').update(headPart + bodyPart).digest('hex').slice(0, 10);

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f1f3f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b0d12" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Cartera">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
${headPart}
</head>
<body>
${bodyPart}
<script>
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}
</script>
</body>
</html>
`;
wr('docs/index.html', html);
wr('docs/sw.js', rd('src/web/sw.js').replace('__VERSION__', version));
cp('src/web/manifest.webmanifest', 'docs/manifest.webmanifest');
// Configuración de la versión web (dirección del servidor de precios). Se edita en config.json, en la raíz.
let cfg = { priceProxy: '' };
if (fs.existsSync(path.join(root, 'config.json'))) {
  try { cfg = JSON.parse(rd('config.json')); } catch (e) { throw new Error('config.json no es un JSON válido: ' + e.message); }
}
if (cfg.priceProxy && !/^https:\/\//.test(cfg.priceProxy)) throw new Error('config.json: priceProxy debe empezar por https://');
wr('docs/config.json', JSON.stringify({ priceProxy: cfg.priceProxy || '' }, null, 2) + '\n');
for (const f of fs.readdirSync(path.join(root, 'src/web/icons'))) cp('src/web/icons/' + f, 'docs/icons/' + f);
wr('docs/.nojekyll', '');

const kb = s => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log('dist/cartera-claude.html  ' + kb(claude));
console.log('docs/index.html           ' + kb(html) + '  (versión ' + version + ')');
console.log('servidor de precios       ' + (cfg.priceProxy || 'sin configurar (config.json)'));
