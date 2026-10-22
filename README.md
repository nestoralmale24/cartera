# Cartera

Panel personal de patrimonio: acciones, ETFs, fondos, cripto y liquidez remunerada, con planes mensuales que se apuntan solos.

- Patrimonio total, reparto por tipo de activo y evolución (1M, 3M, 6M, 1A).
- Compras y ventas con fecha, precio, comisión y total; precio medio, ganancia latente y realizada.
- Planes mensuales: importe y días del mes. Cada aportación se registra sola al abrir la app, incluidas las atrasadas.
- Liquidez con TAE (con cambios de tipo por fecha), intereses generados día a día y estimación del próximo mes.
- Copia de seguridad y restauración en Ajustes.
- Funciona en PC, iPhone y iPad, con tema claro y oscuro.

Sin dependencias en tiempo de ejecución: HTML, CSS y JavaScript en un solo fichero.

## Dos versiones, un mismo código

| | Versión Claude | Versión web (PWA) |
|---|---|---|
| Dónde vive | Artefacto en claude.ai | GitHub Pages (carpeta `docs/`) |
| Datos | En tu cuenta de Claude, sincronizados entre dispositivos | En el propio dispositivo (almacenamiento del navegador) |
| Precios online (Yahoo Finance) | Sí, desde la app de escritorio de Claude | No, precio a mano |
| Sin conexión | No | Sí, una vez instalada |
| Requisitos | Sesión iniciada en Claude | Cualquier Safari o Chrome reciente |

La versión web no puede consultar Yahoo Finance directamente porque el navegador bloquea esas peticiones entre dominios (CORS). Para tener precios automáticos ahí haría falta un pequeño servidor intermedio.

Para pasar datos de una versión a otra: Ajustes → Copia de seguridad → Copiar, y en la otra versión Ajustes → Restaurar.

## Estructura

```
src/
  page.html            Estructura y estilos (sin doctype; el publicador de Claude lo añade)
  app.js               Toda la lógica: datos, cálculos, planes, gráficos, hojas, precios
  web/
    manifest.webmanifest
    sw.js              Service worker: abre la app sin conexión
    icons/             Iconos de la app
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
npm run serve      # sirve docs/ en local para probar la versión web
```

Edita siempre `src/` y vuelve a ejecutar `npm run build`. No edites `docs/` a mano: se sobrescribe.

## Publicar la versión web e instalarla en el iPad

1. En GitHub: Settings → Pages → Build and deployment → Source: "Deploy from a branch", rama `main`, carpeta `/docs`. Guarda.
2. En un par de minutos estará en `https://TU_USUARIO.github.io/cartera/`. En el plan gratuito de GitHub, Pages requiere que el repositorio sea público. El código no contiene datos personales: tus posiciones se quedan en cada dispositivo.
3. En el iPad, abre esa dirección en Safari → botón Compartir → "Añadir a pantalla de inicio". En iPadOS 26 deja activado "Abrir como app web".
4. Ábrela desde el icono. Funciona a pantalla completa y sin conexión.

Consejos:
- Usa siempre el icono de la pantalla de inicio: lo que guardes ahí no se comparte con Safari.
- Haz una copia de seguridad de vez en cuando desde Ajustes.

## Actualizar la versión de Claude

`dist/cartera-claude.html` es el fichero que se publica como artefacto con estas capacidades: `db` y `user` (datos privados por usuario en `data/users/<id>`) y `mcp` con `host:claude_browser` (`preview_start`, `navigate`, `get_page_text`) para leer Yahoo Finance. Para republicarlo, pídeselo a Claude en Cowork indicando la URL del artefacto, así se mantiene el mismo enlace y tus datos.

## Modelo de datos

Una colección por usuario con un documento por entidad:

- `settings`: tipos de cambio (`fx`, `fxHist`) y fecha de la última actualización de precios.
- `a_*` (activo): tipo, nombre, ticker de Yahoo, ISIN, moneda, precio, histórico de un año (`hist.t` en días desde 1970, `hist.c` cierres) y operaciones (`txs`).
- `c_*` (cuenta de liquidez): tipos TAE por fecha (`rates`) y movimientos (`moves`).
- `p_*` (plan mensual): destino, importe, comisión, días del mes, inicio, fin opcional y fechas omitidas (`skip`).

Las aportaciones de un plan usan un identificador fijo (`pl_<plan>_<fecha>`), así que aunque se abra a la vez en dos dispositivos no se duplican.

Los intereses se calculan capitalizando a diario con la TAE vigente en cada fecha. Es una estimación: cada banco liquida a su manera.
