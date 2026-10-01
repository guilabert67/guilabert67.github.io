#!/usr/bin/env node
// Busca una fotografía para cada pieza que no traiga la suya, según el TEMA del que habla.
//
//   node scripts/fotos.mjs            → solo las piezas que aún no tienen foto
//   node scripts/fotos.mjs --todas    → revisa también las que ya tienen
//
// POLÍTICA DE LICENCIAS — no se toca sin pensarlo dos veces.
//
// ENTRA: dominio público, CC0, CC BY y CC BY-SA. Las dos últimas son gratis y
// perfectamente legales; lo único que exigen es CITAR BIEN, y eso se hace: autor,
// nombre de la licencia, ENLACE para poder leerla, origen y aviso de que la foto
// se ha redimensionado. Es lo que hace cualquier medio que usa Wikimedia Commons.
//
// NO ENTRA, y conviene entender por qué:
//   · NC (no comercial) — el diario llevará publicidad, así que es uso comercial.
//   · ND (sin obra derivada) — las fotos se redimensionan a 1600 px, y eso ya es
//     tocar la obra.
//
// La comprobación se aplica también a lo ya guardado: si un día entra algo que no
// cumple, se retira solo en la edición siguiente.
//
// El crédito se guarda igual en content/fotos/creditos.json y se muestra al pie
// de cada foto. La licencia no lo exige; se hace porque es lo correcto.
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
  [/\b(concierto|música|banda|verbena|romería|gaita\w*|gaites|folixa|orquesta)\b/i, 'gaita banda asturias'],
  // Añadidos el 01-10-2026, mirando las 35 piezas que no casaban con nada.
  // Cada uno existe fotografiado EN ASTURIAS: si no, `esDeAqui` lo tiraría
  // igual y la consulta solo gastaría tiempo. No se añaden temas abstractos
  // —homenajes, convenios, subvenciones— porque no tienen sujeto visual y
  // acabarían trayendo una foto del sitio, que es la comodín ya descartada.
  [/\b(fiesta|fiestas|festejo\w*|certamen|pregón|pregoner\w+|carmen|sacramental)\b/i, 'fiesta romeria asturias'],
  [/\b(asturcón|asturcones|yegua\w*|caballo\w*|poni\w*|raza parda|asturiana de los valles)\b/i, 'asturcon caballo asturias'],
  [/\b(piragua\w*|canoa\w*|remo|descenso del sella|kayak)\b/i, 'piraguas sella asturias'],
  [/\b(hórreo\w*|horreo\w*|panera\w*|casería|caserías|aldea\w*|vivienda rural)\b/i, 'horreo panera asturias'],
  [/\b(covadonga|santuario|basílica|ermita|capilla)\b/i, 'santuario covadonga asturias'],
  [/\b(cares|majada\w*|invernal\w*|braña\w*|refugio|montañer\w+|senderis\w+|ruta)\b/i, 'picos de europa asturias'],
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
// El 01-10-2026 se añadieron «arde», «quema» y «llamas»: «Un camión arde por
// completo en la N-634» no llevaba ninguna de las palabras de esta lista, así
// que no era delicada para el filtro y podía acabar ilustrada con una foto de
// archivo del concejo. Lo mismo que pasó con la senderista y la iglesia.
const SIN_FOTO = /\b(muere|muerte|fallec\w+|falleci\w+|herid[oa]s?|grave|rescat\w+|accidente|siniestro|atropell\w+|incendio|arde|ardió|ardiendo|quema\w*|llamas|desaparecid[oa]s?|precipit\w+|ahogad[oa]s?|suceso|víctima|funeral|esquela|luto)\b/i;

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
/**
 * ¿Se puede usar esta foto, y con qué obligaciones?
 *
 * ANTES SOLO ENTRABA LO QUE NO PEDÍA NADA —dominio público y CC0— y el banco se
 * quedó en cuatro fotos. Esa regla era más estricta que la ley: CC BY y CC BY-SA
 * son gratis y perfectamente legales, y lo único que exigen es CITAR BIEN. Es lo
 * que hace cualquier medio que usa Wikimedia Commons.
 *
 * Lo que NO entra, y conviene entender por qué:
 *
 * - **NC (no comercial).** Este diario va a llevar publicidad y anuncios de
 *   pago. Con eso, la web es un uso comercial y una foto NC sería una
 *   infracción. No es una cuestión de prudencia: es que no se puede.
 * - **ND (sin obra derivada).** La ingesta redimensiona las fotos a 1600 px de
 *   ancho, y eso ya es tocar la obra. Con ND no está permitido.
 *
 * Se comprueba también lo ya guardado, así que si un día entra algo que no
 * cumple, en la siguiente edición se va solo.
 */
const LICENCIA_SIN_CONDICIONES = /^\s*(cc0|cc[\s-]?zero|public\s*domain|dominio\s*p[úu]blico|pd(m)?|no\s*known\s*copyright)/i;
const LICENCIA_CON_ATRIBUCION = /^\s*cc[\s-]?by(\s*[-\s]\s*sa)?(\s*\d(\.\d)?)?\s*$/i;
const PROHIBIDO = /\b(nc|non[\s-]?commercial|no[\s-]?comercial|nd|no[\s-]?deriv\w*|sin[\s-]?obra[\s-]?derivada)\b/i;

function licenciaVale(licencia) {
  const l = String(licencia ?? '').trim();
  if (!l) return false;
  if (PROHIBIDO.test(l)) return false;
  return LICENCIA_SIN_CONDICIONES.test(l) || LICENCIA_CON_ATRIBUCION.test(l);
}

/** ¿Esta licencia obliga a citar autor y licencia? */
const pideAtribucion = (licencia) => LICENCIA_CON_ATRIBUCION.test(String(licencia ?? '').trim());

/**
 * La dirección del texto legal de la licencia.
 *
 * Creative Commons pide que la licencia se pueda leer, no solo nombrarla. Si
 * Commons no la da, se deduce del nombre, que tiene una forma fija.
 */
function urlDeLicencia(nombre, dada = '') {
  if (dada && /^https?:\/\//.test(dada)) return dada;
  const m = String(nombre ?? '').trim().match(/^cc[\s-]?by(?:[\s-]*(sa))?(?:[\s-]*(\d(?:\.\d)?))?/i);
  if (!m) return '';
  const tipo = m[1] ? 'by-sa' : 'by';
  const version = m[2] ?? '4.0';
  return `https://creativecommons.org/licenses/${tipo}/${version}/deed.es`;
}

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
/**
 * Openverse devuelve el código pelado —`by-sa`, `by`, `cc0`, `pdm`— mientras que
 * el resto del programa espera el nombre canónico («CC BY-SA 3.0», «CC0»,
 * «Dominio público»), que es lo que manda Wikimedia Commons.
 *
 * SIN ESTO, AMPLIAR LA BÚSQUEDA SERÍA UN FALLO LEGAL, no una mejora: una CC BY-SA
 * entraría como «BY-SA», que no empieza por «cc», así que
 *   · `licenciaVale()` la daría por NO válida y la limpieza la retiraría en la
 *     pasada siguiente —descarga y trabajo tirados—, y
 *   · `urlDeLicencia()` y `pideAtribucion()` fallarían igual, de modo que mientras
 *     tanto la foto se publicaría SIN enlace a su licencia y sin marcar que pide
 *     atribución. Y poder leer la licencia es justo lo que CC BY exige.
 */
function nombreDeLicenciaOpenverse(codigo, version) {
  const c = String(codigo ?? '').toLowerCase().trim();
  const v = String(version ?? '').trim();
  if (c === 'cc0') return 'CC0';
  if (c === 'pdm') return 'Dominio público';
  if (c === 'by' || c === 'by-sa') return `CC ${c.toUpperCase()}${v ? ` ${v}` : ''}`;
  return c.toUpperCase();
}

async function buscarOpenverse(q) {
  const url =
    'https://api.openverse.org/v1/images/?' +
    new URLSearchParams({
      q,
      // Ampliado el 1/10/2026. Pedía solo 'cc0,pdm' aunque el filtro de licencias
      // ya aceptaba CC BY y CC BY-SA desde hacía tiempo: se amplió la política y
      // no se amplió la consulta, así que Openverse —el agregador grande— nunca
      // llegaba a ofrecer una foto con atribución. Medido en la misma búsqueda:
      // «sidra asturias» pasaba de 1 resultado a 20.
      license: 'cc0,pdm,by,by-sa',
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
      licencia: nombreDeLicenciaOpenverse(r.license, r.license_version),
      // Openverse da la dirección de la licencia; si faltara, se deduce del nombre.
      licenciaUrl:
        r.license_url || urlDeLicencia(nombreDeLicenciaOpenverse(r.license, r.license_version)),
      atribucion: pideAtribucion(nombreDeLicenciaOpenverse(r.license, r.license_version)),
      redimensionada: true,
      origen: r.foreign_landing_url || r.url,
      fuente: r.source || 'Openverse',
      etiquetas: (r.tags ?? []).map((t) => t.name ?? t).filter(Boolean),
    }));
}

/** Wikimedia Commons, filtrado por `licenciaVale`: dominio público, CC0, CC BY y CC BY-SA. */
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

  return paginas
    .map((p) => p.imageinfo?.[0])
    .filter(Boolean)
    .filter((i) => licenciaVale(i.extmetadata?.LicenseShortName?.value))
    .filter((i) => (i.width ?? 0) >= 1200)
    .map((i) => ({
      descarga: i.thumburl || i.url,
      autor: nombreDeAutor(i.extmetadata?.Artist?.value),
      pie: (i.extmetadata?.ObjectName?.value ?? '').replace(/<[^>]+>/g, '').trim(),
      licencia: i.extmetadata?.LicenseShortName?.value ?? 'Dominio público',
      // Para cumplir CC BY y CC BY-SA hace falta poder LEER la licencia, no solo
      // nombrarla; y hay que decir si la obra se ha tocado. Aquí se toca siempre:
      // se descarga una versión de 1600 px en vez del original.
      licenciaUrl: urlDeLicencia(i.extmetadata?.LicenseShortName?.value, i.extmetadata?.LicenseUrl?.value),
      atribucion: pideAtribucion(i.extmetadata?.LicenseShortName?.value),
      redimensionada: true,
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
    else if (!licenciaVale(c.licencia)) motivo = `licencia con condiciones (${c.licencia})`;
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
    console.log(`🧹 ${fuera} fotos retiradas del banco.\n`);
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
          licenciaUrl: c.licenciaUrl ?? urlDeLicencia(c.licencia),
          atribucion: c.atribucion ?? pideAtribucion(c.licencia),
          redimensionada: c.redimensionada ?? true,
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
