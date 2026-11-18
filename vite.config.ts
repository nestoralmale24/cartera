/* Nido se publica en dos formatos a partir del mismo código (src/):
     vite build                  -> docs/            web instalable (PWA) para GitHub Pages
     vite build --mode claude    -> dist/            artefacto de Claude (un solo HTML)
     vite build --mode worker    -> dist/worker.js   servidor de brokers en JavaScript (para pegar en el panel de Cloudflare)
   Los dos son un único HTML autocontenido con el JavaScript en línea (como siempre), así que
   siguen funcionando abriéndolos directamente, sin servidor ni módulos externos. */
import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = import.meta.dirname;
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

const MARK = /<script>\s*\/\*__APP__\*\/\s*<\/script>/;
const PAGE = '<div class="app">';

/** Divide src/page.html en la parte de <head> (estilos, tema) y la del <body> (maqueta). */
function splitPage() {
  const page = read('src/page.html');
  if (!MARK.test(page)) throw new Error('Falta el bloque <script>/*__APP__*/</script> en src/page.html');
  const cut = page.indexOf(PAGE);
  if (cut < 0) throw new Error('No encuentro <div class="app"> en src/page.html');
  return { page, head: page.slice(0, cut).trim(), body: page.slice(cut) };
}

/** Lee config.json (dirección del servidor de brokers) y valida que sea https. */
function brokerConfig(): { brokerProxy: string } {
  let cfg: { brokerProxy?: string } = {};
  if (existsSync(resolve(root, 'config.json'))) {
    try { cfg = JSON.parse(read('config.json')); }
    catch (e) { throw new Error('config.json no es un JSON válido: ' + (e as Error).message); }
  }
  if (cfg.brokerProxy && !/^https:\/\//.test(cfg.brokerProxy)) throw new Error('config.json: brokerProxy debe empezar por https://');
  return { brokerProxy: cfg.brokerProxy || '' };
}

const kb = (s: string) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';

/** Compone los HTML finales con el JavaScript ya empaquetado en línea. */
function nido(mode: 'web' | 'claude'): Plugin {
  return {
    name: 'nido-html',
    apply: 'build',
    generateBundle(_o, bundle) {
      const chunk = Object.values(bundle).find(c => c.type === 'chunk');
      if (!chunk || chunk.type !== 'chunk') throw new Error('No se generó el paquete de JavaScript');
      const app = chunk.code;
      delete bundle[chunk.fileName];
      if (app.includes('</script')) throw new Error('El código empaquetado no puede contener la cadena </script');
      const { page, head, body } = splitPage();
      const emit = (fileName: string, source: string) => this.emitFile({ type: 'asset', fileName, source });

      if (mode === 'claude') {
        // El publicador de artefactos añade doctype, head y body.
        const html = page.replace(MARK, () => '<script>\n' + app + '\n</script>');
        emit('nido-claude.html', html);
        console.log('dist/nido-claude.html  ' + kb(html));
        return;
      }

      const bodyHtml = body.replace(MARK, () => '<script>window.NIDO_STANDALONE = true;</script>\n<script>\n' + app + '\n</script>');
      const version = createHash('sha1').update(head + bodyHtml).digest('hex').slice(0, 10);
      const shell = read('src/web/shell.html');
      const html = shell.replace('<!--@head-->', () => head).replace('<!--@body-->', () => bodyHtml);
      emit('index.html', html);
      emit('sw.js', read('src/web/sw.js').replace('__VERSION__', version));
      emit('manifest.webmanifest', read('src/web/manifest.webmanifest'));
      const cfg = brokerConfig();
      emit('config.json', JSON.stringify(cfg, null, 2) + '\n');
      emit('.nojekyll', '');
      for (const f of readdirSync(resolve(root, 'src/web/icons'))) {
        this.emitFile({ type: 'asset', fileName: 'icons/' + f, source: readFileSync(resolve(root, 'src/web/icons', f)) });
      }
      console.log('docs/index.html        ' + kb(html) + '  (versión ' + version + ')');
      console.log('servidor de brokers    ' + (cfg.brokerProxy || 'sin configurar (config.json)'));
    },
  };
}

/** En desarrollo (`vite`) sirve la versión web con recarga en caliente. */
function devPage(): Plugin {
  return {
    name: 'nido-dev',
    apply: 'serve',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        const { head, body } = splitPage();
        const bodyHtml = body.replace(MARK, '<script>window.NIDO_STANDALONE = true;</script>\n<script type="module" src="/src/main.ts"></script>');
        return read('src/web/shell.html').replace('<!--@head-->', () => head).replace('<!--@body-->', () => bodyHtml)
          .replace(/<script>\s*if \('serviceWorker'[\s\S]*?<\/script>/, '');
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  if (mode === 'worker') {
    return {
      publicDir: false,
      build: {
        outDir: 'dist', emptyOutDir: false, target: 'es2022', minify: false, reportCompressedSize: false,
        lib: { entry: resolve(root, 'worker/precios.ts'), formats: ['es'] as ['es'], fileName: () => 'worker.js' },
      },
    };
  }
  const claude = mode === 'claude';
  return {
    root,
    publicDir: false,
    plugins: [claude ? nido('claude') : nido('web'), devPage()],
    server: { port: 3000, open: false },
    build: {
      outDir: claude ? 'dist' : 'docs',
      emptyOutDir: true,
      target: 'es2022',
      minify: false, // el repositorio publica docs/: se mantiene legible y depurable
      reportCompressedSize: false,
      lib: { entry: resolve(root, 'src/main.ts'), formats: ['iife'], name: 'Nido', fileName: () => 'app.js' },
    },
  };
});
