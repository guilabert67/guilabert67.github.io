#!/usr/bin/env node
// Ingesta de La Prida: lee las fuentes, filtra por concejo, reescribe y guarda en content/data/.
//
//   node scripts/ingesta.mjs            → ingesta completa
//   node scripts/ingesta.mjs --sin-ia   → solo agrega, no reescribe
//
// Variables de entorno:
//   ANTHROPIC_API_KEY  reescritura con Claude. Sin ella NO entra ninguna pieza nueva:
//                      publicar el titular y las primeras frases del medio de origen
//                      es copiar su texto. Solo `--sin-ia` lo permite, para pruebas.

import fs from 'node:fs/promises';
import path from 'node:path';
import { concejos, fuentesRegionales, otrosLugares, ingesta } from '../src/config.mjs';
import { leerFeed, mencionaConcejo, esResumenRegional } from '../src/lib/rss.mjs';
import { reescribir, despertador, traducir } from '../src/lib/redactor.mjs';
import { tipoDeEvento, esFuturo, esEmpleo } from '../src/lib/eventos.mjs';
import { revisarPieza } from '../src/lib/antiplagio.mjs';
import { duplicadoDe, esDuplicado, esPublicidad } from '../src/lib/duplicados.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DATOS = path.join(RAIZ, 'content', 'data');
const SIN_IA = process.argv.includes('--sin-ia');

/**
 * Un aviso que se ve.
 *
 * El 19 de septiembre de 2026 la traducción dejó de funcionar y nadie se enteró
 * en diez días. No hubo error: sin clave, `traducir()` devuelve un objeto vacío
 * y sigue. La ejecución salía en verde, el diario se publicaba, y las portadas
 * en inglés, francés y alemán enseñaban titulares en español.
 *
 * Verde no significa que funcione. Si falta la clave, que se vea desde fuera:
 * `::warning::` pinta el aviso en amarillo en la pestaña Actions, en la propia
 * lista de ejecuciones, sin tener que abrir el registro.
 */
function avisarSiFaltaLaClave() {
  if (SIN_IA) return;
  if (process.env.ANTHROPIC_API_KEY) return;
  const m =
    'Falta ANTHROPIC_API_KEY: esta edición NO incorpora noticias nuevas, porque ' +
    'sin reescritura lo único publicable sería el texto del medio de origen. ' +
    'Se arregla en Settings → Secrets and variables → Actions.';
  console.warn(`\n✖  ${m}\n`);
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Sin clave de API::${m}`);
}
avisarSiFaltaLaClave();

// Piezas que entraron sin traducción. Se cuentan para poder decirlo al final.
const sinTraducir = [];

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);

const idDe = (item) => slug(`${item.titulo}`) || slug(item.enlace);

// La identidad para DEDUPLICAR no puede ser el titular.
//
// El mismo artículo de un medio entra por varios feeds a la vez —«El Fielato» y
// «<concejo> · feed propio»— y cada feed lo titula distinto: «Cien años en
// Coru-Villaviciosa» en uno y «Cien años en Coru» en el otro. Dos titulares, dos
// slugs, dos id: el filtro no saltaba nunca y la misma noticia salía dos veces.
// El 29/09/2026 había 20 URLs repetidas entre 106 piezas.
//
// Lo que no cambia entre feeds es la URL de origen, así que se deduplica por
// ella. `idDe` se queda como está a propósito: de ahí sale la dirección pública
// de cada artículo (/concejo/id/) y cambiarla rompería todo lo ya publicado.
// Los parámetros de la URL se tiran (utm_source y compañía cambian sin que
// cambie el artículo), SALVO los que identifican la pieza. Los Ayuntamientos
// (Liferay) sirven todas sus noticias en la MISMA ruta, «/detalle-rss», y solo
// cambia `…_articleId=20013498`: sin esto, la primera noticia de cada
// Ayuntamiento tapaba todas las demás como «ya publicada». Medido el 10/10/2026.
const PARAMETRO_QUE_IDENTIFICA = /(^|_)articleid$/i;
const claveFuente = (url) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    const id = [...u.searchParams]
      .filter(([k]) => PARAMETRO_QUE_IDENTIFICA.test(k))
      .map(([, v]) => `articleId=${v}`)
      .sort()
      .join('&');
    return (u.host.replace(/^www\./, '').replace(/:443$/, '') + u.pathname.replace(/\/+$/, '') + (id ? `?${id}` : '')).toLowerCase();
  } catch {
    return String(url).trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
  }
};

async function leerJSON(archivo, porDefecto) {
  try {
    return JSON.parse(await fs.readFile(path.join(DATOS, archivo), 'utf8'));
  } catch {
    return porDefecto;
  }
}

// Memoria de la ingesta entre pasadas (se guarda en content/data y se commitea):
//  · fallidas:    URL de origen cuya reescritura falló, con cuántas veces. Se
//                 reintentan en la pasada siguiente; a los N fallos se abandonan.
//  · descartadas: URL de origen que no deben volver a entrar (duplicado de un
//                 suceso ya publicado, o publicidad). Sin esto, cada pasada
//                 volvería a pagar la reescritura de algo que luego se tira.
const ESTADO = 'ingesta-estado.json';

// Cielo del día según el código WMO que devuelve Open-Meteo.
const CIELO = {
  0: 'Despejado', 1: 'Poco nuboso', 2: 'Intervalos nubosos', 3: 'Nuboso',
  45: 'Niebla', 48: 'Niebla helada',
  51: 'Orbayu', 53: 'Orbayu', 55: 'Orbayu persistente',
  56: 'Orbayu helado', 57: 'Orbayu helado',
  61: 'Lluvia débil', 63: 'Lluvia', 65: 'Lluvia fuerte',
  66: 'Lluvia helada', 67: 'Lluvia helada',
  71: 'Nieve débil', 73: 'Nieve', 75: 'Nieve fuerte', 77: 'Cellisca',
  80: 'Chubascos', 81: 'Chubascos', 82: 'Chubascos fuertes',
  85: 'Chubascos de nieve', 86: 'Chubascos de nieve',
  95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta con granizo',
};

/**
 * Predicción del día por concejo. Usa Open-Meteo, que no pide clave ni registro.
 * Si algún día quieres AEMET, el endpoint municipal está en el README.
 */
async function tiempoDelDia() {
  const salida = {};
  for (const c of concejos) {
    if (!c.coords) continue;
    const [lat, lon] = c.coords;
    try {
      const url =
        'https://api.open-meteo.com/v1/forecast?' +
        new URLSearchParams({
          latitude: String(lat),
          longitude: String(lon),
          daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
          timezone: 'Europe/Madrid',
          forecast_days: '1',
        });
      const d = (await (await fetch(url, { signal: AbortSignal.timeout(20000) })).json())?.daily;
      if (!d) continue;
      salida[c.slug] = {
        // Seguridad: solo números. Lo que mande un servicio ajeno no entra en la
        // página como texto.
        max: Math.round(Number(d.temperature_2m_max[0])),
        min: Math.round(Number(d.temperature_2m_min[0])),
        estado: CIELO[Number(d.weather_code[0])] ?? '',
        lluvia: Math.round(Number(d.precipitation_probability_max[0])),
      };
    } catch (err) {
      console.warn(`  \u26a0\ufe0e tiempo ${c.nombre}: ${err.message}`);
    }
  }
  return Object.keys(salida).length
    ? { actualizado: new Date().toISOString(), fuente: 'Open-Meteo', concejos: salida }
    : null;
}

/** Guarda cuántas piezas trajo un canal y cuál es la más reciente de verdad. */
function anotarSalud(fila, items) {
  if (!fila) return;
  fila.leidas += items.length;
  for (const i of items) {
    // Las piezas sin fecha en origen se sellan con la de hoy: si contaran aquí,
    // un canal muerto parecería vivo. Justo lo que este informe evita.
    if (i.sinFecha) continue;
    if (!fila.ultima || i.fecha > fila.ultima) fila.ultima = i.fecha;
  }
}

/**
 * Informe de salud de las fuentes.
 *
 * POR QUÉ EXISTE. El 29/09/2026 se perdió media jornada —y dos conversaciones—
 * discutiendo si «la ingesta estaba rota». No lo estaba: traía todo lo que
 * había. Lo que pasaba es que los cinco concejos bebían de un solo medio y ese
 * medio llevaba días sin publicar nada de cuatro de ellos: Piloña desde el 22,
 * Cabranes desde el 19, Nava desde el 15. Nada en el sistema lo decía, así que
 * la única forma de saberlo era ir a mano, canal por canal.
 *
 * Un canal que se seca es indistinguible de uno roto si nadie mira. Esto los
 * distingue solos, en la lista de Actions y sin abrir el registro.
 */
function informeDeFuentes(salud, sinFecha) {
  // Tres semanas, no doce días. Cabranes publica del orden de una pieza al mes:
  // con el umbral corto el aviso saltaría casi siempre y acabaría ignorándose,
  // que es la peor avería que puede tener un aviso. Se ajusta en `ingesta`.
  const DIAS_SECO = ingesta.diasParaFuenteSeca ?? 21;
  const ahora = Date.now();
  const secos = [];

  console.log('\n· Salud de las fuentes');
  for (const f of salud.values()) {
    if (!f.ultima) {
      // Cero piezas fechadas: o el canal está caído —y `leerFeed` ya habrá
      // gritado «Canal caído»— o lleva tanto sin publicar que no queda ni una.
      console.log(`    ${f.nombre.padEnd(14)} ni una pieza fechada`);
      secos.push(`${f.nombre} (ni una pieza)`);
      continue;
    }
    const dias = Math.floor((ahora - Date.parse(f.ultima)) / 86400000);
    console.log(
      `    ${f.nombre.padEnd(14)} ${String(f.deCasa).padStart(3)} de casa de ${String(f.leidas).padStart(3)} leídas` +
        ` · lo más nuevo en origen: hace ${dias} día${dias === 1 ? '' : 's'}${dias >= DIAS_SECO ? '  ← seco' : ''}`
    );
    if (dias >= DIAS_SECO) secos.push(`${f.nombre} (${dias} días)`);
  }

  if (sinFecha) {
    const m = `${sinFecha} pieza(s) llegaron sin fecha en origen y se han sellado con la de hoy. Si se repite, ese canal da mal la fecha.`;
    console.log(`\n  ⚠︎ ${m}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Piezas sin fecha::${m}`);
  }

  if (secos.length) {
    const m =
      `Sin noticias nuevas en origen desde hace ${DIAS_SECO}+ días: ${secos.join(', ')}. ` +
      'Esto NO significa que la ingesta esté rota: trae todo lo que hay. Significa que la fuente no ' +
      'publica, o que el canal ha dejado de responder. Si se mantiene, ese concejo necesita otra fuente.';
    console.log(`\n  ⚠︎ ${m}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Fuente seca::${m}`);
  } else {
    console.log('\n  Todos los concejos con noticias recientes en origen.');
  }
}

async function main() {
  console.log('☕ La Prida — ingesta\n');
  await fs.mkdir(DATOS, { recursive: true });

  // 1. Descarga
  const porConcejo = new Map(concejos.map((c) => [c.slug, []]));

  // El feed propio de un concejo NO es garantía de que la pieza sea de aquí:
  // los medios de comarca cuelan en él noticias regionales (el gochu de Noreña,
  // recetas de una abuela asturiana). La Prida es hiperlocal, así que toda
  // pieza —venga del feed que venga— tiene que nombrar el concejo o alguno de
  // sus pueblos. Si de un titular no se puede decir dónde ha pasado, no entra.
  let descartadas = 0;
  const salud = new Map(concejos.map((c) => [c.slug, { nombre: c.nombre, leidas: 0, deCasa: 0, ultima: null }]));
  let sinFecha = 0;

  for (const c of concejos) {
    console.log(`· ${c.nombre}`);
    for (const canal of c.feeds) {
      // Un canal es una URL o { url, nombre, oficial }. `oficial` = el propio
      // Ayuntamiento: sus avisos son de aquí aunque no nombren el concejo.
      const { url, nombre, oficial = false } = typeof canal === 'string' ? { url: canal } : canal;
      const items = await leerFeed(url, nombre ?? `${c.nombre} · feed propio`);
      if (oficial) for (const i of items) i.oficial = true;
      anotarSalud(salud.get(c.slug), items);
      sinFecha += items.filter((i) => i.sinFecha).length;
      const suyas = items.filter(
        (i) => (oficial || mencionaConcejo(i, c, { usarEnlace: false })) && !esResumenRegional(i, otrosLugares)
      );
      porConcejo.get(c.slug).push(...suyas);
      salud.get(c.slug).deCasa += suyas.length;
      const fuera = items.length - suyas.length;
      descartadas += fuera;
      console.log(
        `    ${suyas.length} de casa de ${items.length} en ${new URL(url).hostname}` +
          (fuera ? ` · ${fuera} descartadas por no nombrar el concejo` : '')
      );
      for (const i of items.filter((x) => !suyas.includes(x))) {
        console.log(`      ✗ ${i.titulo}`);
      }
    }
  }

  console.log('\n· Fuentes regionales (se filtran por topónimos)');
  for (const f of fuentesRegionales) {
    const items = await leerFeed(f.url, f.nombre);
    sinFecha += items.filter((i) => i.sinFecha).length;
    let colocadas = 0;
    for (const item of items) {
      for (const c of concejos) {
        if (mencionaConcejo(item, c) && !esResumenRegional(item, otrosLugares)) {
          porConcejo.get(c.slug).push(item);
          // Una regional que habla del concejo también es señal de que hay vida.
          anotarSalud(salud.get(c.slug), [item]);
          salud.get(c.slug).deCasa++;
          colocadas++;
          break;
        }
      }
    }
    descartadas += items.length - colocadas;
    console.log(`    ${f.nombre}: ${items.length} leídas, ${colocadas} de casa`);
  }
  if (descartadas) {
    console.log(`\n  ${descartadas} piezas descartadas por no ser de los cinco concejos.`);
  }
  informeDeFuentes(salud, sinFecha);

  // 2. Deduplicar contra lo ya publicado
  //
  // Antes de nada, se retiran las piezas guardadas que hoy no pasarían el
  // filtro: las que entraron cuando el feed propio se daba por bueno sin más.
  // Así lo que se coló ayer se va solo, sin que nadie tenga que revisarlo.
  const guardadas = await leerJSON('noticias.json', []);
  const previas = guardadas.filter((p) => {
    const c = concejos.find((x) => x.slug === p.concejoSlug);
    if (!c) return false;
    // Lo que publicó el propio Ayuntamiento es de aquí aunque no nombre el concejo.
    if (p.fuente?.oficial === true) return true;
    const comoItem = {
      titulo: p.titular ?? '',
      resumenOriginal: `${p.entradilla ?? ''} ${p.cuerpo ?? ''}`,
      categorias: p.etiquetas ?? [],
      enlace: p.fuente?.url ?? '',
    };
    // Para detectar un repaso regional solo valen el titular y la entradilla:
    // es lo que ve la ingesta cuando llega la pieza. Un cuerpo largo nombra de
    // paso a los concejos vecinos (Onís, Peñamellera) sin ser un repaso, y
    // mirarlo entero tiraba noticias buenas de casa.
    const comoTitular = { ...comoItem, resumenOriginal: p.entradilla ?? '' };
    const repaso = esResumenRegional(comoTitular, otrosLugares);
    if (mencionaConcejo(comoItem, c, { usarEnlace: false }) && !repaso) return true;
    const motivo = repaso ? `repaso regional (${repaso.join(', ')})` : 'no nombra el concejo';
    console.log(`  ✗ retirada, ${motivo}: [${c.nombre}] ${p.titular}`);
    return false;
  });
  if (previas.length !== guardadas.length) {
    console.log(`  ${guardadas.length - previas.length} piezas antiguas retiradas del archivo.\n`);
  }

  // Memoria entre pasadas, podada a la vigencia del archivo.
  const estado = await leerJSON(ESTADO, {});
  const fallidas = estado.fallidas ?? {};
  const vetadas = estado.descartadas ?? {};
  const corte = Date.now() - ingesta.diasDeVigencia * 86400000;
  for (const m of [fallidas, vetadas]) {
    for (const [k, v] of Object.entries(m)) if (Date.parse(v.ultima ?? v.fecha) < corte) delete m[k];
  }

  // 2bis. Limpieza del archivo, en cada pasada (como la del filtro geográfico):
  //
  //  a) Fuera las piezas que nunca se reescribieron. Son el titular y las
  //     primeras frases del medio de origen copiadas tal cual: el 02/10/2026
  //     eran 84 de 212. Su URL de origen se olvida, así que si la fuente aún
  //     la ofrece, entra otra vez y esta vez reescrita, con la misma dirección.
  //  b) Fuera la segunda, tercera… pieza de un mismo suceso. Se queda la primera.
  const retiradas = { sinReescribir: 0, duplicadas: 0 };
  if (!SIN_IA) {
    for (let i = previas.length - 1; i >= 0; i--) {
      if (previas[i].reescrito === false) {
        console.log(`  ✗ retirada, sin reescribir: [${previas[i].concejo}] ${previas[i].titular}`);
        previas.splice(i, 1);
        retiradas.sinReescribir++;
      }
    }
  }
  {
    const porFecha = [...previas].sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha));
    const quedan = [];
    for (const p of porFecha) {
      const d = duplicadoDe(p, quedan);
      if (d) {
        console.log(`  ✗ retirada, mismo suceso (${Math.round(d.r * 100)} %): «${p.titular}» = «${d.otra.titular}»`);
        const k = claveFuente(p.fuente?.url);
        if (k) vetadas[k] = { motivo: `duplicado de ${d.otra.url}`, fecha: new Date().toISOString(), titulo: p.titular };
        retiradas.duplicadas++;
      } else quedan.push(p);
    }
    previas.splice(0, previas.length, ...quedan);
  }
  if (retiradas.sinReescribir || retiradas.duplicadas) {
    console.log(`\n  Archivo limpio: ${retiradas.sinReescribir} sin reescribir y ${retiradas.duplicadas} duplicadas retiradas.\n`);
  }
  const conocidas = new Set(previas.map((p) => p.id));
  // Las URL de origen ya publicadas. Va aparte de `conocidas` porque el mismo
  // artículo puede estar guardado con otro titular, y por tanto con otro id.
  const fuentesConocidas = new Set(
    previas.map((p) => claveFuente(p.fuente?.url)).filter(Boolean)
  );
  const limite = Date.now() - ingesta.diasDeVigencia * 86400000;

  // Una misma URL no puede colarse dos veces ni aunque caiga en dos concejos
  // distintos, así que este conjunto es de toda la pasada, no de cada concejo.
  const fuentesDeEstaPasada = new Set();
  let repetidas = 0;
  const contador = { publicidad: 0, duplicadas: 0, sinReescribir: 0, abandonadas: [] };

  const candidatas = [];
  for (const c of concejos) {
    const vistas = new Set();
    const lista = porConcejo
      .get(c.slug)
      .filter((i) => i.titulo && i.enlace)
      .filter((i) => new Date(i.fecha).getTime() > limite)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .filter((i) => {
        const clave = claveFuente(i.enlace);
        if (clave && vetadas[clave]) return false;
        if (clave && (fallidas[clave]?.intentos ?? 0) >= ingesta.maxIntentosReescritura) return false;
        if (clave && (fuentesDeEstaPasada.has(clave) || fuentesConocidas.has(clave))) {
          repetidas++;
          console.log(`  ⊘ ya publicada, misma fuente: ${i.titulo.slice(0, 66)}`);
          return false;
        }
        const id = idDe(i);
        if (vistas.has(id) || conocidas.has(id)) return false;
        vistas.add(id);
        if (esPublicidad(i)) {
          console.log(`  ⊘ publicidad: ${i.titulo.slice(0, 66)}`);
          if (clave) vetadas[clave] = { motivo: 'publicidad', fecha: new Date().toISOString(), titulo: i.titulo };
          contador.publicidad++;
          return false;
        }
        // Mismo suceso que una pieza ya publicada, mirado ANTES de pagar la
        // reescritura: con el titular de origen basta casi siempre.
        const d = duplicadoDe(
          { concejoSlug: c.slug, fecha: i.fecha, titular: i.titulo, fuente: { titularOriginal: i.titulo } },
          previas
        );
        if (d) {
          console.log(`  ⊘ mismo suceso que «${d.otra.titular.slice(0, 50)}»: ${i.titulo.slice(0, 50)}`);
          if (clave) vetadas[clave] = { motivo: `duplicado de ${d.otra.url}`, fecha: new Date().toISOString(), titulo: i.titulo };
          contador.duplicadas++;
          return false;
        }
        if (clave) fuentesDeEstaPasada.add(clave);
        return true;
      })
      .slice(0, ingesta.maxPorConcejo);
    candidatas.push(...lista.map((i) => ({ item: i, concejo: c })));
  }
  if (repetidas) {
    console.log(`\n  ${repetidas} piezas descartadas por venir de una URL ya publicada.`);
  }

  console.log(`\n· ${candidatas.length} piezas nuevas para redactar\n`);

  // 3. Reescritura
  const nuevas = [];
  for (const { item, concejo } of candidatas) {
    const red = SIN_IA
      ? { ...(await import('../src/lib/redactor.mjs')).resumenExtractivo(item, concejo) }
      : await reescribir(item, concejo);
    if (!red.titular) continue;
    const clave = claveFuente(item.enlace);

    // Sin reescribir no se publica: sería el texto del medio de origen. Se
    // reintenta en la pasada siguiente, y a los N fallos se abandona en rojo.
    if (!SIN_IA && !red.reescrito) {
      const f = (fallidas[clave] ??= { intentos: 0, titulo: item.titulo });
      f.intentos++;
      f.motivo = red.motivo ?? 'desconocido';
      f.ultima = new Date().toISOString();
      contador.sinReescribir++;
      console.log(`  ✗ [${concejo.nombre}] sin reescribir (${f.motivo}), intento ${f.intentos}: ${item.titulo}`);
      if (f.intentos >= ingesta.maxIntentosReescritura) contador.abandonadas.push(f);
      continue;
    }
    delete fallidas[clave];

    // Y otra vez el mismo suceso, ahora con el titular reescrito y contra las
    // piezas nuevas de esta misma pasada. Antes de traducir, que también cuesta.
    const dup = duplicadoDe(
      { concejoSlug: concejo.slug, fecha: item.fecha, titular: red.titular, fuente: { titularOriginal: item.titulo } },
      [...nuevas, ...previas]
    );
    if (dup) {
      console.log(`  ⊘ [${concejo.nombre}] mismo suceso que «${dup.otra.titular.slice(0, 50)}»: ${red.titular}`);
      if (clave) vetadas[clave] = { motivo: `duplicado de ${dup.otra.url}`, fecha: new Date().toISOString(), titulo: item.titulo };
      contador.duplicadas++;
      continue;
    }
    const id = idDe(item);
    nuevas.push({
      id,
      url: `/${concejo.slug}/${id}/`,
      concejo: concejo.nombre,
      concejoSlug: concejo.slug,
      seccion: red.seccion ?? 'actualidad',
      titular: red.titular,
      entradilla: red.entradilla,
      cuerpo: red.cuerpo,
      apunte: red.apunte ?? '',
      enVeinte: red.enVeinte ?? [],
      cifra: red.cifra ?? null,
      palabra: red.palabra ?? null,
      porQue: red.porQue ?? '',
      etiquetas: red.etiquetas ?? [],
      fechaEvento: red.fechaEvento ?? '',
      // Tipo de actividad cultural. Manda lo que diga el redactor; si no dijo nada
      // (o si vamos sin IA), se deduce del texto con el clasificador de palabras.
      tipoEvento:
        red.tipoEvento ||
        tipoDeEvento(
          `${red.entradilla} ${(red.cuerpo ?? []).join(' ')} ${item.resumenOriginal}`,
          `${red.titular} ${item.titulo}`
        ),
      lugar: red.lugar ?? '',
      hora: red.hora ?? '',
      precio: red.precio ?? '',
      // La foto del feed es del medio de origen: solo se usa si lo has autorizado tú.
      imagen: ingesta.usarImagenDeLaFuente ? item.imagen : '',
      imagenFuente: item.imagen,
      fecha: item.fecha,
      fuente: { nombre: item.origen, url: item.enlace, titularOriginal: item.titulo, ...(item.oficial ? { oficial: true } : {}) },
      reescrito: red.reescrito,
    });
    // Un plan con fecha futura va a la agenda; si ya pasó, sigue siendo cultura
    // pero deja de ser un plan. Esto corrige al redactor cuando se despista.
    const nueva = nuevas[nuevas.length - 1];
    // El empleo manda sobre todo lo demás: es lo que la gente viene a buscar.
    if (esEmpleo(`${nueva.entradilla} ${(nueva.cuerpo ?? []).join(' ')}`, `${nueva.titular} ${item.titulo}`)) {
      nueva.seccion = 'trabajo';
      nueva.tipoEvento = '';
    } else if (nueva.tipoEvento) {
      const futuro = esFuturo(nueva);
      if (futuro) nueva.seccion = 'agenda';
      else if (nueva.seccion === 'agenda') nueva.seccion = 'deporte-y-cultura';
    }

    // Las tres versiones extranjeras, en una sola llamada.
    if (!SIN_IA && ingesta.traducir) {
      nueva.trad = await traducir(nueva);
      const hechas = Object.keys(nueva.trad ?? {});
      if (hechas.length) console.log(`     ↳ ${hechas.join(' · ')}`);
      else sinTraducir.push(nueva.titular);
    }

    // Última red de seguridad: que no se nos haya colado la frase del otro.
    const control = revisarPieza(nuevas[nuevas.length - 1], `${item.titulo} ${item.resumenOriginal}`, { n: 8 });
    if (!control.limpio) {
      nuevas[nuevas.length - 1].revisar = control.avisos;
      console.log(`  ⚠ [${concejo.nombre}] ${red.titular}`);
      console.log(`      demasiado pegado a la fuente: «${control.avisos[0] ?? ''}»`);
    } else {
      console.log(`  ✓ [${concejo.nombre}] ${red.titular}`);
    }
  }

  // 3bis. Parecidos que NO se borran: mismo concejo, más del umbral, pero entre
  // la ventana de duplicado y 72 h. Ahí viven el anuncio y la crónica, que son
  // dos noticias legítimas, y también algún duplicado tardío. No se tocan; los
  // cuenta el vigilante de las 23:50, que es quien le llega a Emilio.
  const posibles = [];
  for (const a of nuevas) {
    for (const b of [...nuevas, ...previas]) {
      if (a === b || a.concejoSlug !== b.concejoSlug) continue;
      const h = Math.abs(Date.parse(a.fecha) - Date.parse(b.fecha)) / 36e5;
      if (h > 72) continue;
      if (esDuplicado({ ...a, fecha: b.fecha }, b)) posibles.push([a, b]);
    }
  }
  if (posibles.length) {
    console.log(`\n·  ${posibles.length} pareja(s) parecidas a más de ${ingesta.ventanaDuplicadoHoras} h: se publican las dos.`);
    for (const [a, b] of posibles.slice(0, 12)) console.log(`   «${a.titular.slice(0, 58)}» / «${b.titular.slice(0, 58)}»`);
  }

  // Recuento de lo que NO entró, a la vista en la pestaña Actions.
  const noEntraron = [
    contador.duplicadas && `${contador.duplicadas} duplicadas`,
    contador.publicidad && `${contador.publicidad} publicidad`,
    contador.sinReescribir && `${contador.sinReescribir} sin reescribir (se reintentan)`,
    retiradas.sinReescribir && `${retiradas.sinReescribir} retiradas del archivo por no estar reescritas`,
    retiradas.duplicadas && `${retiradas.duplicadas} retiradas del archivo por duplicadas`,
  ].filter(Boolean);
  if (noEntraron.length) {
    const m = `No entraron: ${noEntraron.join(' · ')}. Entraron ${nuevas.length}.`;
    console.log(`\n${m}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::notice title=Filtro de calidad::${m}`);
  }
  if (contador.abandonadas.length) {
    const m =
      `${contador.abandonadas.length} pieza(s) fallaron ${ingesta.maxIntentosReescritura} veces al reescribir y se abandonan: ` +
      contador.abandonadas.map((f) => `«${f.titulo.slice(0, 60)}» (${f.motivo})`).join(' · ');
    console.error(`\n✖  ${m}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=Reescritura abandonada::${m}`);
  }
  if (!SIN_IA && contador.sinReescribir && contador.sinReescribir >= candidatas.length && candidatas.length >= 3) {
    const m = `Ninguna de las ${candidatas.length} piezas se pudo reescribir. Mira la clave de API y su crédito.`;
    console.error(`\n✖  ${m}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=Reescritura caída::${m}`);
  }
  await fs.writeFile(path.join(DATOS, ESTADO), JSON.stringify({ fallidas, descartadas: vetadas }, null, 2) + '\n');

  // 4. Guardar
  const todas = [...nuevas, ...previas]
    .filter((p) => new Date(p.fecha).getTime() > limite)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  await fs.writeFile(path.join(DATOS, 'noticias.json'), JSON.stringify(todas, null, 2) + '\n');

  const puntos = SIN_IA ? [] : await despertador(nuevas.length ? nuevas : todas);
  await fs.writeFile(
    path.join(DATOS, 'despertador.json'),
    JSON.stringify({ fecha: new Date().toISOString(), puntos }, null, 2) + '\n'
  );

  const tiempo = await tiempoDelDia();
  if (tiempo) {
    await fs.writeFile(path.join(DATOS, 'tiempo.json'), JSON.stringify(tiempo, null, 2) + '\n');
    console.log('\n· Tiempo actualizado desde Open-Meteo');
  }

  const dudosas = nuevas.filter((p) => p.revisar).length;
  console.log(`\n☕ Listo: ${nuevas.length} nuevas, ${todas.length} vivas en total.`);

  // Que el resultado se cuente, no se suponga: si alguna pieza entró sin sus
  // tres idiomas, se dice aquí y se pinta en amarillo en la pestaña Actions.
  if (sinTraducir.length) {
    const m = `${sinTraducir.length} de ${nuevas.length} piezas nuevas entraron SIN TRADUCIR.`;
    console.warn(`\n⚠︎  ${m}`);
    for (const t of sinTraducir.slice(0, 5)) console.warn(`      · ${t}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Traducción incompleta::${m}`);
  } else if (!SIN_IA && ingesta.traducir && nuevas.length) {
    console.log(`   Las ${nuevas.length} piezas nuevas salen en los cuatro idiomas.`);
  }
  if (dudosas) {
    console.log(
      `\n⚠ ${dudosas} pieza(s) comparten frases con su fuente. Están marcadas con "revisar"\n` +
        `  en content/data/noticias.json: reescríbelas a mano antes de publicar.`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
