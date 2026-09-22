#!/usr/bin/env node
// Genera el sitio estático de La Prida en dist/.  →  node build.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { sitio, concejos, secciones, tarifas, anuncios } from './src/config.mjs';
import { idiomas, IDIOMA_BASE, slugSeccion, idiomaDe, ruta as rutaIdioma } from './src/idiomas.mjs';
import {
  pagina, portada, paginaConcejo, paginaSeccion, paginaArticulo, paginaTexto,
  filtrosAgenda, programasOficiales, tarjetaEmpleo, publicaTuOferta, dondeBuscarEmpleo,
  estado, T, U, tr, nombreSeccion,
  itemAgenda, itemAviso, esc, fechaLarga, LOGO, pagina as marco,
} from './src/lib/plantillas.mjs';
import { portadaSvg } from './src/lib/portadas.mjs';

const RAIZ = import.meta.dirname;
const DIST = path.join(RAIZ, 'dist');
const DATOS = path.join(RAIZ, 'content', 'data');

async function json(archivo, pordefecto) {
  try {
    return JSON.parse(await fs.readFile(path.join(DATOS, archivo), 'utf8'));
  } catch {
    return pordefecto;
  }
}

/**
 * Traduce una ruta lógica (siempre en español) a su sitio en el disco:
 * antepone el prefijo del idioma y cambia el slug de la sección.
 *   'agenda/index.html' con idioma 'en'  →  'en/whats-on/index.html'
 */
function destinoDe(rutaRelativa) {
  const idioma = estado.idioma;
  const partes = rutaRelativa.split('/');
  if (partes.length > 1) partes[0] = slugSeccion(partes[0], idioma);
  const camino = partes.join('/');
  return idioma === IDIOMA_BASE ? camino : `${idioma}/${camino}`;
}

async function escribir(rutaRelativa, contenido) {
  const destino = path.join(DIST, destinoDe(rutaRelativa));
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, contenido);
}

/* --- qué se dibuja cuando no hay foto -------------------------------------- */
// El motivo sigue al asunto de la pieza; si no está claro, al carácter del concejo.
const MOTIVOS_TEMA = [
  [/\b(sidra|llagar\w*|escanci\w+|espicha|manzana\w*|pumar\w*|mayada|mayar)\b/i, 'pumarada'],
  [/\b(queso|cabrales|cueva\w*|urriellu|monta[ñn]a\w*|cumbre\w*|sotres|bulnes|picos|ganado|pasto\w*|puertos)\b/i, 'picos'],
  [/\b(r[ií]a|playa\w*|rodiles|tazones|marisma\w*|barco\w*|vela|mar|marea\w*)\b/i, 'ria'],
  [/\b(r[ií]o|caudal|salm[oó]n|pesca|valle\w*|h[oó]rreo\w*|sella|piloña)\b/i, 'valle'],
];
const MOTIVO_CONCEJO = { pilona: 'valle', nava: 'pumarada', cabrales: 'picos', villaviciosa: 'ria' };

function motivoDe(p) {
  const heno = `${p.titular} ${p.entradilla} ${(p.etiquetas ?? []).join(' ')}`;
  for (const [re, m] of MOTIVOS_TEMA) if (re.test(heno)) return m;
  return MOTIVO_CONCEJO[p.concejoSlug] ?? 'valle';
}

/* --- extras --------------------------------------------------------------- */

function feedRss(piezas) {
  const items = piezas
    .slice(0, 40)
    .map(
      (p) => `  <item>
    <title>${esc(tr(p, 'titular'))}</title>
    <link>${esc(sitio.url + U(p.url))}</link>
    <guid isPermaLink="true">${esc(sitio.url + U(p.url))}</guid>
    <pubDate>${new Date(p.fecha).toUTCString()}</pubDate>
    <category>${esc(p.concejo)}</category>
    <description>${esc(tr(p, 'entradilla') || tr(p, 'titular'))}</description>
  </item>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${esc(sitio.nombre)}</title>
  <link>${esc(sitio.url)}</link>
  <description>${esc(sitio.descripcion)}</description>
  <language>${idiomaDe(estado.idioma).htmlLang.toLowerCase()}</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel></rss>`;
}

/**
 * Sitemap con las cuatro versiones de cada página y sus alternativas hreflang.
 * Es lo que le dice a Google que /en/whats-on/ y /agenda/ son la misma página
 * en dos idiomas, y no contenido duplicado.
 */
function sitemap(rutas) {
  const entradas = [];
  for (const u of rutas) {
    for (const idi of idiomas) {
      entradas.push(`  <url>
    <loc>${sitio.url}${rutaIdioma(idi.codigo, u.url)}</loc>
${idiomas
  .map(
    (alt) =>
      `    <xhtml:link rel="alternate" hreflang="${alt.codigo}" href="${sitio.url}${rutaIdioma(alt.codigo, u.url)}"/>`
  )
  .join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${sitio.url}${rutaIdioma(IDIOMA_BASE, u.url)}"/>
    <lastmod>${new Date(u.fecha ?? Date.now()).toISOString().slice(0, 10)}</lastmod>
    <changefreq>${u.freq ?? 'daily'}</changefreq>
  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entradas.join('\n')}
</urlset>`;
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="32" fill="#F2451B"/>
  <circle cx="32" cy="30" r="9" fill="#F2B705" stroke="#14120F" stroke-width="2.5"/>
  <path d="M2 58 L21 30 L32 40 L43 27 L62 58 Z" fill="#FDFCF8" stroke="#14120F" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M32 40 L43 27 L62 58 L32 58 Z" fill="#E8E3D7" stroke="#14120F" stroke-width="2.5" stroke-linejoin="round"/>
</svg>`;

/* --- páginas fijas --------------------------------------------------------- */

const QUIENES = `
<p><strong>La Prida</strong> es un diario de la mañana para cuatro concejos del oriente y el centro de Asturias:
Piloña, Nava, Cabrales y Villaviciosa. Sale temprano, se lee en cinco minutos y está pensado para el rato del café.</p>
<p>La idea es sencilla. Cada madrugada se repasan los medios de la comarca, los tablones de los ayuntamientos, el
BOPA y la agenda cultural. Lo que afecta a estos cuatro concejos se ordena, se comprueba y se cuenta con
palabras propias, siempre citando y enlazando de dónde sale. Ni copiamos textos ajenos ni inventamos datos:
si una cifra no está en la fuente, no aparece aquí.</p>
<p>No somos un medio de sucesos ni de titulares a gritos. Nos interesan las obras que cortan una carretera, el
pleno que sube una tasa, la espicha del sábado, el equipo que sube de categoría y la fiesta que lleva
doscientos años celebrándose. Lo de casa.</p>
<h2>Correcciones</h2>
<p>Si ves un error, escribe y se corrige el mismo día, dejando constancia al pie de la pieza. Es la única manera
de que esto sirva para algo.</p>
<h2>Publicidad</h2>
<p>El sitio se sostiene con publicidad y con patrocinios de negocios de la zona. Los espacios patrocinados van
siempre marcados como tales y nunca condicionan lo que se publica.</p>
`;

const ACCESIBILIDAD = `
<p>La Prida se lee a las siete de la mañana, muchas veces con una mano en la taza y media luz. Si no se puede
leer bien en esas condiciones, no sirve. Estos son los compromisos, y son verificables.</p>
<h2>El color nunca va solo</h2>
<p>Cada concejo tiene un color, pero también una letra: P de Piloña, N de Nava, C de Cabrales, V de Villaviciosa.
Si no distingues los colores, o si tu navegador está en modo de alto contraste, la letra sigue diciéndote dónde
estás. Ningún dato de este sitio se transmite solo con color.</p>
<h2>Contraste y tamaño</h2>
<p>El texto base es de 17 píxeles con interlínea larga, y todos los textos cumplen el contraste AA de las pautas
WCAG 2.2. Cada color de concejo tiene dos versiones: una para rellenos y otra, más oscura, para cuando ese color
es texto sobre fondo claro. El amarillo de Nava nunca se usa como letra sobre blanco.</p>
<h2>Teclado</h2>
<p>Todo se puede recorrer con el tabulador, el foco se ve siempre con un contorno azul de tres píxeles, y el
primer salto de la página te lleva directo al contenido. Los botones y enlaces miden al menos 44 píxeles, que es
lo que pide un dedo.</p>
<h2>Movimiento</h2>
<p>Si tienes activado «reducir movimiento» en tu sistema, aquí no se mueve nada. No hay carruseles automáticos,
ni ventanas que salten, ni vídeos que arranquen solos.</p>
<h2>Lectores de pantalla</h2>
<p>Las páginas usan encabezados en orden, regiones marcadas y textos alternativos. El esquema de los cuatro
concejos lleva una descripción escrita, porque un mapa sin describir es un mapa que excluye.</p>
<h2>Si algo falla</h2>
<p>Escríbenos y se arregla. Una barrera de accesibilidad es un error de programación, no una opinión.</p>
`;

const LEGAL = `
<h2>Titularidad</h2>
<p>Este sitio web es un proyecto de información local sobre los concejos de Piloña, Nava, Cabrales y Villaviciosa.
Para cualquier asunto relacionado con esta web puedes escribir a la dirección de contacto que figura en el pie.</p>

<h2>Contenidos y fuentes</h2>
<p>Las piezas publicadas son textos de elaboración propia, redactados a partir de información de fuentes públicas
(boletines oficiales, ayuntamientos, organismos) y de medios de comunicación, que se citan y enlazan de forma
expresa al pie de cada pieza. No se reproducen textos ajenos: se informa del mismo hecho con redacción propia.
Cuando se recoge una expresión textual de un tercero, va entrecomillada y atribuida a quien la dijo, al amparo
del derecho de cita del artículo 32 de la Ley de Propiedad Intelectual.</p>
<p>Antes de publicarse, cada pieza pasa un control automático que compara su texto con el de la fuente y bloquea
las que compartan frases seguidas con ella.</p>

<h2>Imágenes</h2>
<p>Las fotografías proceden de repositorios de contenido libre, principalmente Wikimedia Commons, y se publican
con el crédito, la licencia y el enlace al original al pie de cada imagen. No se utilizan fotografías de los
medios de los que procede la información, ni siquiera enlazadas desde su servidor. Cuando no hay ninguna imagen
libre adecuada, se publica una ilustración generada por el propio sitio, que es obra original.</p>
<p>Las tipografías empleadas (Bricolage Grotesque, Inter y Martian Mono) se distribuyen bajo licencia SIL Open Font License 1.1, que
permite su uso comercial. El logotipo y las ilustraciones son creación original de este sitio.</p>

<h2>Retirada de contenidos</h2>
<p>Si eres titular de derechos sobre algún contenido y consideras que su uso aquí no es adecuado, escríbenos a la
dirección de contacto y lo retiraremos o modificaremos sin demora y sin pedir explicaciones. Lo mismo si eres un
medio y prefieres que dejemos de recoger tu canal de noticias.</p>

<h2>Protección de datos</h2>
<p>No se recogen datos personales salvo los que envíes voluntariamente al suscribirte al boletín (tu dirección de
correo) o al escribirnos. Esos datos se usan únicamente para enviarte el boletín o responderte, no se ceden a
terceros y puedes solicitar su supresión en cualquier momento escribiendo a la dirección de contacto.</p>

<h2>Cookies</h2>
<p>Utilizamos cookies técnicas necesarias para el funcionamiento del sitio y para recordar tus preferencias
(por ejemplo, el modo noche), que se guardan solo en tu navegador. Si aceptas, empleamos además cookies de
terceros de medición de audiencia y de publicidad. Puedes cambiar tu decisión borrando los datos de este sitio
en tu navegador.</p>

<h2>Publicidad</h2>
<p>Los espacios publicitarios y los contenidos patrocinados se identifican siempre como tales. La publicidad no
interviene en la selección ni en la redacción de las piezas informativas.</p>

<h2>Responsabilidad</h2>
<p>Se pone el máximo cuidado en la exactitud de lo publicado, pero la información puede contener errores o quedar
desactualizada. Los enlaces a sitios externos se ofrecen a título informativo y no implica responsabilidad
sobre sus contenidos.</p>
`;

// Las páginas fijas, en los cuatro idiomas. Traducidas a mano: son la voz de
// la casa y lo que un extranjero lee para decidir si fiarse.
const FIJAS = {
  quienes: {
    en: `
<p><strong>La Prida</strong> is a morning paper for four councils in central and eastern Asturias:
Piloña, Nava, Cabrales and Villaviciosa. It comes out early, takes five minutes to read and is meant
for the coffee.</p>
<p>The idea is simple. Every night we go through the local press, the council noticeboards, the
regional gazette and the cultural calendar. Whatever affects these four councils is sorted, checked
and retold in our own words, always citing and linking the source. We do not copy other people's
text and we do not invent figures: if a number is not in the source, it is not here.</p>
<p>We are not a crime paper and we do not shout. What interests us is the roadworks that close a
lane, the council meeting that raises a rate, Saturday's cider-house feast, the team that goes up a
division and the festival that has been running for two hundred years. Things from around here.</p>
<h2>Corrections</h2>
<p>If you spot a mistake, write and it gets fixed the same day, with a note at the foot of the story.</p>
<h2>Advertising</h2>
<p>The site is paid for by advertising and by sponsorship from local businesses. Sponsored slots are
always marked as such and never decide what gets published.</p>
<h2>Languages</h2>
<p>La Prida is written in Spanish and published in English, French and German as well. The Spanish
version is the original; the others are machine translations checked by the system. When a story has
not been translated yet, it says so and links to the Spanish.</p>`,
    fr: `
<p><strong>La Prida</strong> est un quotidien du matin pour quatre communes du centre et de l'est des
Asturies : Piloña, Nava, Cabrales et Villaviciosa. Il paraît tôt, se lit en cinq minutes et il est
fait pour le café.</p>
<p>L'idée est simple. Chaque nuit nous parcourons la presse locale, les panneaux d'affichage des
mairies, le journal officiel des Asturies et l'agenda culturel. Ce qui concerne ces quatre communes
est trié, vérifié et raconté avec nos mots, en citant et en liant toujours la source. Nous ne
copions pas les textes des autres et nous n'inventons pas de chiffres : si un chiffre n'est pas dans
la source, il n'est pas ici.</p>
<p>Nous ne sommes pas un journal de faits divers et nous ne crions pas. Ce qui nous intéresse, ce
sont les travaux qui ferment une route, le conseil municipal qui augmente une taxe, l'espicha de
samedi, l'équipe qui monte de division et la fête qui se célèbre depuis deux cents ans. Les choses
d'ici.</p>
<h2>Corrections</h2>
<p>Si vous repérez une erreur, écrivez-nous : elle est corrigée le jour même, avec une note en bas de
l'article.</p>
<h2>Publicité</h2>
<p>Le site vit de la publicité et du parrainage de commerces d'ici. Les emplacements sponsorisés sont
toujours signalés comme tels et ne décident jamais de ce qui est publié.</p>
<h2>Langues</h2>
<p>La Prida s'écrit en espagnol et paraît aussi en anglais, en français et en allemand. La version
espagnole est l'originale ; les autres sont des traductions automatiques vérifiées par le système.
Quand un article n'est pas encore traduit, c'est indiqué et un lien renvoie à l'espagnol.</p>`,
    de: `
<p><strong>La Prida</strong> ist eine Morgenzeitung für vier Gemeinden im Zentrum und Osten
Asturiens: Piloña, Nava, Cabrales und Villaviciosa. Sie erscheint früh, ist in fünf Minuten gelesen
und ist für den Kaffee gedacht.</p>
<p>Die Idee ist einfach. Jede Nacht gehen wir die Presse der Gegend durch, die Aushänge der
Rathäuser, das Amtsblatt und den Kulturkalender. Was diese vier Gemeinden betrifft, wird sortiert,
geprüft und mit eigenen Worten erzählt — immer mit Quellenangabe und Link. Wir kopieren keine fremden
Texte und wir erfinden keine Zahlen: Was nicht in der Quelle steht, steht auch nicht hier.</p>
<p>Wir sind kein Boulevardblatt und wir schreien nicht. Uns interessieren die Bauarbeiten, die eine
Straße sperren, die Ratssitzung, die eine Gebühr erhöht, die espicha am Samstag, die Mannschaft, die
aufsteigt, und das Fest, das seit zweihundert Jahren gefeiert wird. Die Dinge von hier.</p>
<h2>Korrekturen</h2>
<p>Wenn Ihnen ein Fehler auffällt, schreiben Sie uns: Er wird am selben Tag korrigiert, mit einem
Vermerk am Ende des Beitrags.</p>
<h2>Werbung</h2>
<p>Die Seite finanziert sich über Werbung und über Sponsoring von Betrieben aus der Gegend.
Gesponserte Plätze sind immer als solche gekennzeichnet und entscheiden nie darüber, was erscheint.</p>
<h2>Sprachen</h2>
<p>La Prida wird auf Spanisch geschrieben und erscheint außerdem auf Englisch, Französisch und
Deutsch. Maßgeblich ist die spanische Fassung; die anderen sind maschinelle Übersetzungen, vom System
geprüft. Wenn ein Beitrag noch nicht übersetzt ist, steht das dabei und ein Link führt zum Spanischen.</p>`,
  },
};

function paginaAnunciate(piezas, tiempo) {
  const fichas = tarifas
    .map(
      (t) => `<article class="tarifa${t.destacado ? ' tarifa--destacada' : ''}">
  ${t.destacado ? '<span class="tarifa__cinta">El más pedido</span>' : ''}
  <h3 class="tarifa__nombre">${esc(t.nombre)}</h3>
  <p class="tarifa__precio">${esc(t.precio)}</p>
  <p class="tarifa__texto">${esc(t.descripcion)}</p>
  <ul class="tarifa__incluye">${(t.incluye ?? []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
</article>`
    )
    .join('\n');

  return marco({
    titulo: 'Anúnciate en La Prida',
    descripcion:
      'Pon tu negocio delante de la gente de Piloña, Nava, Cabrales y Villaviciosa, cada mañana. Formatos, precios y cómo contratarlo.',
    url: '/anunciate/',
    tiempo,
    contenido: `<div class="contenedor">
  <section class="portico">
    <span class="rotulo" style="color:var(--tinta-3)">Para negocios de casa</span>
    <h1 style="max-width:15ch">Tu negocio, en el desayuno de tus vecinos</h1>
    <p style="max-width:56ch">La Prida se lee a primera hora, en casa y con el café. No competimos con la tele ni con el periódico de Oviedo: solo contamos lo de estos cuatro concejos.</p>
  </section>

  <section class="datos">
    <div class="dato"><span class="dato__cifra">4</span><span class="dato__que">concejos: Piloña, Nava, Cabrales y Villaviciosa</span></div>
    <div class="dato"><span class="dato__cifra">${piezas.length}</span><span class="dato__que">piezas publicadas ahora mismo</span></div>
    <div class="dato"><span class="dato__cifra">7:00</span><span class="dato__que">hora a la que sale la edición, cada día</span></div>
  </section>

  <h2 class="titulo-seccion">Qué puedes contratar</h2>
  <div class="tarifas">${fichas}</div>

  <section>
    <h2 class="titulo-seccion">Cómo se contrata</h2>
    <ol class="pasos">
      <li><strong>Escríbenos</strong> a ${esc(sitio.email)} con el nombre del negocio y en qué concejo quieres salir.</li>
      <li><strong>Nos mandas una frase y un enlace.</strong> Si no la tienes, te la escribimos nosotros y la apruebas tú.</li>
      <li><strong>Sale a la mañana siguiente.</strong> Sin permanencia: avisas y se retira.</li>
    </ol>
    <p style="font-size:15px;color:var(--tinta-2);max-width:62ch">Los espacios patrocinados van siempre marcados como tales. La publicidad no decide qué se publica ni cómo se cuenta: es la única manera de que esto le sirva a alguien, y también de que a ti te sirva salir aquí.</p>
  </section>
</div>`,
  });
}

/* --- construcción ---------------------------------------------------------- */

async function main() {
  const t0 = Date.now();
  // Se vacía dist/ antes de generar. En carpetas sincronizadas o con permisos
  // restringidos el borrado puede no estar permitido: en ese caso se sobrescribe.
  try {
    await fs.rm(DIST, { recursive: true, force: true });
  } catch (err) {
    console.warn(`   (no se pudo vaciar dist/: ${err.code ?? err.message}; se sobrescribe)`);
  }
  await fs.mkdir(DIST, { recursive: true });

  const piezas = (await json('noticias.json', [])).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const cuentas = Object.fromEntries(
    concejos.map((c) => [c.slug, piezas.filter((p) => p.concejoSlug === c.slug).length])
  );

  estado.muestra = piezas.length > 0 && piezas.every((p) => p.muestra);

  // Créditos de las fotos descargadas por scripts/fotos.mjs
  let creditos = {};
  try {
    creditos = JSON.parse(
      await fs.readFile(path.join(RAIZ, 'content', 'fotos', 'creditos.json'), 'utf8')
    );
  } catch {}

  for (const p of piezas) {
    // 1. La foto que traía la propia fuente.
    if (p.imagen) continue;

    // 2. Una foto libre descargada para el tema de esta pieza.
    const cr = creditos[p.id];
    if (cr?.archivo) {
      await fs.mkdir(path.join(DIST, 'fotos'), { recursive: true });
      await fs.copyFile(
        path.join(RAIZ, 'content', 'fotos', cr.archivo),
        path.join(DIST, 'fotos', cr.archivo)
      );
      p.imagen = `/fotos/${cr.archivo}`;
      p.credito = cr;
      continue;
    }

    // 3. Y si no hay ninguna, una ilustración propia del tema.
    const color = concejos.find((c) => c.slug === p.concejoSlug)?.color ?? '#5F7A2B';
    await escribir(`img/${p.id}.svg`, portadaSvg(p.id, color, motivoDe(p)));
    p.imagen = `/img/${p.id}.svg`;
    p.ilustracion = true;
  }
  const despertadorDatos = await json('despertador.json', { puntos: [] });
  const tiempo = await json('tiempo.json', null);
  const agendaManual = await json('agenda.json', []);
  const empleoManual = await json('empleo.json', []);

  const cuando = (e) => new Date(e.fechaEvento || e.fecha).getTime();
  const ayer = Date.now() - 86400000;
  const agenda = [
    ...agendaManual,
    ...piezas.filter((p) => p.seccion === 'agenda').map((p) => ({ ...p, lugar: p.concejo })),
  ]
    .filter((e) => cuando(e) > ayer)
    .sort((a, b) => cuando(a) - cuando(b));

  const avisos = piezas.filter((p) => p.seccion === 'avisos');
  const urls = [];

  // Una pasada completa por idioma. `estado.idioma` es lo único que cambia:
  // las plantillas leen de ahí los textos, las rutas y el formato de fecha.
  for (const idi of idiomas) {
    estado.idioma = idi.codigo;
    const soloEs = idi.codigo === IDIOMA_BASE;
    if (soloEs) urls.push({ url: '/', freq: 'hourly' });

  
    // Portada
    await escribir('index.html', portada({ piezas, despertadorDatos, tiempo, agenda, avisos }));

    // Concejos
    for (const c of concejos) {
      const suyas = piezas.filter((p) => p.concejoSlug === c.slug);
      await escribir(`${c.slug}/index.html`, paginaConcejo(c, suyas, tiempo, cuentas));
      if (soloEs) urls.push({ url: `/${c.slug}/`, fecha: suyas[0]?.fecha });
    }

    // Secciones
    for (const s of secciones) {
      let lista = piezas.filter((p) => p.seccion === s.slug);
      let extra = '';
      if (s.slug === 'actualidad') lista = piezas;
      if (s.slug === 'agenda') {
        // La cartelera: primero lo que viene, después lo que se ha hecho estas
        // semanas, que también dice mucho de un sitio. Todo filtrable por tipo.
        const pasados = piezas
          .filter((p) => p.tipoEvento && !agenda.some((a) => a.url === p.url))
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
          .slice(0, 14);
        const todos = [...agenda, ...pasados];
        extra = `
  ${filtrosAgenda(todos)}
  ${
    agenda.length
      ? `<h2 class="titulo-seccion">${T('loQueViene')} <span class="cuenta">${agenda.length} ${agenda.length === 1 ? T('plan') : T('planes')}</span></h2>
  <div class="agenda" data-cartelera style="margin-bottom:40px">${agenda.map(itemAgenda).join('\n')}</div>`
      : `<p class="vacio">${T('agendaVacia')}</p>`
  }
  ${
    pasados.length
      ? `<h2 class="titulo-seccion">${T('loQueSeHizo')} <span class="cuenta">${T('ultimasSemanas')}</span></h2>
  <div class="agenda" data-cartelera style="margin-bottom:40px">${pasados.map(itemAgenda).join('\n')}</div>`
      : ''
  }
  <div style="max-width:480px;margin:0 0 20px">${programasOficiales()}</div>`;
        lista = [];
      }
      if (s.slug === 'trabajo') {
        // Dos cosas distintas en la misma página: las ofertas que publica un
        // negocio (a mano, gratis) y las noticias de empleo que salen en la prensa.
        const hoy = new Date().toISOString().slice(0, 10);
        const ofertas = [...empleoManual].sort((a, b) => {
          const vivaA = !a.hasta || a.hasta >= hoy;
          const vivaB = !b.hasta || b.hasta >= hoy;
          if (vivaA !== vivaB) return vivaA ? -1 : 1;
          if (!!a.destacada !== !!b.destacada) return a.destacada ? -1 : 1;
          return String(b.desde ?? '').localeCompare(String(a.desde ?? ''));
        });
        extra = `
  ${
    ofertas.length
      ? `<h2 class="titulo-seccion">${T('ofertasDeAqui')} <span class="cuenta">${ofertas.length}</span></h2>
  <div class="empleos">${ofertas.map(tarjetaEmpleo).join('\n')}</div>`
      : `<p class="vacio">${T('empleoVacio')}</p>`
  }
  <div style="display:grid;gap:22px;max-width:520px;margin:0 0 40px">${publicaTuOferta()}${dondeBuscarEmpleo()}</div>
  ${lista.length ? `<h2 class="titulo-seccion">${T('empleoPrensa')}</h2>` : ''}`;
      }
      if (s.slug === 'avisos' && avisos.length) {
        extra = `<div class="avisos" style="margin-bottom:36px">${avisos.map(itemAviso).join('\n')}</div>`;
        lista = [];
      }
      await escribir(`${s.slug}/index.html`, paginaSeccion(s, lista, tiempo, extra, cuentas));
      if (soloEs) urls.push({ url: `/${s.slug}/` });
    }

    // Artículos
    for (const p of piezas) {
      const relacionadas = piezas
        .filter((o) => o.id !== p.id && (o.concejoSlug === p.concejoSlug || o.seccion === p.seccion))
        .slice(0, 3);
      await escribir(`${p.url.replace(/^\/|\/$/g, '')}/index.html`, paginaArticulo(p, relacionadas, tiempo, cuentas));
      if (soloEs) urls.push({ url: p.url, fecha: p.fecha, freq: 'monthly' });
    }

    // Páginas fijas
    await escribir(
      'quienes-somos/index.html',
      paginaTexto({
        titulo: T('quienesSomos'),
        descripcion: 'Cómo se hace La Prida, de dónde salen las noticias y cómo corregimos.',
        url: '/quienes-somos/',
        html: estado.idioma === IDIOMA_BASE ? QUIENES : (FIJAS.quienes[estado.idioma] ?? QUIENES),
        activo: 'quienes-somos',
        cuentas,
      })
    );
    await escribir(
      'aviso-legal/index.html',
      paginaTexto({
        titulo: T('avisoLegal'),
        descripcion: 'Titularidad, fuentes, protección de datos, cookies y publicidad de La Prida.',
        url: '/aviso-legal/',
        html: LEGAL,
        cuentas,
      })
    );

    await escribir(
      'accesibilidad/index.html',
      paginaTexto({
        titulo: T('accesibilidad'),
        descripcion: 'Cómo está pensada La Prida para que se pueda leer con cualquier ojo, cualquier dedo y cualquier navegador.',
        url: '/accesibilidad/',
        html: ACCESIBILIDAD,
        cuentas,
      })
    );
    await escribir('anunciate/index.html', paginaAnunciate(piezas, tiempo));
    urls.push(
      { url: '/quienes-somos/', freq: 'monthly' },
      { url: '/aviso-legal/', freq: 'yearly' },
      { url: '/anunciate/', freq: 'monthly' }
    );

    // 404
    await escribir(
      '404.html',
      pagina({
        titulo: T('finDelCamino'),
        descripcion: T('finDelCamino'),
        url: '/404.html',
        contenido: `<div class="contenedor"><div class="articulo" style="text-align:center;padding:70px 0">
        ${LOGO(96)}
        <h1 class="articulo__titular" style="margin-top:20px">${esc(T('finDelCamino'))}</h1>
        <a class="volver" href="${U('/')}">← ${esc(T('portada'))}</a>
      </div></div>`,
      })
    );


  }
  estado.idioma = IDIOMA_BASE;

  // Un canal RSS por idioma, con los titulares en su lengua.
  for (const idi of idiomas) {
    estado.idioma = idi.codigo;
    await escribir('feed.xml', feedRss(piezas));
  }
  estado.idioma = IDIOMA_BASE;

  // Estáticos
  await fs.copyFile(path.join(RAIZ, 'src', 'estilos.css'), path.join(DIST, 'estilos.css'));
  await escribir('favicon.svg', FAVICON);

  await escribir('sitemap.xml', sitemap(urls));
  await escribir(
    'robots.txt',
    `User-agent: *\nAllow: /\n\nSitemap: ${sitio.url}/sitemap.xml\n`
  );
  // ads.txt: AdSense lo pide para poder pagarte. Se genera solo con tu ca-pub.
  if (anuncios.adsense.cliente) {
    await escribir(
      'ads.txt',
      `google.com, ${anuncios.adsense.cliente.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`
    );
  }

  console.log(
    `☕ La Prida construido en ${Date.now() - t0} ms\n` +
      `   ${piezas.length} piezas · ${concejos.length} concejos · ${urls.length} URLs\n` +
      `   Edición de ${fechaLarga(new Date().toISOString())}\n` +
      `   Salida: dist/`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
