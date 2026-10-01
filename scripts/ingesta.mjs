#!/usr/bin/env node
// Ingesta de La Prida: lee las fuentes, filtra por concejo, reescribe y guarda en content/data/.
//
//   node scripts/ingesta.mjs            → ingesta completa
//   node scripts/ingesta.mjs --sin-ia   → solo agrega, no reescribe
//
// Variables de entorno:
//   ANTHROPIC_API_KEY  reescritura con Claude (opcional; sin ella hay resumen extractivo)

import fs from 'node:fs/promises';
import path from 'node:path';
import { concejos, fuentesRegionales, otrosLugares, ingesta } from '../src/config.mjs';
import { leerFeed, mencionaConcejo, esResumenRegional } from '../src/lib/rss.mjs';
import { reescribir, despertador, traducir } from '../src/lib/redactor.mjs';
import { tipoDeEvento, esFuturo, esEmpleo } from '../src/lib/eventos.mjs';
import { revisarPieza } from '../src/lib/antiplagio.mjs';

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
    'Falta ANTHROPIC_API_KEY: las noticias saldrán con resumen extractivo y ' +
    'SIN TRADUCIR. Las portadas en inglés, francés y alemán enseñarán titulares ' +
    'en español. Se arregla en Settings → Secrets and variables → Actions.';
  console.warn(`\n⚠︎  ${m}\n`);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Sin traducción::${m}`);
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
const claveFuente = (url) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    return (u.host.replace(/^www\./, '') + u.pathname.replace(/\/+$/, '')).toLowerCase();
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
      const d = (await (await fetch(url)).json())?.daily;
      if (!d) continue;
      salida[c.slug] = {
        max: Math.round(d.temperature_2m_max[0]),
        min: Math.round(d.temperature_2m_min[0]),
        estado: CIELO[d.weather_code[0]] ?? '',
        lluvia: d.precipitation_probability_max[0],
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
    for (const url of c.feeds) {
      const items = await leerFeed(url, `${c.nombre} · feed propio`);
      anotarSalud(salud.get(c.slug), items);
      sinFecha += items.filter((i) => i.sinFecha).length;
      const suyas = items.filter(
        (i) => mencionaConcejo(i, c, { usarEnlace: false }) && !esResumenRegional(i, otrosLugares)
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
        if (clave && (fuentesDeEstaPasada.has(clave) || fuentesConocidas.has(clave))) {
          repetidas++;
          console.log(`  ⊘ ya publicada, misma fuente: ${i.titulo.slice(0, 66)}`);
          return false;
        }
        const id = idDe(i);
        if (vistas.has(id) || conocidas.has(id)) return false;
        vistas.add(id);
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
      fuente: { nombre: item.origen, url: item.enlace, titularOriginal: item.titulo },
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

  // 3bis. Chequeo antes de publicar: ¿hay dos piezas contando lo mismo?
  //
  // La deduplicación por URL solo caza el mismo artículo repetido. No caza el
  // mismo SUCESO contado por dos medios distintos, que tiene URL distinta: el
  // montañero del Torrecerredo lo dieron RTPA y El Fielato el mismo día.
  //
  // Esto AVISA, no borra, y es a propósito. Midiendo palabras compartidas sobre
  // las 106 piezas del 29/09/2026 salían también falsos positivos legítimos: las
  // dos carreras del Sella son dos días distintos, y las dos del biogás son el
  // anuncio y la crónica. Borrarlas automáticamente habría tirado noticias buenas.
  const PALABRAS_VACIAS = new Set([
    'para','como','tras','sobre','entre','desde','hasta','este','esta','anos','esto',
    'que','del','los','las','una','unos','unas','con','por','sus','han','mas','muy',
  ]);
  const significativas = (txt) =>
    new Set(
      String(txt)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !PALABRAS_VACIAS.has(w))
    );
  const parecido = (a, b) => {
    const A = significativas(a), B = significativas(b);
    if (!A.size || !B.size) return 0;
    let comunes = 0;
    for (const w of A) if (B.has(w)) comunes++;
    return comunes / new Set([...A, ...B]).size;
  };
  const sospechosas = [];
  const paraRevisar = [...nuevas, ...previas];
  for (let i = 0; i < paraRevisar.length; i++) {
    for (let j = i + 1; j < paraRevisar.length; j++) {
      const r = parecido(paraRevisar[i].titular, paraRevisar[j].titular);
      if (r >= 0.4) sospechosas.push({ r, a: paraRevisar[i], b: paraRevisar[j] });
    }
  }
  if (sospechosas.length) {
    console.log(`\n⚠︎  ${sospechosas.length} pareja(s) que pueden contar lo mismo:`);
    for (const { r, a, b } of sospechosas.sort((x, y) => y.r - x.r).slice(0, 12)) {
      console.log(`   ${Math.round(r * 100)}%  «${a.titular.slice(0, 58)}»`);
      console.log(`         «${b.titular.slice(0, 58)}»  [${a.fuente?.nombre} / ${b.fuente?.nombre}]`);
    }
    console.log('   No se borra ninguna: revísalas tú antes de darlas por buenas.');
    if (process.env.GITHUB_ACTIONS) {
      console.log(`::warning title=Posibles noticias repetidas::${sospechosas.length} parejas con más del 40 % de palabras en común`);
    }
  }

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
