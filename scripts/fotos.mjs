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
//
// Dos reglas que se aprendieron por las malas, el 22/9/2026:
//
// 1. TODAS las búsquedas van ancladas a Asturias y al concejo. Una consulta
//    genérica como "school bus rural road" devuelve cualquier calle del mundo:
//    así apareció en portada una calle de Bayambang, en Pangasinan (Filipinas),
//    ilustrando un campamento urbano de Villaviciosa.
// 2. Los límites de palabra (\b) son obligatorios. Sin ellos, /obra/ casaba
//    dentro de «obrador» y un reportaje sobre un obrador de chocolate en
//    Cabranes se ilustraba con una carretera de montaña.
const TEMAS = [
  [/\b(sidra|llagar|escanci\w*|espicha|pumarada|mayada)\b/i, 'sidra llagar asturias'],
  [/\b(manzana|pumar|mayar)\w*\b/i, 'pumarada manzana asturias'],
  [/\b(queso|quesería|cueva)\w*\b/i, 'queso cabrales asturias'],
  [/\b(ganado|feria|vaca|res|puertu|pastos?)\b/i, 'ganado vacuno asturias'],
  [/\b(carretera|firme|tráfico|desvío)\b/i, 'carretera asturias'],
  [/\b(agua|abastecimiento|saneamiento)\b/i, 'fuente agua asturias'],
  [/\b(pleno|ayuntamiento|presupuesto|consistorio)\b/i, 'casa consistorial asturias'],
  [/\b(colegio|escolar|instituto)\b/i, 'escuela rural asturias'],
  [/\b(fútbol|liga|equipo|partido|cantera)\b/i, 'campo de futbol asturias'],
  [/\b(museo|exposición|patrimonio|románic\w+|iglesia)\b/i, 'iglesia asturias'],
  [/\b(concierto|música|banda|verbena|romería)\b/i, 'gaita banda asturias'],
  [/\b(río|caudal|pesca|salmón|sella|trucha)\b/i, 'rio sella asturias'],
  [/\b(playa|ría|marisma|rodiles|barco)\b/i, 'ria villaviciosa asturias'],
  [/\b(picos de europa|urriellu|cumbre|sotres|bulnes)\b/i, 'picos de europa asturias'],
  [/\b(parque|infantil|juegos)\b/i, 'parque asturias'],
  [/\b(bosque|monte|castañ\w+|avellan\w+)\b/i, 'bosque asturias'],
];

/**
 * Las consultas de una pieza, de la más concreta a la más general. Todas
 * llevan el concejo o Asturias dentro: no hay consulta sin anclaje.
 */
const consultas = (pieza) => {
  const c = concejos.find((x) => x.slug === pieza.concejoSlug);
  const lugar = c?.nombre ?? 'Asturias';
  const heno = `${pieza.titular} ${pieza.entradilla} ${(pieza.etiquetas ?? []).join(' ')}`;
  const lista = [];
  for (const [re, q] of TEMAS) if (re.test(heno)) lista.push(`${q} ${lugar}`.trim());
  // NO hay consulta comodín del tipo «<Concejo> Asturias». La había, y por ella
  // un reportaje sobre un obrador de chocolate en Cabranes salió ilustrado con
  // un bandu del ayuntamiento sobre el COVID, y otro con unos escudos del museo
  // arqueolóxicu. Eran de Cabranes, sí, pero no tenían nada que ver.
  //
  // La regla: la foto tiene que ser del ASUNTO, no solo del sitio. Si el tema no
  // casa con ninguna categoría, la pieza se queda con su ilustración propia.
  return [...new Set(lista)];
};

// Palabras que acreditan que una imagen es de aquí. Se comprueban contra el
// título, el pie, las etiquetas y la URL de origen del candidato.
//
// Ojo con el escapado: los nombres de sitio se escapan porque pueden traer
// paréntesis o puntos, pero los patrones escritos a mano NO, o dejarían de ser
// patrones. Mezclarlos costó que «Ganado asturiano» se diera por extranjero.
const escapar = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const PATRONES_AQUI = ['asturia[sn]', 'asturian[oa]s?', 'asturies', 'picos de europa'];

const LUGARES_AQUI = [
  ...concejos.map((c) => c.nombre),
  ...concejos.map((c) => c.capital),
  ...concejos.flatMap((c) => c.claves ?? []),
].filter((x) => x && String(x).length >= 4);

const DE_AQUI = new RegExp(
  '(' + [...PATRONES_AQUI, ...LUGARES_AQUI.map(escapar)].join('|') + ')',
  'i'
);

/**
 * Piezas que NO llevan foto de archivo.
 *
 * Una muerte, un rescate o un accidente no se ilustran con una foto bonita del
 * concejo: el lector la lee como si fuera del suceso, y además queda indecente.
 * El 23/9/2026 la portada llevaba una iglesia de Inguanzo sobre «Muere una
 * senderista noruega de 71 años». Estas piezas se quedan sin fotografía.
 */
const SIN_FOTO = /\b(muere|muerte|fallec\w+|falleci\w+|herid[oa]s?|grave|rescat\w+|accidente|siniestro|atropell\w+|incendio|desaparecid[oa]s?|precipit\w+|ahogad[oa]s?|suceso|víctima|funeral|esquela|luto)\b/i;

const esDelicada = (pieza) =>
  SIN_FOTO.test(`${pieza.titular ?? ''} ${pieza.entradilla ?? ''}`);

/**
 * ¿La imagen es de aquí?
 *
 * Un periódico local no ilustra una noticia de Infiestu con una foto de otro
 * sitio: el lector entiende que la foto ES el lugar, y se le estaría mintiendo.
 * Así que solo pasa lo que se pueda acreditar como asturiano. Si nada pasa, la
 * pieza se queda con la ilustración propia, que es honesta porque se ve que es
 * un dibujo y va firmada como tal.
 */
function esDeAqui(c) {
  const rastro = [c.pie, c.origen, c.fuente, (c.etiquetas ?? []).join(' ')].filter(Boolean).join(' ');
  return DE_AQUI.test(rastro);
}

/**
 * El nombre del autor, y solo el nombre.
 *
 * Commons mete a veces el aviso legal entero en el campo «Artist»: una entrada
 * traía los cuatro párrafos de la Ley 1/1996 de Propiedad Intelectual como si
 * fueran el nombre del fotógrafo, y así salía al pie de la foto. Se limpia el
 * HTML, se corta en la primera línea y se limita a algo que quepa en un crédito.
 */
function nombreDeAutor(bruto) {
  const limpio = String(bruto ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!limpio) return 'Autoría desconocida';
  const primera = limpio.split(/[.\n]/)[0].trim();
  if (!primera || primera.length > 80) return 'Autoría desconocida';
  return primera;
}

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
      autor: nombreDeAutor(r.creator),
      pie: r.title || '',
      licencia: (r.license || '').toUpperCase(),
      origen: r.foreign_landing_url || r.url,
      fuente: r.source || 'Openverse',
      etiquetas: (r.tags ?? []).map((t) => t.name ?? t).filter(Boolean),
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
      autor: nombreDeAutor(i.extmetadata?.Artist?.value),
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

  // La limpieza va SIEMPRE por delante, no solo con --limpiar: así una foto
  // que se coló ayer desaparece hoy sola, sin que nadie tenga que mirarlo.
  // No se borra a ciegas: se retira el crédito y su fichero, y la pieza vuelve
  // a su ilustración propia en la siguiente construcción.
  let fuera = 0;
  const vistas = new Set();
  const porId = Object.fromEntries(piezas.map((p) => [p.id, p]));
  for (const [id, c] of Object.entries({ ...creditos })) {
    // Las consultas comodín de la versión anterior («Villaviciosa Asturias»,
    // «Nava asturias landscape») traían fotos del sitio pero ajenas al asunto.
    // Se retiran para que la pieza se ilustre o busque otra vez con las reglas
    // nuevas, que solo aceptan fotos del tema.
    const comodin = /^\S+\s+asturias(\s+landscape)?$/i.test(String(c.consulta ?? '').trim());

    let motivo = '';
    if (!porId[id]) motivo = 'la pieza ya no existe';
    else if (!esDeAqui(c)) motivo = 'no acredita ser de aquí';
    else if (c.origen && vistas.has(c.origen)) motivo = 'repetida en otra pieza';
    else if (esDelicada(porId[id])) motivo = 'pieza delicada (suceso)';
    else if (comodin) motivo = 'consulta comodín: del sitio pero no del asunto';
    if (!motivo) {
      // El autor se sanea también en lo ya guardado: hubo un crédito con la ley
      // de propiedad intelectual entera dentro.
      c.autor = nombreDeAutor(c.autor);
      creditos[id] = c;
      if (c.origen) vistas.add(c.origen);
      continue;
    }
    console.log(`✗ fuera (${motivo}): ${id}\n    «${c.pie || 'sin pie'}» · ${c.origen}`);
    try {
      await fs.unlink(path.join(FOTOS, c.archivo));
    } catch {}
    delete creditos[id];
    fuera++;
  }
  if (fuera) {
    await fs.writeFile(path.join(FOTOS, 'creditos.json'), JSON.stringify(creditos, null, 2) + '\n');
    console.log(`🧹 ${fuera} fotos retiradas por no acreditar que sean de aquí.\n`);
  }
  if (process.argv.includes('--limpiar')) return;

  const pendientes = piezas.filter((p) => TODAS || (!p.imagen && !creditos[p.id]));
  console.log(`🖼  ${pendientes.length} piezas sin foto propia\n`);

  let puestas = 0;
  let sinFoto = 0;
  // Ninguna foto se usa en dos piezas: el buscador devuelve el mismo primer
  // resultado para «Villaviciosa Asturias» una y otra vez, y el 23/9/2026 el
  // mismo trepador azul ilustró siete noticias distintas.
  const yaUsadas = new Set(Object.values(creditos).map((c) => c.origen).filter(Boolean));

  for (const p of pendientes) {
    process.stdout.write(`· ${p.titular}\n`);

    if (esDelicada(p)) {
      console.log('    pieza delicada (suceso): sin foto de archivo, a propósito');
      sinFoto++;
      continue;
    }

    // Se prueban las consultas de la más concreta a la más general, y de cada
    // una solo sobreviven los candidatos que acrediten ser de Asturias.
    let candidatos = [];
    let usada = '';
    for (const q of consultas(p)) {
      for (const buscador of [buscarCommons, buscarOpenverse]) {
        let brutos = [];
        try {
          brutos = await buscador(q);
        } catch (err) {
          console.log(`    (${err.message})`);
          continue;
        }
        const buenos = brutos.filter(esDeAqui).filter((c) => !yaUsadas.has(c.origen));
        if (brutos.length && !buenos.length) {
          console.log(`    "${q}" → ${brutos.length} resultados, ninguno acredita ser de aquí`);
        }
        if (buenos.length) {
          candidatos = buenos;
          usada = q;
          break;
        }
      }
      if (candidatos.length) break;
    }

    if (!candidatos.length) {
      console.log('    sin foto de aquí: se queda con la ilustración propia');
      sinFoto++;
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
          consulta: usada,
        };
        yaUsadas.add(c.origen);
        console.log(`    ✓ ${archivo} · ${c.licencia} · ${c.autor} · «${c.pie}»`);
        puestas++;
        ok = true;
        break;
      } catch (err) {
        // probamos con el siguiente candidato
      }
    }
    if (!ok) {
      console.log('    no se pudo descargar ninguna: se queda con la ilustración');
      sinFoto++;
    }
  }

  await fs.writeFile(path.join(FOTOS, 'creditos.json'), JSON.stringify(creditos, null, 2) + '\n');
  console.log(`\n🖼  ${puestas} fotos nuevas · ${sinFoto} piezas con ilustración propia.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
