#!/usr/bin/env node
// Genera el sitio estático de La Prida en dist/.  →  node build.mjs

import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { sitio, concejos, secciones, tarifas, anuncios, indexnow, titular, analitica } from './src/config.mjs';
import { idiomas, IDIOMA_BASE, slugSeccion, idiomaDe, ruta as rutaIdioma } from './src/idiomas.mjs';
import {
  pagina, portada, paginaConcejo, paginaSeccion, paginaArticulo, paginaTexto,
  filtrosAgenda, programasOficiales, tarjetaEmpleo, publicaTuOferta, dondeBuscarEmpleo,
  estado, T, U, tr, estaTraducida, nombreSeccion,
  itemAgenda, itemAviso, esc, fechaLarga, LOGO, pagina as marco,
  tarjetaAnuncio, filtrosTablon, publicaTuAnuncio, avisoTablon, anuncioVivo,
  tarjetaCurso, filtrosCursos, publicaTuCurso, dondeBuscarCursos, cursoAbierto,
} from './src/lib/plantillas.mjs';
import { esCurso } from './src/lib/eventos.mjs';
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
  await fs.writeFile(destino, destino.endsWith('.html') ? blindar(contenido) : contenido);
}

/* --- seguridad: política de contenidos ------------------------------------- */
//
// GitHub Pages no deja poner cabeceras HTTP propias. La Content-Security-Policy
// va entonces como <meta http-equiv>, que el navegador aplica igual salvo tres
// directivas (frame-ancestors, report-uri y sandbox), que solo valen en cabecera.
//
// La política se CALCULA mirando cada página ya escrita, no se escribe a mano:
//  · cada <script> en línea entra por su huella sha256; si alguien cambia una
//    coma del script del modo noche, la huella cambia sola y nada se rompe;
//  · cada origen externo que la página carga de verdad (Cloudflare, Google
//    Fonts o AdSense, si se encienden) entra por su nombre, y nada más;
//  · los bloques ld+json no se ejecutan, así que no necesitan huella.
//
// Si un día alguien consigue colar un <script> en una noticia, el navegador no
// lo ejecuta: no está en la lista. Es la segunda puerta, detrás del escapado.
const ORIGENES_EXTRA = {
  'static.cloudflareinsights.com': { connect: ['https://cloudflareinsights.com'] },
  'pagead2.googlesyndication.com': {
    // AdSense no está hecho para CSP estricta: carga de muchos dominios de Google.
    script: ['https://*.googlesyndication.com', 'https://*.doubleclick.net', 'https://*.google.com', 'https://*.gstatic.com', 'https://*.adtrafficquality.google'],
    img: ['https:'],
    frame: ['https://*.googlesyndication.com', 'https://*.doubleclick.net', 'https://*.google.com'],
    connect: ['https://*.googlesyndication.com', 'https://*.doubleclick.net', 'https://*.google.com', 'https://*.adtrafficquality.google'],
  },
};

function blindar(html) {
  const huellas = new Set();
  const scripts = new Set(["'self'"]);
  const estilos = new Set(["'self'"]);
  const fuentesTipo = new Set(["'self'"]);
  const conexiones = new Set(["'self'"]);
  const imagenes = new Set(["'self'"]);
  const marcos = new Set();
  const formularios = new Set();

  for (const [, attrs, cuerpo] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const src = /\bsrc=["']([^"']+)["']/i.exec(attrs)?.[1];
    if (src) {
      if (/^https?:\/\//i.test(src)) {
        const u = new URL(src);
        // El contador de Cloudflare se autoriza por su ruta exacta, no por todo
        // el dominio: es lo que recomienda Cloudflare y deja menos puerta abierta.
        scripts.add(u.host === 'static.cloudflareinsights.com' ? `${u.origin}${u.pathname}` : u.origin);
        const extra = ORIGENES_EXTRA[u.host];
        for (const o of extra?.script ?? []) scripts.add(o);
        for (const o of extra?.connect ?? []) conexiones.add(o);
        for (const o of extra?.img ?? []) imagenes.add(o);
        for (const o of extra?.frame ?? []) marcos.add(o);
      }
      continue;
    }
    if (/type=["']application\/(ld\+)?json["']/i.test(attrs)) continue;
    huellas.add(`'sha256-${crypto.createHash('sha256').update(cuerpo, 'utf8').digest('base64')}'`);
  }
  for (const [, href] of html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["'](https?:\/\/[^"']+)["']/gi)) {
    estilos.add(new URL(href).origin);
    if (new URL(href).host === 'fonts.googleapis.com') fuentesTipo.add('https://fonts.gstatic.com');
  }
  for (const [, accion] of html.matchAll(/<form\b[^>]*\baction=["'](https?:\/\/[^"']+)["']/gi)) {
    formularios.add(new URL(accion).origin);
  }
  if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html)) {
    // Un manejador en línea (onclick=…) no lo cubre ninguna huella. Mejor que
    // falle la construcción aquí que en el navegador del lector, en silencio.
    throw new Error('blindar(): la página lleva un manejador de eventos en línea (on…=). Pásalo a un <script>.');
  }

  const politica = [
    "default-src 'none'",
    `script-src ${[...scripts, ...huellas].join(' ')}`,
    // Los atributos style="" del diseño (colores de cada concejo) son en línea,
    // y no hay forma razonable de hacerles huella: se permiten SOLO en atributo.
    `style-src ${[...estilos].join(' ')}`,
    `style-src-elem ${[...estilos].join(' ')}`,
    "style-src-attr 'unsafe-inline'",
    `font-src ${[...fuentesTipo].join(' ')}`,
    `img-src ${[...imagenes].join(' ')}`,
    `connect-src ${[...conexiones].join(' ')}`,
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "worker-src 'none'",
    `frame-src ${marcos.size ? [...marcos].join(' ') : "'none'"}`,
    "base-uri 'none'",
    `form-action ${formularios.size ? [...formularios].join(' ') : "'none'"}`,
    'upgrade-insecure-requests',
  ].join('; ');

  const metas =
    `<meta http-equiv="Content-Security-Policy" content="${politica}">\n` +
    '<meta name="referrer" content="strict-origin-when-cross-origin">\n';
  // Justo detrás de <meta charset> (que debe quedar en los primeros 1024 bytes)
  // y antes de cualquier script: la política solo vale para lo que viene después.
  const m = /<meta charset=[^>]*>/i.exec(html) ?? /<head[^>]*>/i.exec(html);
  if (!m) return html;
  const fin = m.index + m[0].length;
  return html.slice(0, fin) + '\n' + metas + html.slice(fin);
}

/* --- qué se dibuja cuando no hay foto -------------------------------------- */
// El motivo sigue al asunto de la pieza; si no está claro, al carácter del concejo.
const MOTIVOS_TEMA = [
  [/\b(sidra|llagar\w*|escanci\w+|espicha|manzana\w*|pumar\w*|mayada|mayar)\b/i, 'pumarada'],
  [/\b(queso|cabrales|cueva\w*|urriellu|monta[ñn]a\w*|cumbre\w*|sotres|bulnes|picos|ganado|pasto\w*|puertos)\b/i, 'picos'],
  [/\b(r[ií]a|playa\w*|rodiles|tazones|marisma\w*|barco\w*|vela|mar|marea\w*)\b/i, 'ria'],
  [/\b(r[ií]o|caudal|salm[oó]n|pesca|valle\w*|h[oó]rreo\w*|sella|piloña)\b/i, 'valle'],
  [/\b(collada|cami[nñ]\w*|casta[ñn]\w*|senda\w*|ruta\w*|torazu|cabranes)\b/i, 'collada'],
];
const MOTIVO_CONCEJO = { pilona: 'valle', nava: 'pumarada', cabrales: 'picos', villaviciosa: 'ria', cabranes: 'collada' };

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

/**
 * Sitemap de noticias: SOLO lo publicado en las ultimas 48 horas.
 *
 * Es un fichero distinto del sitemap general y cumple otra funcion. El general
 * dice «esto es todo lo que hay»; este dice «esto acaba de pasar». Google lo
 * lee mucho mas a menudo, y es el formato que espera de un periodico. Fuera de
 * esa ventana de 48 horas una noticia deja de ser noticia, asi que el fichero
 * se vacia solo: no hay nada que limpiar ni que caduque a mano.
 *
 * Si no hay nada fresco NO se escribe un fichero vacio: se devuelve null y no
 * se publica. Un sitemap de noticias sin noticias es una promesa incumplida,
 * y es la clase de cosa por la que un buscador deja de fiarse de ti.
 */
function sitemapNoticias(piezas) {
  const HORAS = 48;
  const limite = Date.now() - HORAS * 60 * 60 * 1000;
  const frescas = piezas
    .filter((p) => {
      const t = new Date(p.fecha).getTime();
      return Number.isFinite(t) && t >= limite;
    })
    .slice(0, 250); // el protocolo admite 1000; nos sobra de largo

  if (!frescas.length) return null;

  const idiomaAntes = estado.idioma;
  const entradas = [];
  for (const idi of idiomas) {
    estado.idioma = idi.codigo;
    for (const p of frescas) {
      // Una entrada que dice <news:language>en</news:language> sobre un titular
      // en español es mentira, y a un buscador de noticias se le miente una vez.
      // Mientras la traducción esté caída, esas versiones simplemente no entran.
      if (!estaTraducida(p)) continue;
      entradas.push(`  <url>
    <loc>${esc(sitio.url + rutaIdioma(idi.codigo, p.url))}</loc>
    <news:news>
      <news:publication>
        <news:name>${esc(sitio.nombre)}</news:name>
        <news:language>${esc(idi.codigo)}</news:language>
      </news:publication>
      <news:publication_date>${new Date(p.fecha).toISOString()}</news:publication_date>
      <news:title>${esc(tr(p, 'titular'))}</news:title>
    </news:news>
  </url>`);
    }
  }
  estado.idioma = idiomaAntes;

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entradas.join('\n')}
</urlset>`;
}

/**
 * IndexNow: avisar a los buscadores en cuanto sale una edicion.
 *
 * Publicamos tres veces al dia; los buscadores pasan cuando les parece. Este
 * protocolo abierto —Bing, Yandex, Seznam y otros— invierte el sentido: en vez
 * de esperar a que vengan, se les avisa. Es gratis y no aniade dependencias:
 * una clave en un fichero de texto en la raiz y una peticion HTTP.
 *
 * Aqui solo se PREPARA el aviso. Quien lo envia es el propio GitHub Action,
 * despues de desplegar, porque antes de eso las direcciones todavia no existen
 * y avisar de una pagina que aun no esta publicada es peor que no avisar.
 *
 * El fichero del sobre se escribe FUERA de dist/ a proposito: es papeleo
 * interno, no forma parte del periodico.
 */
function sobreIndexNow(piezas) {
  const clave = (indexnow?.clave ?? '').trim();
  if (!clave) return null;

  const HORAS = 48;
  const limite = Date.now() - HORAS * 60 * 60 * 1000;
  const host = sitio.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const direcciones = new Set();
  for (const idi of idiomas) direcciones.add(sitio.url + rutaIdioma(idi.codigo, '/'));
  const idiomaAntes = estado.idioma;
  for (const p of piezas) {
    const t = new Date(p.fecha).getTime();
    if (!Number.isFinite(t) || t < limite) continue;
    for (const idi of idiomas) {
      estado.idioma = idi.codigo;
      // Mismo criterio que el sitemap de noticias: no se invita a nadie a una
      // página que todavía enseña el titular en español.
      if (!estaTraducida(p)) continue;
      direcciones.add(sitio.url + rutaIdioma(idi.codigo, p.url));
    }
  }
  estado.idioma = idiomaAntes;

  return {
    host,
    key: clave,
    keyLocation: `${sitio.url}/${clave}.txt`,
    urlList: [...direcciones].slice(0, 10000),
  };
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
<p>Hoy el sitio no lleva publicidad. El plan es sostenerlo con publicidad y patrocinios de negocios de la zona; cuando los haya, los espacios patrocinados irán
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
<p>El texto base es de 17 píxeles con interlínea larga, el menú va a 17 y <strong>ningún texto de este sitio baja
de 12,5 píxeles</strong>: ni los rótulos, ni las fechas, ni la letra pequeña, que aquí no es pequeña. Todos los
textos cumplen el contraste AA de las pautas WCAG 2.2, comprobado de día y de noche. Cada color de concejo tiene dos versiones: una para rellenos y otra, más oscura, para cuando ese color
es texto sobre fondo claro. El amarillo de Nava nunca se usa como letra sobre blanco.</p>
<h2>Nada escondido en el móvil</h2>
<p>En pantalla estrecha el menú y la línea de concejos no se arrastran de lado: se doblan en dos filas. Arrastrar
esconde apartados, y un apartado escondido no existe para quien no sabe que puede arrastrar. Se ven los ocho
apartados y los cinco concejos de un vistazo.</p>
<h2>Teclado</h2>
<p>Todo se puede recorrer con el tabulador, el foco se ve siempre con un contorno azul de tres píxeles, y el
primer salto de la página te lleva directo al contenido. Los botones y enlaces miden al menos 44 píxeles, que es
lo que pide un dedo: está comprobado uno a uno, no dicho de boquilla. La única excepción son los enlaces que van
dentro de una frase, que no se pueden agrandar sin romper el renglón.</p>
<h2>Movimiento</h2>
<p>Si tienes activado «reducir movimiento» en tu sistema, aquí no se mueve nada. No hay carruseles automáticos,
ni ventanas que salten, ni vídeos que arranquen solos.</p>
<h2>Lectores de pantalla</h2>
<p>Las páginas usan encabezados en orden, regiones marcadas y textos alternativos. El esquema de los cinco
concejos lleva una descripción escrita, porque un mapa sin describir es un mapa que excluye.</p>
<h2>Si algo falla</h2>
<p>Escríbenos y se arregla. Una barrera de accesibilidad es un error de programación, no una opinión.</p>
`;

/**
 * Los terceros que reciben la IP del lector, contados segun lo que el sitio
 * HACE en este momento, no segun lo que hacia cuando se escribio el texto.
 *
 * Si las tipografias ya se sirven desde aqui, el parrafo de Google desaparece
 * solo. Si el contador esta apagado, el de Cloudflare tampoco se escribe. Y si
 * no queda ninguno, se dice que no sale nada — que es la mejor noticia posible
 * y hay que poder darla.
 *
 * Regla 0 del proyecto: la pagina legal describe la realidad, y la realidad
 * cambia cuando cambia el codigo, no cuando alguien se acuerda de reescribirla.
 */
function bloqueTerceros(idioma) {
  const google = !estado.fuentesPropias;
  const cloudflare = Boolean((analitica?.token ?? '').trim());

  const P = {
    es: {
      h: 'Lo que sí sale de aquí',
      intro: '<p>Al abrir una página se cargan estos servicios externos, y a todos les llega tu dirección IP. Lo contamos porque es verdad y porque preferimos decirlo a que lo descubras tú.</p>',
      intro1: '<p>Solo se carga un servicio externo, y recibe tu dirección IP. Lo contamos porque es verdad y porque preferimos decirlo a que lo descubras tú.</p>',
      nada: '<p><strong>No se carga ningún servicio externo.</strong> Las tipografías se sirven desde este mismo sitio y no hay medición de audiencia. Tu navegador no habla con nadie más que con nosotros.</p>',
      propias: '<p>Las letras del diario <strong>se sirven desde este mismo sitio</strong>. No se piden a Google ni a ningún tercero, así que nadie de fuera recibe tu IP por este motivo. Las tres familias están bajo licencia SIL Open Font License 1.1, que permite redistribuirlas.</p>',
      gf: '<p><strong>Google Fonts.</strong> Las letras del diario se piden a los servidores de Google cada vez que abres una página, así que Google recibe tu IP. No se instala ninguna cookie ni se te sigue por otros sitios. Estamos trabajando en servir esas mismas letras desde aquí, que es gratis y legal, y cuando esté hecho este párrafo desaparecerá.</p>',
      cf: '<p><strong>Cloudflare Web Analytics.</strong> El sitio cuenta cuántas visitas recibe y qué páginas se leen. <strong>Sin cookies y sin identificar a nadie:</strong> no se usa huella digital del navegador, no se sigue a la misma persona entre sitios ni entre visitas, y no se guardan datos que permitan reconocerte. Lo que sí ocurre es que la petición al servidor de Cloudflare lleva tu IP, como cualquier petición a cualquier servidor. Sirve para saber si esto lo lee alguien y en qué idioma; nada más.</p>',
    },
    en: {
      h: 'What does leave this site',
      intro: '<p>Opening a page loads these external services, and all of them receive your IP address. We say so because it is true and because we would rather tell you than have you find out.</p>',
      intro1: '<p>Only one external service is loaded, and it receives your IP address. We say so because it is true and because we would rather tell you than have you find out.</p>',
      nada: '<p><strong>No external service is loaded.</strong> The typefaces are served from this site and there is no audience measurement. Your browser talks to nobody but us.</p>',
      propias: '<p>The paper\'s typefaces <strong>are served from this site</strong>. They are not requested from Google or any third party, so nobody outside receives your IP on that account. All three families are under the SIL Open Font License 1.1, which permits redistribution.</p>',
      gf: '<p><strong>Google Fonts.</strong> The typefaces are requested from Google\'s servers every time you open a page, so Google receives your IP. No cookie is set and you are not tracked across sites. We are working on serving those same fonts from here, which is free and lawful, and this paragraph will go when it is done.</p>',
      cf: '<p><strong>Cloudflare Web Analytics.</strong> The site counts how many visits it gets and which pages are read. <strong>No cookies and no identification:</strong> no browser fingerprinting, no tracking of the same person across sites or visits, and nothing stored that could recognise you. What does happen is that the request to Cloudflare\'s server carries your IP, as any request to any server does. It exists to tell us whether anyone is reading this, and in which language. Nothing else.</p>',
    },
    fr: {
      h: "Ce qui sort d'ici",
      intro: "<p>L'ouverture d'une page charge ces services externes, et tous reçoivent votre adresse IP. Nous le disons parce que c'est vrai et parce que nous préférons vous le dire.</p>",
      intro1: "<p>Un seul service externe est chargé, et il reçoit votre adresse IP. Nous le disons parce que c'est vrai et parce que nous préférons vous le dire.</p>",
      nada: "<p><strong>Aucun service externe n'est chargé.</strong> Les polices sont servies depuis ce site et il n'y a pas de mesure d'audience. Votre navigateur ne dialogue avec personne d'autre que nous.</p>",
      propias: "<p>Les polices du journal <strong>sont servies depuis ce site</strong>. Elles ne sont demandées ni à Google ni à un tiers : personne à l'extérieur ne reçoit votre IP de ce fait. Les trois familles sont sous licence SIL Open Font License 1.1, qui autorise la redistribution.</p>",
      gf: "<p><strong>Google Fonts.</strong> Les polices sont demandées aux serveurs de Google à chaque page : Google reçoit donc votre IP. Aucun cookie n'est déposé et vous n'êtes pas suivi d'un site à l'autre. Nous travaillons à servir ces mêmes polices depuis ici, ce qui est gratuit et légal ; ce paragraphe disparaîtra alors.</p>",
      cf: "<p><strong>Cloudflare Web Analytics.</strong> Le site compte les visites et les pages lues. <strong>Sans cookies et sans identification :</strong> pas d'empreinte du navigateur, pas de suivi d'une même personne entre sites ou entre visites, rien de conservé qui permette de vous reconnaître. En revanche, la requête vers le serveur de Cloudflare transporte votre IP, comme toute requête vers tout serveur. Cela sert à savoir si quelqu'un lit ce journal, et dans quelle langue. Rien d'autre.</p>",
    },
    de: {
      h: 'Was diese Seite verlässt',
      intro: '<p>Beim Öffnen einer Seite werden diese externen Dienste geladen, und alle erhalten Ihre IP-Adresse. Wir sagen es, weil es stimmt und weil wir es lieber selbst sagen.</p>',
      intro1: '<p>Es wird nur ein externer Dienst geladen, und er erhält Ihre IP-Adresse. Wir sagen es, weil es stimmt und weil wir es lieber selbst sagen.</p>',
      nada: '<p><strong>Es wird kein externer Dienst geladen.</strong> Die Schriften werden von dieser Seite ausgeliefert, und es gibt keine Reichweitenmessung. Ihr Browser spricht mit niemandem außer uns.</p>',
      propias: '<p>Die Schriften der Zeitung <strong>werden von dieser Seite ausgeliefert</strong>. Sie werden weder bei Google noch bei Dritten angefordert, also erhält dadurch niemand von außen Ihre IP. Alle drei Familien stehen unter der SIL Open Font License 1.1, die die Weitergabe erlaubt.</p>',
      gf: '<p><strong>Google Fonts.</strong> Die Schriften werden bei jedem Seitenaufruf von Googles Servern geholt, Google erhält also Ihre IP. Es wird kein Cookie gesetzt und Sie werden nicht seitenübergreifend verfolgt. Wir arbeiten daran, dieselben Schriften von hier auszuliefern, was kostenlos und zulässig ist; dieser Absatz entfällt dann.</p>',
      cf: '<p><strong>Cloudflare Web Analytics.</strong> Die Seite zählt, wie viele Besuche sie erhält und welche Seiten gelesen werden. <strong>Ohne Cookies und ohne Identifizierung:</strong> kein Browser-Fingerprinting, keine Verfolgung derselben Person über Seiten oder Besuche hinweg, nichts gespeichert, woran man Sie erkennen könnte. Die Anfrage an den Cloudflare-Server trägt allerdings Ihre IP, wie jede Anfrage an jeden Server. Sie dient der Frage, ob das hier jemand liest, und in welcher Sprache. Mehr nicht.</p>',
    },
  };
  const x = P[idioma] ?? P.es;
  const partes = [];
  if (google) partes.push(x.gf);
  if (cloudflare) partes.push(x.cf);

  if (!partes.length) return `<h2>${x.h}</h2>\n${x.nada}`;

  // Las tipografias propias NO son un tercero: son lo contrario. Por eso van
  // antes del encabezado de la lista, no dentro de ella. Y el encabezado
  // concuerda en numero con lo que de verdad se carga: decir «estos servicios
  // externos» cuando solo queda uno es falso, y esta pagina no puede tener ni
  // una frase falsa.
  const casa = google ? '' : `${x.propias}\n`;
  const intro = partes.length === 1 ? x.intro1 : x.intro;
  return `<h2>${x.h}</h2>\n${casa}${intro}\n${partes.join('\n')}`;
}

/**
 * El bloque de titularidad, que la ley exige y que no se puede inventar.
 *
 * Si los datos no están puestos, la página NO finge que lo estén: dice que
 * faltan. Reconocer una falta es mejor que taparla, y ademas obliga a mirarla.
 * La compilación, además, avisa en amarillo (ver avisarSiFaltaElTitular).
 */
function bloqueTitular(idioma) {
  const t = titular ?? {};
  const completo = [t.nombre, t.nif, t.domicilio].every((x) => String(x ?? '').trim());
  const correo = String(t.correo ?? sitio.email ?? '').trim();

  const T = {
    es: {
      h: 'Titularidad',
      datos: `<p><strong>${esc(t.nombre)}</strong><br>NIF: ${esc(t.nif)}<br>${esc(t.domicilio)}<br>Correo: <a href="mailto:${esc(correo)}">${esc(correo)}</a></p>`,
      falta: `<p><strong>Los datos identificativos del titular todavía no están publicados.</strong> La ley obliga a que figuren aquí el nombre o razón social, el NIF y el domicilio de quien edita este sitio. Se están tramitando y aparecerán en este mismo apartado. Mientras tanto, para cualquier asunto relacionado con esta web, incluida una reclamación, escribe a <a href="mailto:${esc(correo)}">${esc(correo)}</a>.</p>`,
      que: '<p>Este sitio es un proyecto de información local sobre los concejos de Piloña, Nava, Cabranes, Cabrales y Villaviciosa.</p>',
    },
    en: {
      h: 'Who runs this',
      datos: `<p><strong>${esc(t.nombre)}</strong><br>Tax ID: ${esc(t.nif)}<br>${esc(t.domicilio)}<br>Email: <a href="mailto:${esc(correo)}">${esc(correo)}</a></p>`,
      falta: `<p><strong>The publisher's identification details are not published yet.</strong> Spanish law requires the name or company name, tax number and address of whoever runs this site to appear here. They are being processed and will appear in this section. In the meantime, for anything to do with this site, including a complaint, write to <a href="mailto:${esc(correo)}">${esc(correo)}</a>.</p>`,
      que: '<p>This site is a local news project covering the municipalities of Piloña, Nava, Cabranes, Cabrales and Villaviciosa.</p>',
    },
    fr: {
      h: 'Éditeur du site',
      datos: `<p><strong>${esc(t.nombre)}</strong><br>NIF : ${esc(t.nif)}<br>${esc(t.domicilio)}<br>Courriel : <a href="mailto:${esc(correo)}">${esc(correo)}</a></p>`,
      falta: `<p><strong>Les mentions légales de l'éditeur ne sont pas encore publiées.</strong> La loi espagnole impose d'indiquer ici le nom ou la raison sociale, le numéro fiscal et l'adresse de l'éditeur. Ces données sont en cours et figureront dans cette rubrique. En attendant, pour toute question concernant ce site, y compris une réclamation, écrivez à <a href="mailto:${esc(correo)}">${esc(correo)}</a>.</p>`,
      que: "<p>Ce site est un projet d'information locale sur les communes de Piloña, Nava, Cabranes, Cabrales et Villaviciosa.</p>",
    },
    de: {
      h: 'Anbieterkennzeichnung',
      datos: `<p><strong>${esc(t.nombre)}</strong><br>Steuernummer: ${esc(t.nif)}<br>${esc(t.domicilio)}<br>E-Mail: <a href="mailto:${esc(correo)}">${esc(correo)}</a></p>`,
      falta: `<p><strong>Die Angaben zum Anbieter sind noch nicht veröffentlicht.</strong> Das spanische Recht verlangt hier Name oder Firma, Steuernummer und Anschrift des Betreibers. Sie werden gerade eingetragen und erscheinen an dieser Stelle. Bis dahin richten Sie bitte alle Anliegen, auch Beschwerden, an <a href="mailto:${esc(correo)}">${esc(correo)}</a>.</p>`,
      que: '<p>Diese Seite ist ein lokales Nachrichtenprojekt über die Gemeinden Piloña, Nava, Cabranes, Cabrales und Villaviciosa.</p>',
    },
  };
  const x = T[idioma] ?? T.es;
  return `<h2>${x.h}</h2>\n${x.que}\n${completo ? x.datos : x.falta}`;
}

/**
 * Regla 0 del proyecto: la ley se cumple, y si algo falta se dice en voz alta.
 * Un aviso legal incompleto no puede pasar desapercibido en una compilacion.
 */
function avisarSiFaltaElTitular() {
  const t = titular ?? {};
  if ([t.nombre, t.nif, t.domicilio].every((x) => String(x ?? '').trim())) return;
  const m =
    'El aviso legal NO identifica al titular (nombre, NIF y domicilio). Es obligatorio ' +
    'por la LSSI art. 10 y por el RGPD. Se rellena en `titular` de src/config.mjs.';
  console.warn(`\n⚠︎  ${m}\n`);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Aviso legal incompleto::${m}`);
}

const LEGAL = `
<h2>Contenidos y fuentes</h2>
<p>Las piezas publicadas son textos de elaboración propia, redactados a partir de información de fuentes públicas
(boletines oficiales, ayuntamientos, organismos) y de medios de comunicación, que se citan y enlazan de forma
expresa al pie de cada pieza. No se reproducen textos ajenos: se informa del mismo hecho con redacción propia.
Cuando se recoge una expresión textual de un tercero, va entrecomillada y atribuida a quien la dijo, al amparo
del derecho de cita del artículo 32 de la Ley de Propiedad Intelectual.</p>
<p>Antes de publicarse, cada pieza pasa un control automático que compara su texto con el de la fuente y bloquea
las que compartan frases seguidas con ella.</p>

<h2>Fotografías e ilustraciones</h2>
<p>Las fotografías proceden de repositorios de contenido libre, principalmente Wikimedia Commons, y se usan solo
bajo licencias que lo permiten: <strong>dominio público, CC0, CC BY y CC BY-SA</strong>. Al pie de cada foto se
indica quién la hizo, con qué licencia y de dónde sale, y la licencia enlaza a su texto legal para que cualquiera
pueda comprobarlo.</p>
<p>Las fotos se descargan redimensionadas a 1.600 píxeles de ancho, y por eso se advierte al pie de que la imagen
se ha modificado de tamaño respecto al original.</p>
<p><strong>No se usan fotografías con licencia NC (no comercial) ni ND (sin obra derivada).</strong> Las primeras
porque este diario tiene espacios de pago y eso lo convierte en un uso comercial; las segundas porque redimensionar
la imagen ya es modificarla. Tampoco se utilizan fotografías de los medios de los que procede la información, ni
siquiera enlazadas desde su servidor.</p>
<p>Cuando no hay ninguna imagen libre adecuada, se publica una ilustración generada por el propio sitio, que es obra
original. El logotipo y las ilustraciones son creación original de este sitio. Las tipografías empleadas (Bricolage
Grotesque, Inter y Martian Mono) se distribuyen bajo licencia SIL Open Font License 1.1, que permite el uso comercial.</p>

<h2>Retirada de contenidos</h2>
<p>Si eres titular de derechos sobre algún contenido y consideras que su uso aquí no es adecuado, escríbenos a la
dirección de contacto y lo retiraremos o modificaremos sin demora y sin pedir explicaciones. Lo mismo si eres un
medio y prefieres que dejemos de recoger tu canal de noticias. Si detectas una foto mal acreditada, igual.</p>

<h2>Protección de datos</h2>
<p><strong>Responsable del tratamiento:</strong> quien figura en el apartado de titularidad de esta misma página.</p>
<p><strong>Qué datos se recogen y para qué.</strong> Solo los que envías voluntariamente: tu dirección de correo si
te suscribes al boletín, y los datos que incluyas si nos escribes o si mandas un anuncio al tablón. Se usan
únicamente para enviarte el boletín, para responderte o para publicar y gestionar tu anuncio.</p>
<p><strong>Base jurídica.</strong> Tu consentimiento, que das al enviarlos y que puedes retirar cuando quieras.</p>
<p><strong>Cuánto tiempo.</strong> El correo del boletín, mientras sigas suscrito; los anuncios del tablón, mientras
estén vigentes y hasta un año después; los correos de contacto, el tiempo necesario para atender el asunto.</p>
<p><strong>A quién se ceden.</strong> A nadie. No se venden, no se alquilan y no se comparten con terceros para
publicidad. El correo se gestiona con un proveedor de correo electrónico, que actúa como encargado del tratamiento.</p>
<p><strong>Tus derechos.</strong> Puedes solicitar el <strong>acceso</strong> a tus datos, su <strong>rectificación</strong>,
su <strong>supresión</strong>, la <strong>limitación</strong> del tratamiento, la <strong>portabilidad</strong> y
<strong>oponerte</strong> a él, escribiendo a la dirección de contacto. Si crees que no se han atendido, puedes
reclamar ante la <strong>Agencia Española de Protección de Datos</strong> (<a href="https://www.aepd.es" target="_blank" rel="noopener">aepd.es</a>).</p>
<p>No se elaboran perfiles ni se toman decisiones automatizadas sobre personas.</p>

<h2>Cookies</h2>
<p><strong>Este sitio no usa cookies.</strong> Lo único que se guarda en tu navegador es si prefieres el modo noche.
Es una preferencia que pides tú, se queda en tu equipo, no viaja a ningún servidor, no identifica a nadie y la borras
vaciando los datos del sitio. Por eso no verás un aviso pidiéndote permiso para cookies: no hay ninguna que consentir.</p>

<!--TERCEROS-->

<h2>El tablón de anuncios</h2>
<p>Los anuncios del tablón los envían vecinos y negocios de los cinco concejos, y se publican tras revisarlos.
La Prida <strong>no es parte del trato ni cobra comisión</strong>: publica el anuncio, no verifica lo anunciado
ni interviene en la compraventa. La responsabilidad de lo que se anuncia es de quien lo anuncia, que debe
poder ser identificado y cumplir lo que le exija la ley según lo que ofrezca: en la venta o el alquiler de
vivienda, por ejemplo, la etiqueta de eficiencia energética es obligatoria y sin ella el anuncio no se publica.</p>
<p><strong>Los datos de contacto del anunciante no se publican</strong> ni se guardan junto al anuncio: quien esté
interesado escribe al diario indicando la referencia del anuncio y se lo hacemos llegar a quien lo puso.</p>
<p>No publicamos direcciones postales ni referencias catastrales. Cualquiera puede pedir que se retire su
anuncio escribiendo a la dirección de contacto, y retiramos sin demora el que nos conste falso, fraudulento
o contrario a la ley.</p>

<h2>Publicidad</h2>
<p><strong>Hoy no hay publicidad en el sitio.</strong> Cuando la haya, los espacios de pago y los contenidos
patrocinados se identificarán siempre como tales, y la publicidad no intervendrá en la selección ni en la
redacción de las piezas informativas. Si alguna vez enlazamos algo por lo que cobremos comisión, lo dirá el
propio enlace.</p>

<h2>Responsabilidad</h2>
<p>Se pone el máximo cuidado en la exactitud de lo publicado, pero la información puede contener errores o quedar
desactualizada. Los enlaces a sitios externos se ofrecen a título informativo y no implican responsabilidad
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
<p>There is no advertising on the site today. The plan is to pay for it with advertising and sponsorship from local businesses; when there is any, sponsored slots will be
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
<p>Le site ne comporte aujourd'hui aucune publicité. L'objectif est de le financer par la publicité et le parrainage de commerces d'ici ; le cas échéant, les emplacements sponsorisés seront
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
<p>Derzeit gibt es auf der Seite keine Werbung. Geplant ist die Finanzierung über Werbung und Sponsoring von Betrieben aus der Gegend.
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
<h2>Nothing hidden on a phone</h2>
<p>On a narrow screen the menu and the line of councils do not scroll sideways: they fold onto two rows. Scrolling
hides sections, and a hidden section does not exist for someone who does not know they can scroll. All eight
sections and all five councils are visible at a glance.</p>
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
<h2>Rien de caché sur un téléphone</h2>
<p>Sur écran étroit, le menu et la ligne des communes ne défilent pas latéralement : ils se replient sur deux
rangées. Faire défiler cache des rubriques, et une rubrique cachée n'existe pas pour qui ignore qu'on peut faire
défiler. Les huit rubriques et les cinq communes se voient d'un coup d'œil.</p>
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
<h2>Nichts versteckt auf dem Handy</h2>
<p>Auf schmalem Bildschirm scrollen Menü und Gemeindelinie nicht zur Seite, sondern brechen auf zwei Zeilen um.
Scrollen versteckt Rubriken, und eine versteckte Rubrik existiert nicht für jemanden, der nicht weiß, dass man
scrollen kann. Alle acht Rubriken und alle fünf Gemeinden sind auf einen Blick zu sehen.</p>
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
<h2>Content and sources</h2>
<p>The pieces published here are written from scratch, based on information from public sources (official gazettes,
councils, public bodies) and from news media, which are cited and linked at the foot of each piece. We do not
reproduce other people's text: we report the same fact in our own words. Direct quotations appear in quotation
marks and attributed, under the right of quotation of article 32 of the Spanish Intellectual Property Act.</p>
<p>Before publication, every piece goes through an automatic check that compares it with the source and blocks
anything sharing consecutive phrases with it.</p>

<h2>Photographs and illustrations</h2>
<p>Photographs come from free-content repositories, mainly Wikimedia Commons, and are used only under licences that
allow it: <strong>public domain, CC0, CC BY and CC BY-SA</strong>. Under each photo we state who took it, under which
licence and where it comes from, and the licence links to its legal text so anyone can check.</p>
<p>Photos are downloaded resized to 1,600 pixels wide, which is why the caption says the image has been resized.</p>
<p><strong>No NC (non-commercial) or ND (no derivatives) licences are used.</strong> The first because this paper has
paid slots, which makes it a commercial use; the second because resizing already modifies the image. We do not use
photographs belonging to the media we take information from, not even hotlinked.</p>
<p>When there is no suitable free image, the site publishes its own generated illustration, which is original work.
The logo and the illustrations are original to this site. The typefaces (Bricolage Grotesque, Inter and Martian Mono)
are distributed under the SIL Open Font License 1.1, which allows commercial use.</p>

<h2>Takedown</h2>
<p>If you hold rights over any content and consider its use here inappropriate, write to the contact address and we
will remove or amend it without delay and without asking for explanations. The same applies if you are a news outlet
and would rather we stopped reading your feed, or if you spot a wrongly credited photo.</p>

<h2>Data protection</h2>
<p><strong>Controller:</strong> the person or company named in the publisher section of this page.</p>
<p><strong>What we collect and why.</strong> Only what you send voluntarily: your email address if you subscribe to
the newsletter, and whatever you include if you write to us or send an ad to the noticeboard. It is used only to send
you the newsletter, to reply to you, or to publish and manage your ad.</p>
<p><strong>Legal basis.</strong> Your consent, given when you send it and withdrawable at any time.</p>
<p><strong>How long.</strong> The newsletter address, for as long as you stay subscribed; noticeboard ads, while they
are live and for up to a year afterwards; contact emails, as long as needed to deal with the matter.</p>
<p><strong>Who it is shared with.</strong> Nobody. It is not sold, rented or shared with third parties for advertising.
Email is handled through an email provider acting as a processor.</p>
<p><strong>Your rights.</strong> You may request <strong>access</strong> to your data, its <strong>rectification</strong>,
<strong>erasure</strong>, <strong>restriction</strong> of processing, <strong>portability</strong>, and you may
<strong>object</strong> to processing, by writing to the contact address. If you believe your request was not handled,
you may complain to the Spanish Data Protection Agency
(<a href="https://www.aepd.es" target="_blank" rel="noopener">aepd.es</a>).</p>
<p>No profiling and no automated decision-making about people takes place.</p>

<h2>Cookies</h2>
<p><strong>This site uses no cookies.</strong> The only thing stored in your browser is whether you prefer dark mode.
You ask for it yourself, it stays on your device, it never travels to any server, it identifies nobody, and you clear
it by clearing the site data. That is why you will not see a cookie consent banner: there is nothing to consent to.</p>

<!--TERCEROS-->

<h2>The noticeboard</h2>
<p>Noticeboard ads are sent in by residents and businesses of the five municipalities and published after review.
La Prida <strong>is not a party to the deal and takes no commission</strong>: it publishes the ad, it does not verify
what is advertised and does not take part in the sale. Responsibility for what is advertised lies with whoever
advertises it, who must be identifiable and must comply with whatever the law requires: for the sale or letting of
housing, for instance, the energy efficiency certificate is mandatory and without it the ad is not published.</p>
<p><strong>The advertiser's contact details are not published</strong> or stored with the ad: anyone interested writes
to the paper quoting the ad's reference, and we pass the message on to whoever placed it.</p>
<p>We do not publish postal addresses or land registry references. Anyone may ask for their ad to be taken down by
writing to the contact address, and we remove without delay anything we know to be false, fraudulent or unlawful.</p>

<h2>Advertising</h2>
<p><strong>There is no advertising on the site today.</strong> When there is, paid slots and sponsored content will
always be marked as such, and advertising will play no part in choosing or writing the news. If we ever link to
something we earn a commission on, the link itself will say so.</p>

<h2>Liability</h2>
<p>Every care is taken over the accuracy of what is published, but information may contain errors or become out of
date. Links to external sites are offered for information and imply no responsibility for their content.</p>`,
    fr: `
<h2>Contenus et sources</h2>
<p>Les articles publiés sont rédigés par nous, à partir d'informations de sources publiques (journaux officiels,
mairies, organismes) et de médias, cités et liés au bas de chaque article. Nous ne reproduisons pas le texte
d'autrui : nous rapportons le même fait avec nos propres mots. Les citations littérales figurent entre guillemets
et attribuées, au titre du droit de citation de l'article 32 de la loi espagnole sur la propriété intellectuelle.</p>
<p>Avant publication, chaque article passe un contrôle automatique qui le compare à la source et bloque ce qui
partagerait des phrases entières avec elle.</p>

<h2>Photographies et illustrations</h2>
<p>Les photographies proviennent de dépôts de contenu libre, principalement Wikimedia Commons, et ne sont utilisées
que sous licences qui l'autorisent : <strong>domaine public, CC0, CC BY et CC BY-SA</strong>. Sous chaque photo
figurent l'auteur, la licence et l'origine, et la licence renvoie à son texte légal pour que chacun puisse vérifier.</p>
<p>Les photos sont téléchargées redimensionnées à 1 600 pixels de large, ce qui est signalé sous l'image.</p>
<p><strong>Aucune licence NC (non commerciale) ni ND (sans modification) n'est utilisée.</strong> Les premières parce
que ce journal comporte des emplacements payants, ce qui en fait un usage commercial ; les secondes parce que
redimensionner, c'est déjà modifier. Nous n'utilisons pas les photographies des médias dont provient l'information,
même pas en lien direct.</p>
<p>À défaut d'image libre adaptée, le site publie sa propre illustration, œuvre originale. Le logo et les illustrations
sont des créations originales de ce site. Les polices (Bricolage Grotesque, Inter et Martian Mono) sont distribuées
sous licence SIL Open Font License 1.1, qui autorise l'usage commercial.</p>

<h2>Retrait de contenus</h2>
<p>Si vous détenez des droits sur un contenu et estimez que son usage ici n'est pas approprié, écrivez à l'adresse de
contact : nous le retirerons ou le modifierons sans délai et sans demander d'explications. De même si vous êtes un
média et préférez que nous cessions de suivre votre flux, ou si vous repérez une photo mal créditée.</p>

<h2>Protection des données</h2>
<p><strong>Responsable du traitement :</strong> la personne ou la société indiquée dans la rubrique « Éditeur du site »
de cette page.</p>
<p><strong>Quelles données et pourquoi.</strong> Uniquement celles que vous envoyez volontairement : votre adresse
électronique si vous vous abonnez à la lettre d'information, et ce que vous indiquez si vous nous écrivez ou déposez
une annonce. Elles servent seulement à vous envoyer la lettre, à vous répondre ou à publier et gérer votre annonce.</p>
<p><strong>Base juridique.</strong> Votre consentement, donné lors de l'envoi et révocable à tout moment.</p>
<p><strong>Durée.</strong> L'adresse de la lettre d'information, tant que vous restez abonné ; les annonces, tant
qu'elles sont en cours et jusqu'à un an après ; les courriels, le temps nécessaire au traitement de la demande.</p>
<p><strong>Destinataires.</strong> Personne. Vos données ne sont ni vendues, ni louées, ni transmises à des tiers à des
fins publicitaires. Le courrier électronique passe par un prestataire agissant comme sous-traitant.</p>
<p><strong>Vos droits.</strong> Vous pouvez demander l'<strong>accès</strong> à vos données, leur
<strong>rectification</strong>, leur <strong>effacement</strong>, la <strong>limitation</strong> du traitement, la
<strong>portabilité</strong>, et vous <strong>opposer</strong> au traitement, en écrivant à l'adresse de contact. Si
vous estimez ne pas avoir été entendu, vous pouvez saisir l'Agence espagnole de protection des données
(<a href="https://www.aepd.es" target="_blank" rel="noopener">aepd.es</a>).</p>
<p>Aucun profilage ni décision automatisée concernant des personnes n'est réalisé.</p>

<h2>Cookies</h2>
<p><strong>Ce site n'utilise pas de cookies.</strong> La seule chose enregistrée dans votre navigateur est votre
préférence pour le mode sombre. C'est vous qui la demandez, elle reste sur votre appareil, ne part vers aucun serveur,
n'identifie personne, et s'efface en vidant les données du site. C'est pourquoi vous ne verrez pas de bandeau de
consentement : il n'y a rien à consentir.</p>

<!--TERCEROS-->

<h2>Les petites annonces</h2>
<p>Les annonces sont envoyées par des habitants et des commerces des cinq communes, et publiées après vérification.
La Prida <strong>n'est pas partie à la transaction et ne perçoit aucune commission</strong> : elle publie l'annonce,
ne vérifie pas ce qui est proposé et n'intervient pas dans la vente. La responsabilité incombe à l'annonceur, qui doit
pouvoir être identifié et respecter la loi selon ce qu'il propose : pour la vente ou la location d'un logement, par
exemple, le diagnostic de performance énergétique est obligatoire et, sans lui, l'annonce n'est pas publiée.</p>
<p><strong>Les coordonnées de l'annonceur ne sont pas publiées</strong> ni conservées avec l'annonce : la personne
intéressée écrit au journal en indiquant la référence de l'annonce, et nous transmettons son message à l'annonceur.</p>
<p>Nous ne publions ni adresses postales ni références cadastrales. Chacun peut demander le retrait de son annonce en
écrivant à l'adresse de contact, et nous retirons sans délai ce qui nous est signalé comme faux, frauduleux ou illégal.</p>

<h2>Publicité</h2>
<p><strong>Il n'y a aujourd'hui aucune publicité sur le site.</strong> Lorsqu'il y en aura, les emplacements payants et
les contenus sponsorisés seront toujours signalés comme tels, et la publicité n'interviendra ni dans le choix ni dans
la rédaction des articles. Si nous plaçons un jour un lien rémunéré, le lien lui-même le dira.</p>

<h2>Responsabilité</h2>
<p>Le plus grand soin est apporté à l'exactitude des informations, qui peuvent toutefois contenir des erreurs ou être
dépassées. Les liens externes sont fournis à titre informatif et n'engagent pas notre responsabilité.</p>`,
    de: `
<h2>Inhalte und Quellen</h2>
<p>Die veröffentlichten Beiträge sind eigene Texte, verfasst auf Grundlage öffentlicher Quellen (Amtsblätter,
Gemeinden, Behörden) und von Medien, die am Fuß jedes Beitrags genannt und verlinkt werden. Fremde Texte werden nicht
wiedergegeben: derselbe Sachverhalt wird mit eigenen Worten berichtet. Wörtliche Zitate stehen in Anführungszeichen
und werden zugeordnet, gestützt auf das Zitatrecht nach Artikel 32 des spanischen Urheberrechtsgesetzes.</p>
<p>Vor der Veröffentlichung durchläuft jeder Beitrag eine automatische Prüfung, die ihn mit der Quelle vergleicht und
alles blockiert, was zusammenhängende Sätze mit ihr teilt.</p>

<h2>Fotografien und Illustrationen</h2>
<p>Die Fotos stammen aus Repositorien für freie Inhalte, vor allem Wikimedia Commons, und werden nur unter Lizenzen
verwendet, die das erlauben: <strong>Gemeinfreiheit, CC0, CC BY und CC BY-SA</strong>. Unter jedem Foto stehen Urheber,
Lizenz und Herkunft, und die Lizenz verlinkt auf ihren Rechtstext, damit es jeder prüfen kann.</p>
<p>Die Fotos werden auf 1.600 Pixel Breite verkleinert geladen; darauf wird in der Bildunterschrift hingewiesen.</p>
<p><strong>Lizenzen mit NC (nicht kommerziell) oder ND (keine Bearbeitung) werden nicht verwendet.</strong> Erstere,
weil diese Zeitung bezahlte Flächen hat und das eine kommerzielle Nutzung ist; letztere, weil eine Größenänderung
bereits eine Bearbeitung darstellt. Fotos der Medien, aus denen die Information stammt, werden nicht verwendet, auch
nicht von deren Server eingebunden.</p>
<p>Gibt es kein passendes freies Bild, veröffentlicht die Seite eine eigene Illustration als Originalwerk. Logo und
Illustrationen sind Originalschöpfungen dieser Seite. Die Schriften (Bricolage Grotesque, Inter und Martian Mono)
stehen unter der SIL Open Font License 1.1, die kommerzielle Nutzung erlaubt.</p>

<h2>Entfernung von Inhalten</h2>
<p>Wenn Sie Rechte an einem Inhalt halten und seine Nutzung hier für unangemessen halten, schreiben Sie an die
Kontaktadresse: wir entfernen oder ändern ihn unverzüglich und ohne Nachfragen. Dasselbe gilt, wenn Sie ein Medium
sind und nicht möchten, dass wir Ihren Feed auswerten, oder wenn Ihnen ein falsch angegebenes Bild auffällt.</p>

<h2>Datenschutz</h2>
<p><strong>Verantwortlicher:</strong> die Person oder Firma, die im Abschnitt zur Anbieterkennzeichnung dieser Seite
genannt ist.</p>
<p><strong>Welche Daten und wofür.</strong> Nur die, die Sie freiwillig senden: Ihre E-Mail-Adresse bei Anmeldung zum
Newsletter und die Angaben, die Sie machen, wenn Sie uns schreiben oder eine Anzeige aufgeben. Sie werden
ausschließlich verwendet, um Ihnen den Newsletter zu senden, Ihnen zu antworten oder Ihre Anzeige zu veröffentlichen.</p>
<p><strong>Rechtsgrundlage.</strong> Ihre Einwilligung, erteilt mit dem Absenden und jederzeit widerrufbar.</p>
<p><strong>Speicherdauer.</strong> Die Newsletter-Adresse, solange Sie angemeldet bleiben; Anzeigen, solange sie laufen
und bis zu einem Jahr danach; E-Mails, solange es zur Bearbeitung nötig ist.</p>
<p><strong>Empfänger.</strong> Niemand. Es findet kein Verkauf, keine Vermietung und keine Weitergabe an Dritte zu
Werbezwecken statt. Die E-Mail läuft über einen E-Mail-Anbieter als Auftragsverarbeiter.</p>
<p><strong>Ihre Rechte.</strong> Sie können <strong>Auskunft</strong>, <strong>Berichtigung</strong>,
<strong>Löschung</strong>, <strong>Einschränkung</strong> der Verarbeitung und <strong>Datenübertragbarkeit</strong>
verlangen sowie der Verarbeitung <strong>widersprechen</strong>, per Nachricht an die Kontaktadresse. Wenn Sie meinen,
Ihr Anliegen sei nicht bearbeitet worden, können Sie sich bei der spanischen Datenschutzbehörde beschweren
(<a href="https://www.aepd.es" target="_blank" rel="noopener">aepd.es</a>).</p>
<p>Es findet kein Profiling und keine automatisierte Entscheidungsfindung über Personen statt.</p>

<h2>Cookies</h2>
<p><strong>Diese Seite verwendet keine Cookies.</strong> Gespeichert wird in Ihrem Browser nur, ob Sie den Nachtmodus
bevorzugen. Sie verlangen ihn selbst, er bleibt auf Ihrem Gerät, geht an keinen Server, identifiziert niemanden und
lässt sich durch Löschen der Seitendaten entfernen. Deshalb sehen Sie auch kein Einwilligungsbanner: es gibt nichts
einzuwilligen.</p>

<!--TERCEROS-->

<h2>Das schwarze Brett</h2>
<p>Die Anzeigen stammen von Anwohnern und Betrieben der fünf Gemeinden und werden nach Prüfung veröffentlicht.
La Prida <strong>ist nicht Vertragspartei und erhält keine Provision</strong>: sie veröffentlicht die Anzeige, prüft
das Angebot nicht und wirkt am Geschäft nicht mit. Die Verantwortung trägt, wer inseriert; er muss identifizierbar
sein und erfüllen, was das Gesetz je nach Angebot verlangt: beim Verkauf oder der Vermietung von Wohnraum etwa ist
der Energieausweis Pflicht, und ohne ihn wird die Anzeige nicht veröffentlicht.</p>
<p><strong>Die Kontaktdaten der Inserenten werden nicht veröffentlicht</strong> und nicht mit der Anzeige gespeichert:
Interessierte schreiben der Zeitung unter Angabe der Anzeigennummer, und wir leiten die Nachricht weiter.</p>
<p>Postanschriften und Katasterangaben werden nicht veröffentlicht. Jede Person kann die Entfernung ihrer Anzeige
über die Kontaktadresse verlangen, und wir entfernen unverzüglich, was uns als falsch, betrügerisch oder rechtswidrig
bekannt wird.</p>

<h2>Werbung</h2>
<p><strong>Derzeit gibt es auf der Seite keine Werbung.</strong> Sobald es sie gibt, werden bezahlte Flächen und
gesponserte Inhalte stets als solche gekennzeichnet, und Werbung wird weder die Auswahl noch das Schreiben der
Beiträge beeinflussen. Sollten wir je einen Link setzen, an dem wir mitverdienen, wird der Link es selbst sagen.</p>

<h2>Haftung</h2>
<p>Auf die Richtigkeit der Angaben wird größte Sorgfalt verwendet; dennoch können Informationen Fehler enthalten oder
veraltet sein. Links zu externen Seiten dienen der Information und begründen keine Haftung für deren Inhalte.</p>`,
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

  // La oferta comercial depende de `anuncios.seVende`. Mientras esté apagada, la
  // página sigue existiendo —cuenta qué es el diario y recoge interesados— pero
  // NO pone precios ni invita a contratar: no se puede ofrecer un servicio por
  // dinero sin tener hechos los trámites. Ver el porqué en src/config.mjs.
  const bloqueOferta = anuncios.seVende
    ? `<h2 class="titulo-seccion">Qué puedes contratar</h2>
  <div class="tarifas">${fichas}</div>

  <section>
    <h2 class="titulo-seccion">Cómo se contrata</h2>
    <ol class="pasos">
      <li><strong>Escríbenos</strong> a ${esc(sitio.email)} con el nombre del negocio y en qué concejo quieres salir.</li>
      <li><strong>Nos mandas una frase y un enlace.</strong> Si no la tienes, te la escribimos nosotros y la apruebas tú.</li>
      <li><strong>Sale a la mañana siguiente.</strong> Sin permanencia: avisas y se retira.</li>
    </ol>
    <p style="font-size:15px;color:var(--tinta-2);max-width:62ch">Los espacios patrocinados van siempre marcados como tales. La publicidad no decide qué se publica ni cómo se cuenta: es la única manera de que esto le sirva a alguien, y también de que a ti te sirva salir aquí.</p>
  </section>`
    : `<section>
    <h2 class="titulo-seccion">Todavía no vendemos publicidad</h2>
    <p style="max-width:62ch">La Prida no lleva anuncios ni los está comercializando. Estamos ordenando antes el papeleo, que es lo que toca hacer primero y no después.</p>
    <p style="max-width:62ch"><strong>Si tienes un negocio en alguno de los cinco concejos y te interesa</strong>, escríbenos a ${esc(sitio.email)} con el nombre del negocio y el concejo. No te vamos a cobrar nada ni a comprometerte a nada: apuntamos el interés y te avisamos cuando abramos.</p>
    <p style="font-size:15px;color:var(--tinta-2);max-width:62ch">Cuando llegue el momento, los espacios patrocinados irán siempre marcados como tales, y la publicidad no decidirá qué se publica ni cómo se cuenta.</p>
  </section>`;

  return marco({
    titulo: 'Anúnciate en La Prida',
    descripcion: anuncios.seVende
      ? 'Pon tu negocio delante de la gente de Piloña, Nava, Cabranes, Cabrales y Villaviciosa, cada mañana. Formatos, precios y cómo contratarlo.'
      : 'La Prida todavía no vende publicidad. Si tienes un negocio en Piloña, Nava, Cabranes, Cabrales o Villaviciosa y te interesa, déjanos tu contacto y te avisamos.',
    url: '/anunciate/',
    tiempo,
    contenido: `<div class="contenedor">
  <section class="portico">
    <span class="rotulo" style="color:var(--tinta-3)">${anuncios.seVende ? 'Para negocios de casa' : 'Publicidad'}</span>
    <h1 style="max-width:15ch">${anuncios.seVende ? 'Tu negocio, en el desayuno de tus vecinos' : 'Un diario que se lee en el desayuno'}</h1>
    <p style="max-width:56ch">La Prida se lee a primera hora, en casa y con el café. No competimos con la tele ni con el periódico de Oviedo: solo contamos lo de estos cinco concejos.</p>
  </section>

  <section class="datos">
    <div class="dato"><span class="dato__cifra">${concejos.length}</span><span class="dato__que">concejos: ${concejos.map((c) => c.nombre).join(', ').replace(/, ([^,]*)$/, ' y $1')}</span></div>
    <div class="dato"><span class="dato__cifra">${piezas.length}</span><span class="dato__que">piezas publicadas ahora mismo</span></div>
    <div class="dato"><span class="dato__cifra">7:00</span><span class="dato__que">hora a la que sale la edición, cada día</span></div>
  </section>

  ${bloqueOferta}
</div>`,
  });
}

/* --- construcción ---------------------------------------------------------- */

async function main() {
  const t0 = Date.now();

  // ¿Están las tipografías en el repositorio? De esto depende que el lector le
  // pida las letras a Google o a nosotros, y que el aviso legal lo cuente o no.
  const CSS_FUENTES = path.join(RAIZ, 'src', 'fuentes', 'fuentes.css');
  try {
    await fs.access(CSS_FUENTES);
    estado.fuentesPropias = true;
    // Aquí solo se DETECTA. La copia va abajo, con el resto de estáticos: dist/
    // se limpia después de este punto y se llevaría por delante lo copiado.
    console.log('   Tipografías servidas desde el propio sitio');
  } catch {
    estado.fuentesPropias = false;
    const m =
      'Las tipografías se siguen pidiendo a Google Fonts, que recibe la IP de cada lector. ' +
      'Se arregla lanzando una vez el flujo «Traer las tipografías a casa» en la pestaña Actions.';
    console.warn(`\n⚠︎  ${m}\n`);
    if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Tipografías en Google::${m}`);
  }

  // Se vacía dist/ antes de generar. En carpetas sincronizadas o con permisos
  // restringidos el borrado puede no estar permitido: en ese caso se sobrescribe.
  try {
    await fs.rm(DIST, { recursive: true, force: true });
  } catch (err) {
    console.warn(`   (no se pudo vaciar dist/: ${err.code ?? err.message}; se sobrescribe)`);
  }
  await fs.mkdir(DIST, { recursive: true });

  // Seguridad: la dirección y el concejo de cada pieza se convierten en nombres
  // de carpeta y en enlaces. Solo pasan los que tienen la forma que genera la
  // ingesta (/concejo/slug/, minúsculas, cifras y guiones) y un concejo real.
  // Lo demás no se publica y se avisa en la pestaña Actions.
  const slugsValidos = new Set(concejos.map((c) => c.slug));
  const todasLasPiezas = await json('noticias.json', []);
  const piezas = todasLasPiezas
    .filter((p) => {
      const ok =
        p &&
        slugsValidos.has(p.concejoSlug) &&
        typeof p.url === 'string' &&
        /^\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(p.url) &&
        p.url.startsWith(`/${p.concejoSlug}/`) &&
        !Number.isNaN(Date.parse(p.fecha));
      if (!ok) {
        const m = `Pieza descartada por datos con forma inválida: ${JSON.stringify(String(p?.url ?? '')).slice(0, 120)}`;
        console.warn(`⚠︎  ${m}`);
        if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Pieza inválida::${m.replace(/[\r\n]/g, ' ')}`);
      }
      return ok;
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
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
  // Privacidad: un anuncio que lleve correo o teléfono en cualquiera de sus campos
  // no se publica, y se avisa en rojo para que se quite del repositorio (que es
  // público). El contacto va siempre a través del diario. Ver plantillas.mjs.
  const RE_DATO_PERSONAL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+|(?:\+34[\s.-]?)?(?:[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}|[6789]\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2})/;
  const anunciosTablon = (await json('anuncios.json', [])).filter((a) => {
    const campos = Object.entries(a ?? {}).filter(([, v]) => typeof v === 'string');
    const conDato = campos.find(([, v]) => RE_DATO_PERSONAL.test(v) && !/laprida\.example/.test(v));
    if (conDato) {
      const m = `Anuncio «${a.id}» NO publicado: el campo «${conDato[0]}» lleva un correo o un teléfono. Quítalo de content/data/anuncios.json (el repositorio es público).`;
      console.error(`✖  ${m}`);
      if (process.env.GITHUB_ACTIONS) console.log(`::error title=Dato personal en un anuncio::${m}`);
      return false;
    }
    return true;
  });
  const cursosManual = await json('cursos.json', []);

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
    await escribir('index.html', portada({ piezas, despertadorDatos, tiempo, agenda, avisos, empleo: empleoManual, cursos: cursosManual, tablon: anunciosTablon }));

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
      if (s.slug === 'cursos') {
        // La sección no tiene piezas propias: se nutre de lo que la ingesta ya
        // trajo y que habla de un curso que se ofrece.
        lista = piezas
          .filter((p) => esCurso(`${p.entradilla ?? ''} ${p.cuerpo ?? ''}`, p.titular ?? ''))
          .slice(0, 12);
      }
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
      if (s.slug === 'cursos') {
        // Dos cosas en la misma página: los cursos que nos mandan (a mano, gratis)
        // y los que salen en la prensa y los tablones. Primero los que tienen el
        // plazo abierto, y dentro de esos el que cierra antes: es el que urge.
        const orden = [...cursosManual].sort((a, b) => {
          const abiertoA = cursoAbierto(a);
          const abiertoB = cursoAbierto(b);
          if (abiertoA !== abiertoB) return abiertoA ? -1 : 1;
          if (!!a.destacado !== !!b.destacado) return a.destacado ? -1 : 1;
          const plazoA = a.inscripcionHasta ?? a.empieza ?? '9999';
          const plazoB = b.inscripcionHasta ?? b.empieza ?? '9999';
          return String(plazoA).localeCompare(String(plazoB));
        });
        extra = `
  ${orden.length ? `<h2 class="titulo-seccion">${T('cursosAbiertos')} <span class="cuenta">${orden.length}</span></h2>` : ''}
  ${filtrosCursos(orden)}
  ${
    orden.length
      ? `<div class="anuncios" data-cartelera>${orden.map(tarjetaCurso).join('\n')}</div>`
      : `<p class="vacio">${T('sinCursos')}</p>`
  }
  <div style="display:grid;gap:22px;max-width:560px;margin:32px 0 40px">${publicaTuCurso()}${dondeBuscarCursos()}</div>
  ${lista.length ? `<h2 class="titulo-seccion">${T('cursosEnPrensa')}</h2>` : ''}`;
      }
      if (s.slug === 'tablon') {
        // El tablón no lleva noticias: lo que hay es lo que mandan los vecinos.
        // Primero los vivos, los destacados arriba, y los caducados al final
        // para que se vea que el tablón se mueve.
        const orden = [...anunciosTablon].sort((a, b) => {
          const vivoA = anuncioVivo(a);
          const vivoB = anuncioVivo(b);
          if (vivoA !== vivoB) return vivoA ? -1 : 1;
          if (!!a.destacado !== !!b.destacado) return a.destacado ? -1 : 1;
          return String(b.desde ?? '').localeCompare(String(a.desde ?? ''));
        });
        extra = `
  <div style="max-width:620px;margin:0 0 28px">${avisoTablon()}</div>
  ${filtrosTablon(orden)}
  ${
    orden.length
      ? `<div class="anuncios" data-cartelera>${orden.map(tarjetaAnuncio).join('\n')}</div>`
      : `<p class="vacio">${T('sinAnuncios')}</p>`
  }
  <div style="display:grid;gap:22px;max-width:520px;margin:32px 0 40px">${publicaTuAnuncio()}</div>`;
        lista = [];
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
        html: (bloqueTitular(estado.idioma) + fija('legal', LEGAL)).replace('<!--TERCEROS-->', bloqueTerceros(estado.idioma)),
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
  // Las tarjetas que se ven al compartir un enlace. Son PNG hechos a mano y
  // guardados en el repositorio: el diario no gana ninguna dependencia por esto.
  await fs.cp(path.join(RAIZ, 'src', 'social'), path.join(DIST, 'social'), { recursive: true });
  // Las tipografías propias, si están. Con esto el lector deja de pedirle las
  // letras a Google, que hasta ahora recibía su IP en cada visita.
  if (estado.fuentesPropias) {
    await fs.cp(path.join(RAIZ, 'src', 'fuentes'), path.join(DIST, 'fuentes'), { recursive: true });
  }
  await escribir('favicon.svg', FAVICON);

  avisarSiFaltaElTitular();

  await escribir('sitemap.xml', sitemap(urls));

  // El sitemap de noticias solo existe si hay noticias frescas. Ver arriba.
  const noticiasXml = sitemapNoticias(piezas);
  if (noticiasXml) await escribir('news-sitemap.xml', noticiasXml);

  // security.txt (RFC 9116): a quién avisar si alguien encuentra un fallo de
  // seguridad. «Expires» es obligatorio y no puede pasar de un año; como el
  // diario se reconstruye varias veces al día, se pone a 180 días y se renueva solo.
  {
    const caduca = new Date(Date.now() + 180 * 86400000).toISOString().replace(/\.\d{3}Z$/, 'Z');
    await fs.mkdir(path.join(DIST, '.well-known'), { recursive: true });
    await fs.writeFile(
      path.join(DIST, '.well-known', 'security.txt'),
      `Contact: mailto:${sitio.email}\n` +
        `Contact: https://github.com/guilabert67/guilabert67.github.io/security/advisories/new\n` +
        `Expires: ${caduca}\n` +
        'Preferred-Languages: es, en\n' +
        `Canonical: ${sitio.url}/.well-known/security.txt\n` +
        `Policy: https://github.com/guilabert67/guilabert67.github.io/blob/main/SECURITY.md\n`
    );
  }

  await escribir(
    'robots.txt',
    `User-agent: *\nAllow: /\n\nSitemap: ${sitio.url}/sitemap.xml\n` +
      (noticiasXml ? `Sitemap: ${sitio.url}/news-sitemap.xml\n` : '')
  );

  // IndexNow. La clave va en la raiz del sitio, en claro: el protocolo lo exige
  // asi, y es lo que demuestra que quien avisa manda de verdad en el dominio.
  const sobre = sobreIndexNow(piezas);
  if (sobre) {
    await escribir(`${sobre.key}.txt`, sobre.key);
    // Fuera de dist/: esto no es parte del periodico, es el sobre del aviso.
    await fs.writeFile(path.join(RAIZ, 'indexnow.json'), JSON.stringify(sobre));
    console.log(`   IndexNow: ${sobre.urlList.length} direcciones preparadas`);
  }
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
