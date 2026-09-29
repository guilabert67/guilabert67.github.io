#!/usr/bin/env node
// Traduce el archivo ya publicado.
//
//   node scripts/traducir-archivo.mjs              → todas las que falten
//   node scripts/traducir-archivo.mjs --limite 5   → solo cinco (para probar)
//   node scripts/traducir-archivo.mjs --forzar     → rehace también las ya hechas
//
// POR QUÉ HACE FALTA ESTO. La traducción ocurre cuando la pieza ENTRA, en
// ingesta.mjs. Es lo correcto: traducir una vez y guardar el resultado sale
// barato y no se repite en cada edición. Pero tiene una consecuencia: las
// piezas que entraron mientras la traducción estaba caída se quedaron en
// español para siempre, y volver a poner la clave no las arregla — nadie las
// va a mirar otra vez.
//
// Este script es esa mirada. Se pasa una vez por el archivo, traduce lo que
// falta y se guarda. Después ya no hace falta.
//
// GUARDA SOBRE LA MARCHA, a propósito. Son cien llamadas a un servicio de
// terceros: si la número sesenta falla, lo hecho hasta ahí tiene que estar en
// el disco. Volver a lanzarlo continúa donde se quedó en vez de empezar de cero
// y pagar dos veces lo mismo.

import fs from 'node:fs/promises';
import path from 'node:path';
import { ingesta } from '../src/config.mjs';
import { traducir } from '../src/lib/redactor.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const FICHERO = path.join(RAIZ, 'content', 'data', 'noticias.json');
const IDIOMAS = ['en', 'fr', 'de'];

const args = process.argv.slice(2);
const FORZAR = args.includes('--forzar');
const LIMITE = (() => {
  const i = args.indexOf('--limite');
  const n = i >= 0 ? Number(args[i + 1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : Infinity;
})();

/** ¿Le falta a esta pieza alguno de los tres idiomas con cuerpo de verdad? */
function leFalta(p) {
  if (FORZAR) return true;
  return IDIOMAS.some((c) => {
    const cuerpo = p?.trad?.[c]?.cuerpo;
    return !Array.isArray(cuerpo) || cuerpo.length === 0;
  });
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const m = 'Falta ANTHROPIC_API_KEY. Sin clave no hay nada que traducir.';
    console.error(`\n⚠︎  ${m}\n`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=Sin clave::${m}`);
    process.exit(1);
  }
  if (!ingesta.traducir) {
    console.error('\n⚠︎  ingesta.traducir está en false en src/config.mjs. No hago nada.\n');
    process.exit(1);
  }

  const piezas = JSON.parse(await fs.readFile(FICHERO, 'utf8'));
  const pendientes = piezas.filter(leFalta);

  console.log(`\n· ${piezas.length} piezas en el archivo`);
  console.log(`· ${pendientes.length} sin traducir${FORZAR ? ' (--forzar: se rehacen todas)' : ''}`);

  if (!pendientes.length) {
    console.log('\n☕ No hay nada pendiente. El archivo está entero en los cuatro idiomas.\n');
    return;
  }

  const tanda = pendientes.slice(0, LIMITE);
  if (tanda.length < pendientes.length) {
    console.log(`· Esta vez solo ${tanda.length}, por --limite\n`);
  } else {
    console.log('');
  }

  let hechas = 0;
  const fallidas = [];

  for (const [i, p] of tanda.entries()) {
    const n = `${i + 1}/${tanda.length}`;
    const trad = await traducir(p);
    const logradas = IDIOMAS.filter((c) => (trad?.[c]?.cuerpo ?? []).length > 0);

    if (logradas.length === IDIOMAS.length) {
      p.trad = { ...(p.trad ?? {}), ...trad };
      hechas++;
      console.log(`  ✓ ${n} ${p.titular.slice(0, 64)}`);
    } else {
      // Media traducción es peor que ninguna: deja la pieza a medio vestir y
      // el sitemap de noticias la daría por buena. O entera, o se queda igual.
      fallidas.push(p.titular);
      console.log(`  ✗ ${n} ${p.titular.slice(0, 64)}  (solo ${logradas.join(',') || 'nada'})`);
    }

    // Se guarda cada pocas piezas, no al final. Ver la cabecera.
    if (hechas && hechas % 5 === 0) {
      await fs.writeFile(FICHERO, JSON.stringify(piezas, null, 2) + '\n');
    }
  }

  await fs.writeFile(FICHERO, JSON.stringify(piezas, null, 2) + '\n');

  const quedan = piezas.filter(leFalta).length;
  console.log(`\n☕ ${hechas} piezas traducidas. Quedan ${quedan} sin traducir.`);
  if (fallidas.length) {
    console.log(`   ${fallidas.length} fallaron y se quedaron como estaban:`);
    for (const t of fallidas.slice(0, 5)) console.log(`     · ${t.slice(0, 64)}`);
    console.log('   Volver a lanzar el script las reintenta; lo ya hecho no se repite.');
  }
  console.log('');
}

main().catch((e) => {
  console.error(`\n⚠︎  ${e.message}\n`);
  process.exit(1);
});
