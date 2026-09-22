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
<p><strong>La Prida</strong> es un diario de la mañana para cinco concejos del oriente y el centro de Asturias:
Piloña, Nava, Cabranes, Cabrales y Villaviciosa. Sale temprano, se lee en cinco minutos y está pensado para el rato del café.</p>
<p>La idea es sencilla. Cada madrugada se repasan los medios de la comarca, los tablones de los ayuntamientos, el
BOPA y la agenda cultural. Lo que afecta a estos cinco concejos se ordena, se comprueba y se cuenta con
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
<p>Cada concejo tiene un color, pero también una letra: N de Nava, V de Villaviciosa, CN de Cabranes, P de Piloña
y CL de Cabrales. Las dos «C» llevan dos letras precisamente para no depender del color para distinguirlas.
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
<p>Las páginas usan encabezados en orden, regiones marcadas y textos alternativos. El esquema de los cinco
concejos lleva una descripción escrita, porque un mapa sin describir es un mapa que excluye.</p>
<h2>Si algo falla</h2>
<p>Escríbenos y se arregla. Una barrera de accesibilidad es un error de programación, no una opinión.</p>
`;

const LEGAL = `
<h2>Titularidad</h2>
<p>Este sitio web es un proyecto de información local sobre los concejos de Piloña, Nava, Cabranes, Cabrales y Villaviciosa.
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
// Las descripciones (meta) de las páginas fijas, también en los cuatro idiomas:
// es lo que se ve en Google y en el enlace compartido.
const DESCRIPCIONES = {
  legal: {
    es: 'Titularidad, fuentes, protección de datos, cookies y publicidad de La Prida.',
    en: 'Who runs La Prida, where the news comes from, data protection, cookies and advertising.',
    fr: "Qui édite La Prida, d'où viennent les informations, protection des données, cookies et publicité.",
    de: 'Verantwortliche, Quellen, Datenschutz, Cookies und Werbung von La Prida.',
  },
  accesibilidad: {
    es: 'Cómo está pensada La Prida para que se pueda leer con cualquier ojo, cualquier dedo y cualquier navegador.',
    en: 'How La Prida is built to be read with any eye, any finger and any browser.',
    fr: "Comment La Prida est conçue pour être lue avec n'importe quel œil, n'importe quel doigt et n'importe quel navigateur.",
    de: 'Wie La Prida gebaut ist, damit sie mit jedem Auge, jedem Finger und jedem Browser lesbar ist.',
  },
  quienes: {
    es: 'Cómo se hace La Prida, de dónde salen las noticias y cómo corregimos.',
    en: 'How La Prida is made, where the news comes from and how we correct mistakes.',
    fr: "Comment se fait La Prida, d'où viennent les informations et comment nous corrigeons.",
    de: 'Wie La Prida entsteht, woher die Nachrichten kommen und wie wir korrigieren.',
  },
};

/** El texto de una página fija en el idioma actual, con el español de reserva. */
const fija = (grupo, castellano) =>
  estado.idioma === IDIOMA_BASE ? castellano : (FIJAS[grupo]?.[estado.idioma] ?? castellano);
const descripcionFija = (grupo) => DESCRIPCIONES[grupo][estado.idioma] ?? DESCRIPCIONES[grupo].es;

const FIJAS = {
  quienes: {
    en: `
<p><strong>La Prida</strong> is a morning paper for five councils in central and eastern Asturias:
Piloña, Nava, Cabranes, Cabrales and Villaviciosa. It comes out early, takes five minutes to read and is meant
for the coffee.</p>
<p>The idea is simple. Every night we go through the local press, the council noticeboards, the
regional gazette and the cultural calendar. Whatever affects these five councils is sorted, checked
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
<p><strong>La Prida</strong> est un quotidien du matin pour cinq communes du centre et de l'est des
Asturies : Piloña, Nava, Cabranes, Cabrales et Villaviciosa. Il paraît tôt, se lit en cinq minutes et il est
fait pour le café.</p>
<p>L'idée est simple. Chaque nuit nous parcourons la presse locale, les panneaux d'affichage des
mairies, le journal officiel des Asturies et l'agenda culturel. Ce qui concerne ces cinq communes
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
<p><strong>La Prida</strong> ist eine Morgenzeitung für fünf Gemeinden im Zentrum und Osten
Asturiens: Piloña, Nava, Cabranes, Cabrales und Villaviciosa. Sie erscheint früh, ist in fünf Minuten gelesen
und ist für den Kaffee gedacht.</p>
<p>Die Idee ist einfach. Jede Nacht gehen wir die Presse der Gegend durch, die Aushänge der
Rathäuser, das Amtsblatt und den Kulturkalender. Was diese fünf Gemeinden betrifft, wird sortiert,
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
  accesibilidad: {
    en: `
<p>La Prida is read at seven in the morning, often with one hand on the cup and half the lights on. If it cannot
be read comfortably like that, it is no use. These are the commitments, and every one of them can be checked.</p>
<h2>Colour never travels alone</h2>
<p>Each council has a colour, but it also has a letter: N for Nava, V for Villaviciosa, CN for Cabranes, P for
Piloña and CL for Cabrales. The two Cs carry two letters precisely so that telling them apart never depends on
colour. If you cannot distinguish colours, or your browser is in high-contrast mode, the letter still tells you
where you are. Nothing on this site is conveyed by colour alone.</p>
<h2>Contrast and size</h2>
<p>Body text is 17 pixels with generous line spacing, and every text meets the AA contrast level of WCAG 2.2.
Each council colour comes in two versions: one for fills and a darker one for when that colour is text on a light
background. Nava's yellow is never used as lettering on white.</p>
<h2>Keyboard</h2>
<p>Everything can be reached with the tab key, the focus is always visible as a three-pixel blue outline, and the
first jump on the page takes you straight to the content. Buttons and links are at least 44 pixels, which is what
a finger needs.</p>
<h2>Motion</h2>
<p>If you have "reduce motion" switched on in your system, nothing here moves. There are no automatic carousels,
no windows that jump out, no videos that start on their own.</p>
<h2>Screen readers</h2>
<p>Pages use headings in order, labelled regions and alternative text. The diagram of the five councils carries a
written description, because an undescribed map is a map that excludes.</p>
<h2>If something breaks</h2>
<p>Write to us and it gets fixed. An accessibility barrier is a programming error, not a matter of opinion.</p>
`,
    fr: `
<p>La Prida se lit à sept heures du matin, souvent une main sur la tasse et à demi-lumière. Si on ne peut pas la
lire correctement dans ces conditions, elle ne sert à rien. Voici les engagements, et ils sont tous vérifiables.</p>
<h2>La couleur ne voyage jamais seule</h2>
<p>Chaque commune a une couleur, mais aussi une lettre : N pour Nava, V pour Villaviciosa, CN pour Cabranes,
P pour Piloña et CL pour Cabrales. Les deux « C » portent deux lettres précisément pour que les distinguer ne
dépende jamais de la couleur. Si vous ne distinguez pas les couleurs, ou si votre navigateur est en mode contraste
élevé, la lettre vous dit toujours où vous êtes. Aucune information de ce site n'est transmise par la seule couleur.</p>
<h2>Contraste et taille</h2>
<p>Le texte courant fait 17 pixels avec un interlignage généreux, et tous les textes respectent le niveau AA des
règles WCAG 2.2. Chaque couleur de commune existe en deux versions : une pour les aplats et une autre, plus foncée,
pour quand cette couleur devient du texte sur fond clair. Le jaune de Nava n'est jamais utilisé comme lettrage sur
du blanc.</p>
<h2>Clavier</h2>
<p>Tout se parcourt à la tabulation, le focus est toujours visible par un contour bleu de trois pixels, et le
premier saut de la page mène directement au contenu. Les boutons et les liens mesurent au moins 44 pixels, ce
qu'exige un doigt.</p>
<h2>Mouvement</h2>
<p>Si vous avez activé « réduire les animations » dans votre système, rien ne bouge ici. Pas de carrousels
automatiques, pas de fenêtres qui surgissent, pas de vidéos qui démarrent seules.</p>
<h2>Lecteurs d'écran</h2>
<p>Les pages utilisent des titres dans l'ordre, des régions balisées et des textes alternatifs. Le schéma des cinq
communes est accompagné d'une description écrite, parce qu'une carte non décrite est une carte qui exclut.</p>
<h2>Si quelque chose ne va pas</h2>
<p>Écrivez-nous et ce sera corrigé. Une barrière d'accessibilité est une erreur de programmation, pas une opinion.</p>
`,
    de: `
<p>La Prida wird um sieben Uhr morgens gelesen, oft mit einer Hand an der Tasse und bei halbem Licht. Wenn sie sich
so nicht gut lesen lässt, taugt sie nichts. Das sind die Zusagen, und sie sind alle überprüfbar.</p>
<h2>Farbe steht nie allein</h2>
<p>Jede Gemeinde hat eine Farbe, aber auch einen Buchstaben: N für Nava, V für Villaviciosa, CN für Cabranes,
P für Piloña und CL für Cabrales. Die beiden «C» tragen zwei Buchstaben, gerade damit ihre Unterscheidung nie von
der Farbe abhängt. Wer Farben nicht unterscheidet oder den Browser im hohen Kontrast betreibt, erfährt weiterhin
über den Buchstaben, wo er ist. Keine Information dieser Seite wird allein über Farbe vermittelt.</p>
<h2>Kontrast und Größe</h2>
<p>Der Fließtext ist 17 Pixel groß mit großzügigem Zeilenabstand, und alle Texte erfüllen die Kontraststufe AA der
WCAG 2.2. Jede Gemeindefarbe gibt es in zwei Fassungen: eine für Flächen und eine dunklere für den Fall, dass die
Farbe als Text auf hellem Grund erscheint. Navas Gelb wird nie als Schrift auf Weiß verwendet.</p>
<h2>Tastatur</h2>
<p>Alles ist mit der Tabulatortaste erreichbar, der Fokus ist stets als drei Pixel breite blaue Umrandung sichtbar,
und der erste Sprung auf der Seite führt direkt zum Inhalt. Schaltflächen und Links messen mindestens 44 Pixel,
so viel braucht ein Finger.</p>
<h2>Bewegung</h2>
<p>Wenn in Ihrem System «Bewegung reduzieren» aktiv ist, bewegt sich hier nichts. Keine automatischen Karussells,
keine aufspringenden Fenster, keine Videos, die von selbst starten.</p>
<h2>Screenreader</h2>
<p>Die Seiten verwenden Überschriften in der richtigen Reihenfolge, ausgezeichnete Regionen und Alternativtexte.
Das Schema der fünf Gemeinden hat eine geschriebene Beschreibung, denn eine unbeschriebene Karte ist eine Karte,
die ausschließt.</p>
<h2>Wenn etwas nicht funktioniert</h2>
<p>Schreiben Sie uns, und es wird behoben. Eine Barriere ist ein Programmierfehler, keine Meinungsfrage.</p>
`,
  },
  legal: {
    en: `
<h2>Who runs this</h2>
<p>This website is a local news project covering the councils of Piloña, Nava, Cabranes, Cabrales and Villaviciosa.
For anything to do with this site, write to the contact address given in the footer.</p>
<h2>Content and sources</h2>
<p>The pieces published here are written from scratch, based on information from public sources (official gazettes,
councils, public bodies) and from news media, which are named and linked explicitly at the foot of each piece. We do
not reproduce anyone else's text: we report the same fact in our own words. Where a third party's exact wording is
used, it appears in quotation marks and attributed to whoever said it, under the right of quotation in article 32 of
the Spanish Intellectual Property Act.</p>
<p>Before publication, every piece passes an automatic check that compares its text against the source and blocks
anything sharing runs of consecutive words with it.</p>
<h2>Images</h2>
<p>Photographs come from free-content repositories, chiefly Wikimedia Commons, and are published with the credit,
the licence and a link to the original beneath each image. We do not use photographs belonging to the media the
information came from, not even hotlinked from their servers. When no suitable free image exists, the site publishes
an illustration it generates itself, which is original work.</p>
<p>The typefaces used (Bricolage Grotesque, Inter and Martian Mono) are distributed under the SIL Open Font License 1.1,
which permits commercial use. The logo and the illustrations are original to this site.</p>
<h2>Taking content down</h2>
<p>If you hold rights over any content and feel its use here is not appropriate, write to the contact address and we
will remove or amend it without delay and without asking for explanations. The same applies if you are a news outlet
and would rather we stopped reading your feed.</p>
<h2>Data protection</h2>
<p>No personal data is collected beyond what you send voluntarily when subscribing to the newsletter (your email
address) or writing to us. That data is used only to send you the newsletter or to reply to you, is not passed to
third parties, and you may ask for its deletion at any time by writing to the contact address.</p>
<h2>Cookies</h2>
<p>We use technical cookies necessary for the site to work and to remember your preferences (night mode, for
example), which are stored only in your browser. If you accept, we also use third-party cookies for audience
measurement and advertising. You can change your mind by clearing this site's data in your browser.</p>
<h2>Advertising</h2>
<p>Advertising space and sponsored content are always identified as such. Advertising plays no part in choosing or
writing the news pieces.</p>
<h2>Liability</h2>
<p>Every care is taken over the accuracy of what is published, but information may contain errors or fall out of
date. Links to external sites are offered for information and imply no responsibility for their content.</p>
`,
    fr: `
<h2>Qui édite ce site</h2>
<p>Ce site est un projet d'information locale portant sur les communes de Piloña, Nava, Cabranes, Cabrales et
Villaviciosa. Pour toute question relative à ce site, écrivez à l'adresse de contact figurant en pied de page.</p>
<h2>Contenus et sources</h2>
<p>Les articles publiés sont des textes rédigés par nos soins, à partir d'informations de sources publiques
(bulletins officiels, mairies, organismes) et de médias, qui sont cités et liés explicitement au bas de chaque
article. Nous ne reproduisons pas le texte d'autrui : nous rapportons le même fait avec nos propres mots. Lorsqu'une
formulation exacte d'un tiers est reprise, elle est entre guillemets et attribuée à son auteur, au titre du droit de
citation de l'article 32 de la loi espagnole sur la propriété intellectuelle.</p>
<p>Avant publication, chaque article passe un contrôle automatique qui compare son texte à celui de la source et
bloque ceux qui partageraient des suites de mots avec elle.</p>
<h2>Images</h2>
<p>Les photographies proviennent de dépôts de contenu libre, principalement Wikimedia Commons, et sont publiées avec
le crédit, la licence et le lien vers l'original sous chaque image. Nous n'utilisons pas les photographies des médias
dont provient l'information, pas même en lien depuis leur serveur. Quand aucune image libre ne convient, le site
publie une illustration qu'il génère lui-même, et qui est une œuvre originale.</p>
<p>Les polices employées (Bricolage Grotesque, Inter et Martian Mono) sont distribuées sous licence SIL Open Font
License 1.1, qui autorise l'usage commercial. Le logotype et les illustrations sont une création propre à ce site.</p>
<h2>Retrait de contenus</h2>
<p>Si vous détenez des droits sur un contenu et estimez que son usage ici n'est pas approprié, écrivez à l'adresse de
contact : nous le retirerons ou le modifierons sans délai et sans demander d'explications. De même si vous êtes un
média et préférez que nous cessions de suivre votre fil d'actualité.</p>
<h2>Protection des données</h2>
<p>Aucune donnée personnelle n'est collectée en dehors de celles que vous envoyez volontairement en vous abonnant à
la lettre d'information (votre adresse électronique) ou en nous écrivant. Ces données servent uniquement à vous
envoyer la lettre ou à vous répondre, ne sont pas cédées à des tiers, et vous pouvez en demander la suppression à
tout moment en écrivant à l'adresse de contact.</p>
<h2>Cookies</h2>
<p>Nous utilisons des cookies techniques nécessaires au fonctionnement du site et à la mémorisation de vos
préférences (le mode nuit, par exemple), conservés uniquement dans votre navigateur. Si vous acceptez, nous
employons en outre des cookies tiers de mesure d'audience et de publicité. Vous pouvez revenir sur votre choix en
effaçant les données de ce site dans votre navigateur.</p>
<h2>Publicité</h2>
<p>Les espaces publicitaires et les contenus sponsorisés sont toujours identifiés comme tels. La publicité
n'intervient ni dans le choix ni dans la rédaction des articles d'information.</p>
<h2>Responsabilité</h2>
<p>Le plus grand soin est apporté à l'exactitude de ce qui est publié, mais l'information peut comporter des erreurs
ou vieillir. Les liens vers des sites externes sont fournis à titre indicatif et n'impliquent aucune responsabilité
quant à leur contenu.</p>
`,
    de: `
<h2>Verantwortlich</h2>
<p>Diese Website ist ein lokales Informationsprojekt über die Gemeinden Piloña, Nava, Cabranes, Cabrales und
Villaviciosa. Für alles, was diese Seite betrifft, schreiben Sie an die im Fußbereich angegebene Kontaktadresse.</p>
<h2>Inhalte und Quellen</h2>
<p>Die veröffentlichten Beiträge sind selbst verfasste Texte, erstellt auf Grundlage öffentlicher Quellen
(Amtsblätter, Gemeinden, Behörden) und von Medien, die am Fuß jedes Beitrags ausdrücklich genannt und verlinkt
werden. Wir geben keine fremden Texte wieder: Wir berichten denselben Sachverhalt mit eigenen Worten. Wird der
genaue Wortlaut eines Dritten übernommen, steht er in Anführungszeichen und wird dem Urheber zugeschrieben, gestützt
auf das Zitatrecht nach Artikel 32 des spanischen Urheberrechtsgesetzes.</p>
<p>Vor der Veröffentlichung durchläuft jeder Beitrag eine automatische Prüfung, die seinen Text mit der Quelle
vergleicht und alles blockiert, was zusammenhängende Wortfolgen mit ihr teilt.</p>
<h2>Bilder</h2>
<p>Die Fotografien stammen aus Repositorien freier Inhalte, vor allem Wikimedia Commons, und werden mit Urhebernennung,
Lizenz und Link zum Original unter jedem Bild veröffentlicht. Fotos der Medien, aus denen die Information stammt,
werden nicht verwendet, auch nicht von deren Server eingebunden. Gibt es kein geeignetes freies Bild, veröffentlicht
die Seite eine selbst erzeugte Illustration, die ein eigenes Werk ist.</p>
<p>Die verwendeten Schriften (Bricolage Grotesque, Inter und Martian Mono) stehen unter der SIL Open Font License 1.1,
die kommerzielle Nutzung erlaubt. Logo und Illustrationen sind eigene Schöpfungen dieser Seite.</p>
<h2>Entfernung von Inhalten</h2>
<p>Wenn Sie Rechte an einem Inhalt halten und seine Verwendung hier für unangemessen halten, schreiben Sie an die
Kontaktadresse: Wir entfernen oder ändern ihn unverzüglich und ohne Nachfragen. Dasselbe gilt, wenn Sie ein Medium
sind und lieber möchten, dass wir Ihren Nachrichtenkanal nicht mehr auswerten.</p>
<h2>Datenschutz</h2>
<p>Es werden keine personenbezogenen Daten erhoben außer denen, die Sie freiwillig beim Abonnieren des Newsletters
(Ihre E-Mail-Adresse) oder beim Schreiben an uns übermitteln. Diese Daten dienen ausschließlich dem Versand des
Newsletters oder der Antwort an Sie, werden nicht an Dritte weitergegeben, und Sie können ihre Löschung jederzeit
unter der Kontaktadresse verlangen.</p>
<h2>Cookies</h2>
<p>Wir verwenden technische Cookies, die für den Betrieb der Seite und das Merken Ihrer Einstellungen nötig sind
(etwa den Nachtmodus); sie werden nur in Ihrem Browser gespeichert. Wenn Sie zustimmen, setzen wir zusätzlich
Cookies Dritter zur Reichweitenmessung und für Werbung ein. Sie können Ihre Entscheidung ändern, indem Sie die Daten
dieser Seite in Ihrem Browser löschen.</p>
<h2>Werbung</h2>
<p>Werbeflächen und gesponserte Inhalte werden stets als solche gekennzeichnet. Werbung hat keinen Einfluss auf die
Auswahl oder die Abfassung der redaktionellen Beiträge.</p>
<h2>Haftung</h2>
<p>Auf die Richtigkeit des Veröffentlichten wird größte Sorgfalt verwendet, doch können Informationen Fehler
enthalten oder veralten. Links zu externen Seiten dienen der Information und begründen keine Verantwortung für
deren Inhalte.</p>
`,
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
      'Pon tu negocio delante de la gente de Piloña, Nava, Cabranes, Cabrales y Villaviciosa, cada mañana. Formatos, precios y cómo contratarlo.',
    url: '/anunciate/',
    tiempo,
    contenido: `<div class="contenedor">
  <section class="portico">
    <span class="rotulo" style="color:var(--tinta-3)">Para negocios de casa</span>
    <h1 style="max-width:15ch">Tu negocio, en el desayuno de tus vecinos</h1>
    <p style="max-width:56ch">La Prida se lee a primera hora, en casa y con el café. No competimos con la tele ni con el periódico de Oviedo: solo contamos lo de estos cinco concejos.</p>
  </section>

  <section class="datos">
    <div class="dato"><span class="dato__cifra">4</span><span class="dato__que">concejos: Piloña, Nava, Cabranes, Cabrales y Villaviciosa</span></div>
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
        descripcion: descripcionFija('quienes'),
        url: '/quienes-somos/',
        html: fija('quienes', QUIENES),
        activo: 'quienes-somos',
        cuentas,
      })
    );
    await escribir(
      'aviso-legal/index.html',
      paginaTexto({
        titulo: T('avisoLegal'),
        descripcion: descripcionFija('legal'),
        url: '/aviso-legal/',
        html: fija('legal', LEGAL),
        cuentas,
      })
    );

    await escribir(
      'accesibilidad/index.html',
      paginaTexto({
        titulo: T('accesibilidad'),
        descripcion: descripcionFija('accesibilidad'),
        url: '/accesibilidad/',
        html: fija('accesibilidad', ACCESIBILIDAD),
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
