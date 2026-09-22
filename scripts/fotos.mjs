#!/usr/bin/env node
// Busca una fotografía para cada pieza que no traiga la suya, según el TEMA del que habla.
//
//   node scripts/fotos.mjs            → solo las piezas que aún no tienen foto
//   node scripts/fotos.mjs --todas    → revisa también las que ya tienen
//
// Solo descarga imágenes en dominio público o CC0: se pueden usar sin ninguna
// restricción, sin pedir permiso y sin obligación de citar. Aun así se guarda el
// crédito en content/fotos/creditos.json y se muestra al pie de cada foto, que es
// lo correcto aunque la licencia no lo exija.
//
// Fuentes: Openverse (agregador de la Fundación Wikimedia) y Wikimedia Commons.
// Necesita salida a internet: se ejecuta en tu ordenador o en el workflow de GitHub.

import fs from 'node:fs/promises';
import path from 'node:path';
import { concejos } from '../src/config.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DATOS = path.join(RAIZ, 'content', 'data');
const FOTOS = path.join(RAIZ, 'content', 'fotos');
const TODAS = process.argv.includes('--todas');

// Del asunto de la pieza a algo que un banco de imágenes entienda.
// Amplíalo sin miedo: cuanto más concreto, mejor sale la foto.
const TEMAS = [
  [/sidra|llagar|escanci|espicha|pumarada|mayada/i, 'asturian cider pouring llagar'],
  [/manzana|pumar|mayar/i, 'apple orchard harvest'],
  [/queso|quesería|cueva/i, 'blue cheese cave asturias'],
  [/ganado|feria|vaca|res|puerto|pasto/i, 'cattle cows mountain pasture asturias'],
  [/carretera|obra|firme|tráfico|corte|desvío/i, 'mountain road asturias'],
  [/agua|abastecimiento|red|saneamiento/i, 'water tap supply'],
  [/pleno|ayuntamiento|presupuesto|consistorio|acta/i, 'town hall council chamber spain'],
  [/colegio|escolar|curso|instituto|niñ/i, 'school bus rural road'],
  [/fútbol|liga|equipo|partido|deporte|cantera/i, 'amateur football pitch village'],
  [/museo|exposición|cultura|patrimonio|románico|iglesia/i, 'romanesque church asturias'],
  [/concierto|música|banda|fiesta|verbena/i, 'outdoor concert village square'],
  [/río|caudal|pesca|salmón|sella|truch/i, 'river valley northern spain'],
  [/playa|ría|marisma|rodiles|barco|puerto de mar/i, 'estuary sandbar northern spain'],
  [/picos de europa|urriellu|montaña|cumbre|sotres|bulnes/i, 'picos de europa limestone peaks'],
  [/parque|infantil|juego|familia/i, 'village playground park'],
  [/turismo|verano|visitante|alojamiento/i, 'asturias green landscape village'],
  [/bosque|monte|castañ|avellan|árbol/i, 'chestnut forest atlantic'],
];

const consulta = (pieza) => {
  const heno = `${pieza.titular} ${pieza.entradilla} ${(pieza.etiquetas ?? []).join(' ')}`;
  for (const [re, q] of TEMAS) if (re.test(heno)) return q;
  const c = concejos.find((c) => c.slug === pieza.concejoSlug);
  return `${c?.nombre ?? 'asturias'} asturias landscape`;
};

const cabeceras = { 'user-agent': 'LaPrida/1.0 (diario local de Asturias; contacto en la web)' };

async function conTiempo(url, opciones = {}, ms = 25000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opciones, headers: cabeceras, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Openverse, filtrando a cc0 + dominio público. */
async function buscarOpenverse(q) {
  const url =
    'https://api.openverse.org/v1/images/?' +
    new URLSearchParams({
      q,
      license: 'cc0,pdm',
      size: 'large',
      mature: 'false',
      page_size: '8',
    });
  const res = await conTiempo(url);
  if (!res.ok) throw new Error(`Openverse HTTP ${res.status}`);
  const { results = [] } = await res.json();
  return results
    .filter((r) => r.url && (r.width ?? 0) >= 1200)
    .map((r) => ({
      descarga: r.url,
      autor: r.creator || 'Autoría desconocida',
      pie: r.title || '',
      licencia: (r.license || '').toUpperCase(),
      origen: r.foreign_landing_url || r.url,
      fuente: r.source || 'Openverse',
    }));
}

/** Wikimedia Commons, quedándonos solo con dominio público y CC0. */
async function buscarCommons(q) {
  const url =
    'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: `filetype:bitmap ${q}`,
      gsrnamespace: '6',
      gsrlimit: '12',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|size',
      iiurlwidth: '1600',
      origin: '*',
    });
  const res = await conTiempo(url);
  if (!res.ok) throw new Error(`Commons HTTP ${res.status}`);
  const paginas = Object.values((await res.json())?.query?.pages ?? {});
  const libre = /^(cc0|public domain|pd|pdm)/i;
  return paginas
    .map((p) => p.imageinfo?.[0])
    .filter(Boolean)
    .filter((i) => libre.test(i.extmetadata?.LicenseShortName?.value ?? ''))
    .filter((i) => (i.width ?? 0) >= 1200)
    .map((i) => ({
      descarga: i.thumburl || i.url,
      autor: (i.extmetadata?.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim() || 'Autoría desconocida',
      pie: (i.extmetadata?.ObjectName?.value ?? '').replace(/<[^>]+>/g, '').trim(),
      licencia: i.extmetadata?.LicenseShortName?.value ?? 'Dominio público',
      origen: i.descriptionurl || i.url,
      fuente: 'Wikimedia Commons',
    }));
}

async function descargar(candidato, destino) {
  const res = await conTiempo(candidato.descarga);
  if (!res.ok) throw new Error(`descarga HTTP ${res.status}`);
  const tipo = res.headers.get('content-type') ?? '';
  if (!/^image\/(jpeg|png|webp)/.test(tipo)) throw new Error(`tipo inesperado: ${tipo}`);
  const ext = tipo.includes('png') ? '.png' : tipo.includes('webp') ? '.webp' : '.jpg';
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 40000) throw new Error('imagen demasiado pequeña');
  await fs.writeFile(destino + ext, bytes);
  return { archivo: path.basename(destino + ext), bytes: bytes.length };
}

async function main() {
  await fs.mkdir(FOTOS, { recursive: true });

  const piezas = JSON.parse(await fs.readFile(path.join(DATOS, 'noticias.json'), 'utf8'));
  let creditos = {};
  try {
    creditos = JSON.parse(await fs.readFile(path.join(FOTOS, 'creditos.json'), 'utf8'));
  } catch {}

  const pendientes = piezas.filter((p) => TODAS || (!p.imagen && !creditos[p.id]));
  console.log(`🖼  ${pendientes.length} piezas sin foto propia\n`);

  let puestas = 0;
  for (const p of pendientes) {
    const q = consulta(p);
    process.stdout.write(`· ${p.titular}\n    busco: "${q}" … `);

    let candidatos = [];
    for (const buscador of [buscarOpenverse, buscarCommons]) {
      try {
        candidatos = await buscador(q);
        if (candidatos.length) break;
      } catch (err) {
        console.log(`(${err.message})`);
      }
    }
    if (!candidatos.length) {
      console.log('sin resultados libres, se queda con la ilustración');
      continue;
    }

    let ok = false;
    for (const c of candidatos.slice(0, 3)) {
      try {
        const { archivo } = await descargar(c, path.join(FOTOS, p.id));
        creditos[p.id] = {
          archivo,
          autor: c.autor,
          licencia: c.licencia,
          origen: c.origen,
          fuente: c.fuente,
          pie: c.pie ?? '',
          consulta: q,
        };
        console.log(`✓ ${archivo} · ${c.licencia} · ${c.autor}`);
        puestas++;
        ok = true;
        break;
      } catch (err) {
        // probamos con el siguiente candidato
      }
    }
    if (!ok) console.log('no se pudo descargar ninguna, se queda con la ilustración');
  }

  await fs.writeFile(path.join(FOTOS, 'creditos.json'), JSON.stringify(creditos, null, 2) + '\n');
  console.log(`\n🖼  ${puestas} fotos nuevas. Ejecuta "node build.mjs" para verlas.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
