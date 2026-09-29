#!/usr/bin/env node
// Trae las tipografías a casa.
//
//   node scripts/fuentes.mjs
//
// POR QUÉ. Las tres tipografías del diario se piden hoy a los servidores de
// Google en cada visita, así que Google recibe la IP de cada lector. No se
// instala ninguna cookie, pero la IP es un dato personal y un juzgado de Múnich
// consideró en 2022 que hacerlo sin consentimiento vulneraba el RGPD.
//
// Las tres están bajo SIL Open Font License 1.1, que permite redistribuirlas.
// Servirlas desde el propio sitio es legal, gratis, más rápido, y elimina la
// petición a un tercero de raíz. Deja de haber nada que declarar porque deja de
// haber nada que ocurra.
//
// ESTO NO CORRE EN EL CONTENEDOR DE CLAUDE: la salida a fonts.googleapis.com
// está bloqueada allí. Corre en GitHub Actions, que sí tiene red, y el
// resultado se guarda en el repositorio para que no vuelva a hacer falta.
//
// Qué deja escrito:
//   src/fuentes/*.woff2      los ficheros de letra
//   src/fuentes/fuentes.css  las reglas @font-face apuntando a /fuentes/
//   src/fuentes/LICENCIA.txt la licencia y de dónde salió cada cosa

import fs from 'node:fs/promises';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DESTINO = path.join(RAIZ, 'src', 'fuentes');

// La misma petición que hace hoy el navegador del lector. Ni una familia más:
// bajar pesos que no se usan engorda el sitio sin que nadie lo note.
const CSS_URL =
  'https://fonts.googleapis.com/css2' +
  '?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800' +
  '&family=Inter:wght@400;500;600;700' +
  '&family=Martian+Mono:wght@400;600' +
  '&display=swap';

// Google devuelve formatos distintos según quién pregunte. Con un navegador
// moderno devuelve woff2, que es el que queremos: pesa la mitad que woff.
const NAVEGADOR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// Solo alfabeto latino. El diario se escribe en español, inglés, francés y
// alemán: el cirílico, el griego y el vietnamita son kilobytes que nadie lee.
const SUBCONJUNTOS = ['latin', 'latin-ext'];

function grita(mensaje, nivel = 'warning') {
  console.warn(`\n⚠︎  ${mensaje}\n`);
  if (process.env.GITHUB_ACTIONS) console.log(`::${nivel} title=Tipografías::${mensaje}`);
}

/**
 * Parte el CSS de Google en bloques @font-face, cada uno con el comentario de
 * subconjunto que Google pone justo encima (`/* latin *\/`). Ese comentario es
 * la única forma de saber a qué alfabeto pertenece cada fichero.
 */
function bloques(css) {
  const fuera = [];
  const re = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/gi;
  let m;
  while ((m = re.exec(css))) fuera.push({ subconjunto: m[1], texto: m[2] });
  return fuera;
}

/** El nombre con el que se guarda un woff2: familia-peso-subconjunto.woff2 */
function nombreDe(bloque, url) {
  const familia = (bloque.texto.match(/font-family:\s*'([^']+)'/) || [, 'fuente'])[1]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  const peso = (bloque.texto.match(/font-weight:\s*([^;]+);/) || [, ''])[1].trim().replace(/\s+/g, '-');
  const hash = url.split('/').pop().replace(/\.woff2$/, '').slice(-8);
  return `${familia}-${peso || 'normal'}-${bloque.subconjunto}-${hash}.woff2`.replace(/--+/g, '-');
}

async function main() {
  console.log('\n· Pidiendo a Google el CSS de las tres familias…');
  const res = await fetch(CSS_URL, { headers: { 'User-Agent': NAVEGADOR } });
  if (!res.ok) {
    grita(`Google respondió HTTP ${res.status}. No se ha tocado nada.`, 'error');
    process.exit(1);
  }
  const css = await res.text();

  const todos = bloques(css);
  const usados = todos.filter((b) => SUBCONJUNTOS.includes(b.subconjunto));
  console.log(`· ${todos.length} bloques @font-face; me quedo con ${usados.length} (${SUBCONJUNTOS.join(', ')})`);

  if (!usados.length) {
    grita('El CSS de Google no traía ningún bloque latino. Formato inesperado: no se ha tocado nada.', 'error');
    process.exit(1);
  }

  await fs.mkdir(DESTINO, { recursive: true });

  const salida = [];
  let bytes = 0;
  for (const b of usados) {
    const url = (b.texto.match(/url\((https:\/\/[^)]+\.woff2)\)/) || [])[1];
    if (!url) {
      grita(`Un bloque de ${b.subconjunto} no traía woff2. Se salta.`);
      continue;
    }
    const nombre = nombreDe(b, url);
    const r = await fetch(url);
    if (!r.ok) {
      grita(`No se pudo bajar ${nombre} (HTTP ${r.status}).`, 'error');
      process.exit(1);
    }
    const datos = Buffer.from(await r.arrayBuffer());
    await fs.writeFile(path.join(DESTINO, nombre), datos);
    bytes += datos.length;
    // La regla se reescribe apuntando a nuestro servidor.
    salida.push(b.texto.replace(/url\(https:\/\/[^)]+\.woff2\)/, `url(/fuentes/${nombre})`));
    console.log(`  ✓ ${nombre}  ${(datos.length / 1024).toFixed(0)} kB`);
  }

  const cabecera = `/* Tipografías servidas desde este mismo sitio.
 *
 * Bricolage Grotesque, Inter y Martian Mono, todas bajo SIL Open Font License 1.1.
 * Se guardan aquí para que el navegador del lector NO tenga que pedírselas a
 * Google, que recibiría su dirección IP en cada visita.
 *
 * Generado por scripts/fuentes.mjs. No editar a mano: se regenera.
 * Última vez: ${new Date().toISOString().slice(0, 10)}
 */
`;
  await fs.writeFile(path.join(DESTINO, 'fuentes.css'), cabecera + salida.join('\n') + '\n');

  await fs.writeFile(
    path.join(DESTINO, 'LICENCIA.txt'),
    `Tipografías de La Prida
=======================

Bricolage Grotesque — SIL Open Font License 1.1
Inter                — SIL Open Font License 1.1
Martian Mono         — SIL Open Font License 1.1

Texto de la licencia: https://openfontlicense.org

La SIL OFL permite usar, estudiar, modificar y REDISTRIBUIR las tipografías,
incluso con fines comerciales, siempre que no se vendan por separado y que los
ficheros derivados no usen los nombres reservados. Servirlas desde este sitio
está expresamente permitido.

Los ficheros .woff2 de esta carpeta se descargaron del servicio de Google Fonts
mediante scripts/fuentes.mjs. Google distribuye estas familias bajo la misma
licencia; la copia no cambia sus condiciones.
`
  );

  console.log(`\n☕ ${salida.length} ficheros, ${(bytes / 1024).toFixed(0)} kB en total, en src/fuentes/`);
  console.log('   A partir de la próxima edición el lector ya no le pide nada a Google.\n');
}

main().catch((e) => {
  grita(`${e.message}. No se ha tocado nada.`, 'error');
  process.exit(1);
});
