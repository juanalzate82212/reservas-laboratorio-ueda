/*
 * Genera las imágenes de marca que Next.js sirve por convención de fichero:
 *
 *   src/app/icon.png             → <link rel="icon">        (pestaña del navegador)
 *   src/app/apple-icon.png       → <link rel="apple-touch-icon">
 *   src/app/opengraph-image.png  → <meta property="og:image">
 *
 * Son ficheros versionados, no generados en cada build: cambian casi nunca y
 * así el despliegue no depende de nada. Pero se generan CON ESTE SCRIPT en vez
 * de a mano, para que se puedan rehacer si cambia el logo o el texto.
 *
 * Fuentes: src/components/brand/logo-uclam.png (horizontal, SIN canal alfa —
 * lleva su fondo blanco horneado) y logo-uclam-escudo.png (el escudo, este SÍ
 * con alfa, por eso sirve para el icono de pestaña sin recorte visible).
 *
 * Cómo ejecutarlo (Playwright NO es dependencia del proyecto, se instala solo
 * para esto y se revierte después, igual que para las pruebas de interfaz):
 *
 *   npm install --no-save playwright
 *   npx playwright install chromium
 *   node scripts/generar-imagenes-marca.mjs
 *
 * Las tipografías se piden a Google Fonts, las mismas que usa la app vía
 * next/font (Montserrat display + Inter cuerpo). Si no hay red, el script
 * avisa y para en vez de dibujar con una tipografía cualquiera.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Tokens de marca. Copiados de globals.css a propósito: este script se ejecuta
// fuera de Next, sin Tailwind ni variables CSS que resolver.
const COLOR = {
  azulTexto: "#00647D",
  texto: "#2E2E2E",
  textoSecundario: "#6F7070",
  acento: "#F39200",
  azulSuave: "#E6F2F5",
  blanco: "#FFFFFF",
};

const comoDataUri = (rutaRelativa) =>
  `data:image/png;base64,${readFileSync(resolve(RAIZ, rutaRelativa)).toString("base64")}`;

const LOGO_HORIZONTAL = comoDataUri("src/components/brand/logo-uclam.png");
const ESCUDO = comoDataUri("src/components/brand/logo-uclam-escudo.png");

const TIPOGRAFIAS = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
`;

/*
 * El gesto de marca (§5.1 del documento de identidad): un cuarto de
 * circunferencia. Mismo trazado que ArcoDecorativo.tsx — si cambia allí,
 * cambia aquí.
 */
const arco = (color, opacidad, rotacion) => `
  <svg viewBox="0 0 100 100" fill="none"
       style="width:100%;height:100%;opacity:${opacidad}">
    <circle cx="50" cy="50" r="40" stroke="${color}" stroke-width="12"
            stroke-dasharray="62.8 251.2" transform="rotate(${rotacion} 50 50)" />
  </svg>
`;

/* ---------------------------------------------------------------- */

const paginaOpenGraph = `<!doctype html><html><head><meta charset="utf-8">${TIPOGRAFIAS}
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: ${COLOR.azulSuave};
         font-family: Inter, system-ui, sans-serif; overflow: hidden; }
  .lienzo { position: relative; width: 100%; height: 100%;
            padding: 72px; display: flex; flex-direction: column;
            justify-content: space-between; }
  /*
   * Un solo gesto gráfico por pieza, sangrando fuera del borde superior
   * derecho. Se rota 90° (y no -90° como en la landing) para que el cuarto
   * visible curve HACIA DENTRO del lienzo: con la rotación de la landing, a
   * este tamaño y con esta sangría, el trazo caía entero fuera del recorte.
   */
  .arco { position: absolute; top: -160px; right: -160px;
          width: 460px; height: 460px; }
  /* El logo horizontal no tiene transparencia: la tarjeta blanca hace que su
     fondo se lea como una decisión y no como un recorte (igual que Logo.tsx). */
  .tarjeta-logo { display: inline-flex; align-self: flex-start;
                  background: ${COLOR.blanco}; padding: 14px 20px;
                  border-radius: 8px;
                  box-shadow: 0 1px 3px rgb(0 0 0 / .08), 0 4px 12px rgb(0 0 0 / .06); }
  .tarjeta-logo img { height: 56px; display: block; }
  .texto { position: relative; display: flex; flex-direction: column; gap: 18px; }
  .antetitulo { font-size: 24px; font-weight: 600; letter-spacing: .18em;
                text-transform: uppercase; color: ${COLOR.azulTexto}; }
  h1 { font-family: Montserrat, system-ui, sans-serif; font-size: 62px;
       font-weight: 600; line-height: 1.12; color: ${COLOR.texto};
       max-width: 940px; }
  .pie { font-size: 27px; color: ${COLOR.textoSecundario}; }
</style></head><body>
  <div class="lienzo">
    <div class="arco">${arco(COLOR.acento, 0.5, 90)}</div>
    <div class="tarjeta-logo"><img src="${LOGO_HORIZONTAL}" alt=""></div>
    <div class="texto">
      <p class="antetitulo">Reserva de espacios</p>
      <h1>Laboratorio de Analítica de Datos e Inteligencia Artificial</h1>
      <p class="pie">Consulta la disponibilidad y solicita tu reserva.</p>
    </div>
  </div>
</body></html>`;

/*
 * El escudo es vertical (78×118), así que en un lienzo cuadrado siempre sobra
 * aire a los lados. Se ajusta por ALTO para que ocupe lo máximo posible: a
 * 16 px de pestaña, cada píxel cuenta.
 */
const paginaIcono = ({ lado, altoEscudo, fondo }) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; }
  body { width: ${lado}px; height: ${lado}px; background: ${fondo ?? "transparent"};
         display: flex; align-items: center; justify-content: center; }
  img { height: ${altoEscudo}px; display: block; }
</style></head><body><img src="${ESCUDO}" alt=""></body></html>`;

/* ---------------------------------------------------------------- */

const PIEZAS = [
  {
    salida: "src/app/opengraph-image.png",
    ancho: 1200,
    alto: 630,
    html: paginaOpenGraph,
    fondoTransparente: false,
    esperarTipografias: true,
    nota: "tarjeta para compartir el enlace",
  },
  {
    salida: "src/app/icon.png",
    ancho: 128,
    alto: 128,
    // Sin fondo: el escudo trae canal alfa, así que se recorta limpio sobre
    // el color de pestaña que use cada navegador (claro u oscuro).
    html: paginaIcono({ lado: 128, altoEscudo: 122 }),
    fondoTransparente: true,
    nota: "icono de pestaña",
  },
  {
    salida: "src/app/apple-icon.png",
    ancho: 180,
    alto: 180,
    // iOS compone la transparencia sobre negro y redondea las esquinas por su
    // cuenta, así que aquí el fondo va blanco y explícito.
    html: paginaIcono({ lado: 180, altoEscudo: 140, fondo: COLOR.blanco }),
    fondoTransparente: false,
    nota: "icono de iOS al añadir a la pantalla de inicio",
  },
];

const navegador = await chromium.launch();

for (const pieza of PIEZAS) {
  const contexto = await navegador.newContext({
    viewport: { width: pieza.ancho, height: pieza.alto },
    deviceScaleFactor: 1,
  });
  const pagina = await contexto.newPage();
  await pagina.setContent(pieza.html, { waitUntil: "load" });

  if (pieza.esperarTipografias) {
    await pagina.evaluate(() => document.fonts.ready);
    const cargadas = await pagina.evaluate(() =>
      [...document.fonts].some((f) => f.family === "Montserrat" && f.status === "loaded"),
    );
    if (!cargadas) {
      await navegador.close();
      throw new Error(
        "Montserrat no se cargó desde Google Fonts. Sin red, la tarjeta saldría con otra " +
          "tipografía y no se parecería a la aplicación. Aborta en vez de generar algo falso.",
      );
    }
  }

  const png = await pagina.screenshot({ omitBackground: pieza.fondoTransparente });
  writeFileSync(resolve(RAIZ, pieza.salida), png);
  console.log(
    `  ${pieza.salida.padEnd(30)} ${String(pieza.ancho).padStart(4)}×${String(pieza.alto).padEnd(4)} ` +
      `${(png.length / 1024).toFixed(1).padStart(6)} KB   ${pieza.nota}`,
  );
  await contexto.close();
}

await navegador.close();
console.log("\nListo. Next.js las enlaza sola por convención de nombre de fichero.\n");
