/* Orquestador de desarrollo.
   Arranca a la vez:
     - la app estática (docs/ en http://localhost:3000, con npx serve)
     - el servidor local de Trade Republic (tr-server/ en http://localhost:8788, con Bun)
   Al parar (Ctrl+C) se cierran los dos. Si Bun no está instalado (o falla la
   instalación de dependencias), la app arranca igualmente y se avisa. */
import { spawn, execSync, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function has(cmd) {
  try { execSync('"' + cmd + '" --version', { stdio: 'ignore' }); return true; }
  catch (e) { return false; }
}

/* Devuelve el comando para Bun ("bun", su ruta completa en Windows si no está
   en el PATH, o "" si no está instalado). */
function bunCmd() {
  if (has('bun')) return 'bun';
  if (process.platform === 'win32' && process.env.USERPROFILE) {
    const p = path.join(process.env.USERPROFILE, '.bun', 'bin', 'bun.exe');
    if (fs.existsSync(p)) {
      try { execSync('"' + p + '" --version', { stdio: 'ignore' }); return p; }
      catch (e) { /* está pero no funciona */ }
    }
  }
  return '';
}

const kids = [];
let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\nCerrando los servidores...');
  for (const p of kids) {
    if (p.exitCode !== null) continue;
    try {
      if (process.platform === 'win32') {
        execSync('taskkill /pid ' + p.pid + ' /T /F', { stdio: 'ignore' });
      } else {
        p.kill('SIGTERM');
      }
    } catch (e) { try { p.kill(); } catch (e2) { /* ya estaba muerto */ } }
  }
  setTimeout(() => process.exit(code != null ? code : 0), 150);
}

function run(label, cmd, args, cwd) {
  const base = { cwd, stdio: 'inherit' as const };
  let p;
  if (process.platform === 'win32') {
    // Un solo string con shell:true evita el aviso DEP0190 de Node en Windows.
    const full = cmd + ' ' + args.map(function (a) {
      return /^[A-Za-z0-9_\-.]+$/.test(a) ? a : '"' + String(a).replace(/"/g, '\\"') + '"';
    }).join(' ');
    p = spawn(full, Object.assign({ shell: true }, base));
  } else {
    p = spawn(cmd, args, base);
  }
  p.label = label;
  p.on('exit', function (code) {
    if (shuttingDown) return;
    console.log('[' + label + '] terminó (' + code + '). Parando el resto...');
    shutdown(code != null ? code : 0);
  });
  p.on('error', function (err) {
    if (shuttingDown) return;
    console.error('[' + label + '] no pudo arrancar:', err.message);
    shutdown(1);
  });
  kids.push(p);
  return p;
}

process.on('SIGINT', function () { shutdown(0); });
process.on('SIGTERM', function () { shutdown(0); });

console.log('Arrancando el entorno de desarrollo...');

// 1) App estática (docs/)
run('app', 'npx', ['--yes', 'serve', 'docs'], root);

// 2) Servidor local de Trade Republic (requiere Bun)
const bun = bunCmd();
if (bun) {
  const trDir = path.join(root, 'tr-server');
  const tieneDeps = fs.existsSync(path.join(trDir, 'node_modules', 'trapi'));
  if (!tieneDeps) {
    console.log('Instalando dependencias de Trade Republic (bun install en tr-server/)...');
    console.log('La primera vez puede tardar: Puppeteer descarga Chromium (~200 MB).');
    const cmdstr = ((/\s/.test(bun) ? '"' + bun + '"' : bun) + ' install');
    const r = spawnSync(cmdstr, { cwd: trDir, stdio: 'inherit', shell: true });
    if (r.status === 0) {
      console.log('Dependencias de Trade Republic instaladas.');
    } else {
      console.log('⚠️  No pude instalar las dependencias de Trade Republic.');
      console.log('    Ejecuta a mano:  cd tr-server  y luego  ' + bun + ' install');
      console.log('    La app arranca igualmente; Trade Republic queda apagado esta vez.');
    }
  }
  if (fs.existsSync(path.join(trDir, 'node_modules', 'trapi'))) {
    run('trade-republic', bun, ['server.ts'], trDir);
  } else {
    console.log('⚠️  Trade Republic no se arrancará (faltan sus dependencias).');
  }
} else {
  console.log('⚠️  Bun no está instalado: el servidor local de Trade Republic no se arrancará.');
  console.log('    Instálalo desde https://bun.sh y vuelve a ejecutar npm run serve.');
}

console.log('app ........... http://localhost:3000');
console.log('trade-republic  http://localhost:8788  (solo si Bun está instalado)');
console.log('Pulsa Ctrl+C para parar los dos.');