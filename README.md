# Cartera

Panel personal de patrimonio: acciones, ETFs, fondos, cripto y liquidez remunerada, con planes mensuales que se apuntan solos.

- Patrimonio total, reparto por tipo de activo y evolución (1M, 3M, 6M, 1A).
- Compras y ventas con fecha, precio, comisión y total; precio medio, ganancia latente y realizada.
- Planes mensuales de Trade Republic (solo lectura): importe e intervalo de cada plan, tal y como los tienes en el broker.
- Liquidez con TAE (con cambios de tipo por fecha), intereses generados día a día y estimación del próximo mes.
- **Brokers en solo lectura** (versión web): consulta tu cuenta, posiciones, planes de ahorro y liquidez de Trading 212 y Trade Republic. Los datos se guardan en el dispositivo.
- **Actualización automática**: refresca los brokers cada 5 s por defecto; menú arriba a la derecha para elegir 5s / 15s / 30s / 60s / apagado.
- **Tema a elección**: botón sol/luna en la cabecera (junto a la frecuencia) → Automático, Claro u Oscuro.
- **Logos por ISIN**: las posiciones muestran su logotipo oficial buscado por ISIN (base de datos Wikidata, con caché local); si no hay resultado, la insignia con letras.
- **Inversiones por tipo**: apartados Todo · Acciones · ETFs · Fondos · Cripto · Otros; Trade Republic se clasifica con su tipo real y Trading 212 se deduce del nombre.
- Copia de seguridad y restauración en Ajustes.
- Funciona en PC, iPhone y iPad, con tema claro y oscuro.

Sin dependencias en tiempo de ejecución: HTML, CSS y JavaScript en un solo fichero.

## Dos versiones, un mismo código

| | Versión Claude | Versión web (PWA) |
|---|---|---|
| Dónde vive | Artefacto en claude.ai | GitHub Pages (carpeta `docs/`) |
| Datos | En tu cuenta de Claude, sincronizados entre dispositivos | En el propio dispositivo (almacenamiento del navegador) |
| Brokers (Trading 212, Trade Republic) | No | Sí, a través de tu servidor en Cloudflare (se configura una vez) |
| Sin conexión | No | Sí, una vez instalada |
| Requisitos | Sesión iniciada en Claude | Cualquier Safari o Chrome reciente |

La versión web no puede hablar directamente con Trading 212 ni Trade Republic: el navegador bloquea esas peticiones entre dominios (CORS). Por eso usa un servidor pequeño en tu cuenta de Cloudflare (`worker/`) que hace de puente. Ver [Conectar brokers](#conectar-brokers).

Para pasar datos de una versión a otra: Ajustes → Copia de seguridad → Copiar, y en la otra versión Ajustes → Restaurar.

## Estructura

```
src/
  page.html            Estructura y estilos (sin doctype; el publicador de Claude lo añade)
  app.js               Toda la lógica: datos, cálculos, planes, gráficos, hojas, brokers
  web/
    manifest.webmanifest
    sw.js              Service worker: abre la app sin conexión
    icons/             Iconos de la app
worker/
  precios.js           Servidor de brokers para Cloudflare Workers (Trading 212)
  wrangler.toml        Configuración para desplegarlo por línea de comandos
tr-server/
  server.mjs           Servidor local de Trade Republic (Bun + trapi)
  package.json         Dependencias del servidor local
config.json            Dirección de tu servidor de brokers (la usa la versión web)
scripts/build.js       Genera dist/ y docs/
test/run.js            Pruebas de humo con jsdom
docs/                  Versión web generada (la que sirve GitHub Pages)
dist/                  Versión Claude generada (ignorada por git)
```

## Desarrollo

Requiere Node 18 o superior.

```bash
npm install        # solo para las pruebas (jsdom)
npm run build      # genera dist/cartera-claude.html y docs/
npm test           # build + pruebas
npm run serve      # arranca docs/ en http://localhost:3000 y, si hay Bun, también el servidor local de Trade Republic en :8788 (Ctrl+C para los dos)
```

Edita siempre `src/` y vuelve a ejecutar `npm run build`. No edites `docs/` a mano: se sobrescribe.

## Publicar la versión web e instalarla en el iPad

1. En GitHub: Settings → Pages → Build and deployment → Source: "Deploy from a branch", rama `main`, carpeta `/docs`. Guarda.
2. En un par de minutos estará en `https://nestoralmale24.github.io/cartera/`. En el plan gratuito de GitHub, Pages requiere que el repositorio sea público. El código no contiene datos personales: tus posiciones se quedan en cada dispositivo.
3. En el iPad, abre esa dirección en Safari → botón Compartir → "Añadir a pantalla de inicio". En iPadOS 26 deja activado "Abrir como app web".
4. Ábrela desde el icono. Funciona a pantalla completa y sin conexión.

Consejos:
- Usa siempre el icono de la pantalla de inicio: lo que guardes ahí no se comparte con Safari.
- Haz una copia de seguridad de vez en cuando desde Ajustes.

## Conectar brokers

La versión web puede leer tu cuenta de Trading 212 y Trade Republic en **solo lectura** (no se puede operar) a través de un servidor tuyo en Cloudflare Workers. Los datos se guardan en el dispositivo y se reutilizan sin conexión.

### 1. Crear el servidor

1. Crea una cuenta gratuita en [dash.cloudflare.com](https://dash.cloudflare.com).
2. En el panel, entra en **Workers & Pages** y crea un Worker nuevo a partir de la plantilla "Hello World". Llámalo `cartera-brokers` y despliégalo.
3. Pulsa **Edit code**, borra el código de ejemplo, pega el contenido de `worker/precios.js` y pulsa **Deploy**.
4. Copia la dirección del Worker, del tipo `https://cartera-brokers.TU-CUENTA.workers.dev`. Si la abres en el navegador debe responder `{"ok":true,"servicio":"cartera-brokers"}`.
5. Ponla en `config.json`, en la raíz del repositorio:

   ```json
   { "brokerProxy": "https://cartera-brokers.TU-CUENTA.workers.dev" }
   ```

   Después ejecuta `npm run build`, haz commit y push. Así la usan todos tus dispositivos sin tocar nada en ellos.
   Si prefieres no tocar el repositorio, pégala en la app: Ajustes → Servidor de brokers → Guardar y probar. Solo vale para ese dispositivo.

### 2. Trading 212 (API oficial)

1. Genera tu **API Key** y **API Secret** en Trading 212 (app/web → Ajustes → API Beta). Solo funciona con cuentas **Invest** e **ISA** (no CFD ni SIPP).
2. En el panel de Cloudflare, abre tu Worker → **Settings → Variables → Secrets**:
   - `T212_KEY` → tu API Key.
   - `T212_SECRET` → tu API Secret.
3. En la app: Ajustes → Trading 212 → **Conectar y ver cuenta**. Verás el resumen (efectivo, invertido, resultado, total, rentabilidad) y tus posiciones abiertas. Se guarda en el dispositivo y se reutiliza sin conexión.

**Seguridad.** La API Key y el Secret se guardan como *secretos* en Cloudflare (cifrados y no visibles). El navegador nunca los recibe: solo pide `/t212/account` y `/t212/positions`, y el Worker es quien añade la autenticación y reenvía a Trading 212.

### 3. Trade Republic (no oficial, servidor local)

Trade Republic no ofrece API pública. La conexión usa el flujo de **código QR** de su propia web (no oficial) y requiere un **servidor local en tu PC** (la app web no puede hacerlo sola: el flujo usa WAF con Puppeteer y WebSocket). Puede romperse si Trade Republic cambia su protocolo, o no ajustarse a sus términos de servicio. Úsalo bajo tu responsabilidad.

1. Instala [Bun](https://bun.sh) (necesario porque la librería `trapi` es TypeScript).
2. Instala las dependencias:
   ```bash
   cd tr-server
   bun install
   ```
   La primera vez, Puppeteer descarga Chromium (~200 MB). Es normal.
3. Arranca el servidor local (junto con la app, si prefieres: `npm run serve` desde la raíz los arranca a los dos y Ctrl+C los para):
   ```bash
   bun server.mjs
   ```
   Verás `Servidor local de Trade Republic escuchando en http://localhost:8788/`.
4. En la app: Ajustes → Trade Republic → escribe `http://localhost:8788` y **Guardar**.
5. Pulsa **Vincular con QR**, escanea el código con la app de Trade Republic y confirma. Luego **Ya lo he escaneado**.

La sesión se guarda en `~/.tr_api_cookies.json` y se reutiliza en siguientes arranques. Solo funciona desde el PC donde corre el servidor local; si lo paras, Trade Republic deja de leerse (Trade 212 sí sigue funcionando en cualquier dispositivo).

**Nota**: la lectura de posiciones pide, además, el precio actual por ISIN (exchange LSX) para calcular la ganancia/pérdida. Si algún ISIN no cotiza ahí, su P/L saldrá "—" y el resto funciona igual.

## Actualizar la versión de Claude

`dist/cartera-claude.html` es el fichero que se publica como artefacto con las capacidades `db` y `user` (datos privados por usuario en `data/users/<id>`). La lectura de brokers es exclusiva de la versión web. Para republicarlo, pídeselo a Claude en Cowork indicando la URL del artefacto, así se mantiene el mismo enlace y tus datos.

## Modelo de datos

Una colección por usuario con un documento por entidad:

- `settings`: tipos de cambio (`fx`, `fxHist`).
- `a_*` (activo): tipo, nombre, ticker, ISIN, moneda, precio, histórico de un año (`hist.t` en días desde 1970, `hist.c` cierres) y operaciones (`txs`).
- `c_*` (cuenta de liquidez): tipos TAE por fecha (`rates`) y movimientos (`moves`).
- `p_*` (plan mensual): destino, importe, comisión, días del mes, inicio, fin opcional y fechas omitidas (`skip`).

Las aportaciones de un plan usan un identificador fijo (`pl_<plan>_<fecha>`), así que aunque se abra a la vez en dos dispositivos no se duplican.

Los intereses se calculan capitalizando a diario con la TAE vigente en cada fecha. Es una estimación: cada banco liquida a su manera.