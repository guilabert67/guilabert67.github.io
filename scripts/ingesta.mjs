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

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);

const idDe = (item) => slug(`${item.titulo}`) || slug(item.enlace);

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
  for (const c of concejos) {
    console.log(`· ${c.nombre}`);
    for (const url of c.feeds) {
      const items = await leerFeed(url, `${c.nombre} · feed propio`);
      const suyas = items.filter(
        (i) => mencionaConcejo(i, c, { usarEnlace: false }) && !esResumenRegional(i, otrosLugares)
      );
      porConcejo.get(c.slug).push(...suyas);
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
    let colocadas = 0;
    for (const item of items) {
      for (const c of concejos) {
        if (mencionaConcejo(item, c) && !esResumenRegional(item, otrosLugares)) {
          porConcejo.get(c.slug).push(item);
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
  const limite = Date.now() - ingesta.diasDeVigencia * 86400000;

  const candidatas = [];
  for (const c of concejos) {
    const vistas = new Set();
    const lista = porConcejo
      .get(c.slug)
      .filter((i) => i.titulo && i.enlace)
      .filter((i) => new Date(i.fecha).getTime() > limite)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .filter((i) => {
        const id = idDe(i);
        if (vistas.has(id) || conocidas.has(id)) return false;
        vistas.add(id);
        return true;
      })
      .slice(0, ingesta.maxPorConcejo);
    candidatas.push(...lista.map((i) => ({ item: i, concejo: c })));
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
