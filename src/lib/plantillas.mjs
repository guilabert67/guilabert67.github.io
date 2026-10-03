// Plantillas HTML de La Prida. Todo se genera con plantillas de cadena: cero dependencias.

import { analitica, sitio, concejos, secciones, anuncios, tarifas, boletin as cfgBoletin, afiliados, verificacion, tiposEvento, enlacesAgenda, enlacesEmpleo, categoriasAnuncio, tablon, categoriasCurso, formacion, enlacesFormacion, frescura } from '../config.mjs';
import { tipoPorSlug, tiposPresentes, esFuturo, fechaDelPlan } from './eventos.mjs';
import {
  idiomas, IDIOMA_BASE, idiomaDe, ruta, t as texto,
  fechaLargaEn, haceCuantoEn, mesCortoEn, nombreTipoEn,
} from '../idiomas.mjs';

/* --- utilidades ---------------------------------------------------------- */

// Se pone a true cuando el sitio se construye con las piezas de muestra.
// El idioma en curso. El generador lo cambia antes de escribir cada versión;
// así las plantillas no tienen que arrastrarlo por veinte firmas de función.
export const estado = { muestra: false, idioma: IDIOMA_BASE, fuentesPropias: false };

/** Texto de interfaz en el idioma en curso. */
export const T = (clave) => texto(estado.idioma, clave);

/** Una ruta del sitio en el idioma en curso. El camino se escribe en español. */
export const U = (camino = '/') => rutaLimpia(ruta(estado.idioma, camino));

/**
 * Seguridad: una ruta propia solo puede llevar caracteres de ruta. Comillas,
 * < > y espacios se codifican (%22, %3C…): así una dirección rara en los datos
 * no puede cerrar el atributo href="" y meter HTML. Con las rutas normales del
 * diario ([a-z0-9-/]) no cambia nada. Comprobado el 03/10/2026 con datos envenenados.
 */
export function rutaLimpia(r = '') {
  return String(r).replace(/[^A-Za-z0-9\-._~\/#%?=&+]/g, (c) => encodeURIComponent(c));
}

/**
 * Un campo de una pieza en el idioma en curso, con vuelta al español si no
 * está traducido. Nunca deja un hueco en blanco: mejor en español que vacío.
 */
export function tr(pieza, campo) {
  if (estado.idioma === IDIOMA_BASE) return pieza?.[campo];
  const v = pieza?.trad?.[estado.idioma]?.[campo];
  if (v == null) return pieza?.[campo];
  if (Array.isArray(v) && v.length === 0) return pieza?.[campo];
  if (typeof v === 'string' && !v.trim()) return pieza?.[campo];
  return v;
}

/** ¿Tiene esta pieza cuerpo traducido al idioma en curso? */
export function estaTraducida(pieza) {
  if (estado.idioma === IDIOMA_BASE) return true;
  const c = pieza?.trad?.[estado.idioma]?.cuerpo;
  return Array.isArray(c) && c.length > 0;
}

export const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Seguridad: las URL de enlace pasan por aquí, no solo por `esc`.
 *
 * `esc` impide romper el atributo, pero deja pasar `javascript:alert(1)`, que
 * es una URL perfectamente válida dentro de un href. Las URL de La Prida llegan
 * de fuentes externas (feeds, el redactor, anuncios que manda un vecino), así
 * que solo se aceptan http, https, mailto, tel y rutas propias. Lo demás se
 * convierte en un enlace muerto. Comprobado el 03/10/2026 con un feed envenenado.
 */
export function urlSegura(u = '') {
  const t = String(u ?? '').trim();
  if (!t) return '#';
  if (/^(https?:|mailto:|tel:)/i.test(t)) return t;
  if (/^(\/(?!\/)|#|\.\.?\/)/.test(t)) return t;
  // Cualquier otro esquema (javascript:, data:, vbscript:…) o una URL rara: fuera.
  if (/^[a-z][a-z0-9+.-]*:/i.test(t) || /^[\s\x00-\x1f]/.test(t)) return '#';
  return t;
}
export const escUrl = (u) => esc(urlSegura(u));

/**
 * Seguridad: JSON dentro de <script type="application/ld+json">.
 *
 * JSON.stringify no escapa «</script>». Un titular con esa cadena cerraba el
 * bloque y lo que viniera detrás se ejecutaba como JavaScript en la página:
 * probado el 03/10/2026 con Chromium, el código inyectado corrió. Se escapan
 * <, > y & como \u003c, \u003e y \u0026, que en JSON significan lo mismo.
 */
export const jsonEnScript = (o) =>
  JSON.stringify(o)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function fechaLarga(iso) {
  return fechaLargaEn(iso, estado.idioma);
}
export function fechaCorta(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}.`;
}
export function haceCuanto(iso) {
  return haceCuantoEn(iso, estado.idioma);
}

const dato = (slug) => concejos.find((c) => c.slug === slug) ?? null;
const colorDe = (slug) => dato(slug)?.color ?? 'var(--tinta)';
const colorTextoDe = (slug) => dato(slug)?.colorTexto ?? dato(slug)?.color ?? 'var(--tinta)';
const letraDe = (slug) => dato(slug)?.letra ?? '·';
// Nava es amarilla: sobre ella la tinta tiene que ser negra, no blanca.
// Qué paradas piden tinta negra dentro del disco en vez de blanca.
//
// Medido, no estimado, letra sobre su propio color: Nava 10,3:1 con tinta negra
// contra 1,8:1 con blanca; Cabranes 6,0 contra 3,1; Piloña 5,0 contra 3,7. Las
// tres pasan con negra y suspenden con blanca. Villaviciosa (4,9) y Cabrales
// (5,9) sí aguantan el blanco y se quedan como estaban.
//
// La letra es lo que hace que el color no viaje solo. Si no se lee, el invento
// de la accesibilidad se queda en decoración.
const CLAROS = ['nava', 'cabranes', 'pilona'];
const claroDe = (slug) => (CLAROS.includes(slug) ? ' data-claro="si"' : '');

// El orden de la línea es geográfico, de oeste a este, no el de la lista.
const ORDEN_LINEA = ['nava', 'villaviciosa', 'cabranes', 'pilona', 'cabrales'];
const enLinea = () => ORDEN_LINEA.map((k) => dato(k)).filter(Boolean);

/** Las variables de color que hereda cualquier bloque de un concejo. */
export function vars(slug) {
  return `--c:${colorDe(slug)};--c-txt:${colorTextoDe(slug)}`;
}

/** El disco: el mismo objeto es el logotipo, la parada del riel y la chapa. */
export function disco(slug, extra = '') {
  return `<span class="disco"${claroDe(slug)} data-largo="${String(letraDe(slug)).length}" style="--c:${colorDe(slug)}" aria-hidden="true"${extra}>${esc(letraDe(slug))}</span>`;
}

/**
 * Las ediciones del día ordenadas por hora de salida. Se ordena aquí y no se
 * confía en el orden del fichero de ajustes: así añadir una nueva no obliga a
 * colocarla en su sitio.
 */
function ediciones() {
  return (sitio.ediciones ?? [])
    .filter((e) => e && typeof e.clave === 'string' && Number.isFinite(e.desde))
    .slice()
    .sort((a, b) => a.desde - b.desde);
}

/**
 * Qué edición se está leyendo: la última de las tres que ya ha salido.
 * Antes de la primera del día, la de la noche anterior.
 *
 * Devuelve la edición, no una hora. El sello de portada la NOMBRA en vez de
 * jurar un minuto exacto, porque el minuto exacto no está en nuestra mano:
 * GitHub retrasa los disparos programados y a veces se los salta. Ver la nota
 * larga en src/config.mjs.
 */
export function edicionActual(ahora = new Date()) {
  const lista = ediciones();
  if (!lista.length) return { clave: 'manana', desde: 0 };
  // la hora real en Asturias, sin importar dónde corra el generador
  const enAsturias = new Date(ahora.toLocaleString('en-US', { timeZone: sitio.zonaHoraria }));
  const h = enAsturias.getHours();
  const pasadas = lista.filter((e) => e.desde <= h);
  // De madrugada todavía no ha salido ninguna de hoy: se lee la última de ayer.
  return pasadas.length ? pasadas[pasadas.length - 1] : lista[lista.length - 1];
}

/** La que vendrá después de la que se está leyendo. */
export function edicionSiguiente(ahora = new Date()) {
  const lista = ediciones();
  if (!lista.length) return null;
  const i = lista.findIndex((e) => e.clave === edicionActual(ahora).clave);
  return lista[(i + 1) % lista.length];
}

/** «manana» → «edicionManana», «cuandoManana». */
const enMayuscula = (clave) => String(clave).charAt(0).toUpperCase() + String(clave).slice(1);
export const rotuloDeEdicion = (ed) => T(`edicion${enMayuscula(ed?.clave ?? 'manana')}`);

/**
 * «Todavía no hay nada nuevo de hoy. La próxima edición sale al mediodía.»
 * Antes decía siempre «a las 14:00», dijera la hora que dijese el reloj.
 */
export function textoSinNovedad(ahora = new Date()) {
  const proxima = edicionSiguiente(ahora);
  const cuando = proxima ? T(`cuando${enMayuscula(proxima.clave)}`) : '';
  return T('sinNovedadHoy').replace('{cuando}', cuando);
}

/** El nombre de una sección en el idioma en curso. */
export function nombreSeccion(seccion) {
  const clave = {
    actualidad: 'portada', agenda: 'laAgenda', trabajo: 'ofertasDeAqui',
    avisos: 'avisos',
  };
  if (estado.idioma === IDIOMA_BASE) return seccion.nombre;
  const mapa = {
    agenda: { en: "What's on", fr: 'Agenda', de: 'Termine' },
    'deporte-y-cultura': { en: 'Sport and culture', fr: 'Sport et culture', de: 'Sport und Kultur' },
    trabajo: { en: 'Jobs', fr: 'Emploi', de: 'Stellen' },
    avisos: { en: 'Notices', fr: 'Infos pratiques', de: 'Hinweise' },
    actualidad: { en: 'News', fr: 'Actualités', de: 'Aktuelles' },
    tablon: { en: 'Noticeboard', fr: 'Petites annonces', de: 'Schwarzes Brett' },
    // Faltaba: en el menú inglés salía «Cursos» entre «Jobs» y «Noticeboard».
    cursos: { en: 'Courses', fr: 'Formations', de: 'Kurse' },
  };
  return mapa[seccion.slug]?.[estado.idioma] ?? seccion.nombre;
}

/** La descripción de una sección en el idioma en curso. */
export function descripcionSeccion(seccion) {
  if (estado.idioma === IDIOMA_BASE) return seccion.descripcion;
  const mapa = {
    agenda: {
      en: 'Everything you can go and see: concerts, theatre, cinema, fairs, markets, antiques sales, village festivals and exhibitions, with the date, the time and the place.',
      fr: 'Tout ce qu’on peut aller voir : concerts, théâtre, cinéma, foires, marchés, brocantes, fêtes et expositions, avec la date, l’heure et le lieu.',
      de: 'Alles, was man sich ansehen kann: Konzerte, Theater, Kino, Messen, Märkte, Trödelmärkte, Feste und Ausstellungen, mit Datum, Uhrzeit und Ort.',
    },
    'deporte-y-cultura': {
      en: 'Teams, venues, heritage and tradition: what happens around the things you go and see.',
      fr: 'Équipes, salles, patrimoine et tradition : ce qui se passe autour de ce qu’on va voir.',
      de: 'Vereine, Säle, Erbe und Tradition: was rund um das passiert, was man sich ansieht.',
    },
    trabajo: {
      en: 'Job vacancies in the five councils: who is hiring, for what, and until when. Posting a vacancy is free for local businesses.',
      fr: 'Offres d’emploi des cinq communes : qui recrute, pour quoi et jusqu’à quand. Publier une offre est gratuit pour les commerces d’ici.',
      de: 'Stellenangebote der fünf Gemeinden: wer sucht, wofür und bis wann. Für Betriebe von hier ist die Anzeige kostenlos.',
    },
    avisos: {
      en: 'Roadworks, closures, on-call pharmacies and the practical side of the day.',
      fr: 'Travaux, coupures, pharmacies de garde et le côté pratique de la journée.',
      de: 'Bauarbeiten, Sperrungen, Notdienste und das Praktische des Tages.',
    },
    actualidad: {
      en: 'What has happened today across the five councils.',
      fr: 'Ce qui s’est passé aujourd’hui dans les cinq communes.',
      de: 'Was heute in den fünf Gemeinden passiert ist.',
    },
    tablon: {
      en: 'The local small ads: houses, cars, cattle, tools and whatever else. Posting is free; neighbours of the five councils put things up and take them down.',
      fr: 'Les petites annonces d’ici : maisons, voitures, bétail, outillage et le reste. Publier est gratuit ; ce sont les habitants des cinq communes qui mettent et retirent.',
      de: 'Die Kleinanzeigen der Gegend: Häuser, Autos, Vieh, Gerät und was sonst anfällt. Aufgeben ist kostenlos; die Nachbarn der fünf Gemeinden stellen ein und nehmen heraus.',
    },
  };
  return mapa[seccion.slug]?.[estado.idioma] ?? seccion.descripcion;
}

/** El selector de idioma. Enlaza a la MISMA página en cada idioma. */
export function selectorIdioma(camino = '/') {
  return `<nav class="idiomas" aria-label="${esc(T('idioma'))}">
  ${idiomas
    .map((i) => {
      const actual = i.codigo === estado.idioma;
      return `<a href="${rutaLimpia(ruta(i.codigo, camino))}" lang="${i.codigo}" hreflang="${i.codigo}"${
        actual ? ' aria-current="true"' : ''
      } title="${esc(i.nombre)}">${esc(i.etiqueta)}</a>`;
    })
    .join('')}
</nav>`;
}

/* --- la marca ---------------------------------------------------------------- */
// El logotipo es un disco de línea, como las paradas: el hueco de la collada
// recortado en el disco, con el sol asomando. El nombre dibujado, y a la vez
// la pieza de la que sale todo el sistema visual.
export const LOGO = (tam = 54) => `
<svg class="marca__logo" width="${tam}" height="${tam}" viewBox="0 0 64 64" role="img" aria-label="La Prida">
  <circle cx="32" cy="32" r="30" fill="currentColor"/>
  <circle cx="32" cy="29" r="9.5" fill="#F2B705"/>
  <path d="M2 57 L21 29 L32 40 L43 26 L62 57 Z" fill="var(--fondo)"/>
  <path d="M32 40 L43 26 L62 57 L32 57 Z" fill="#F2451B"/>
</svg>`;

/* --- publicidad ----------------------------------------------------------- */

export function hueco(slot, etiqueta = '') {
  const id = anuncios.adsense.slots?.[slot] ?? '';
  if (anuncios.activo && anuncios.adsense.cliente && id) {
    return `<div class="anuncio"><p class="anuncio__marca">${esc(etiqueta || T('publicidad'))}</p>
<ins class="adsbygoogle" style="display:block" data-ad-client="${esc(anuncios.adsense.cliente)}" data-ad-slot="${esc(id)}" data-ad-format="auto" data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>`;
  }
  // Y si no hay anuncio, NO se dibuja nada.
  //
  // Antes salía un recuadro de 199 px que decía «Espacio disponible ·
  // portadaMedia» en el mejor sitio de la portada. Un periódico anunciando que
  // nadie se anuncia en él no es un hueco a la espera: es una pancarta de que
  // esto no lo lee nadie. El sitio se reserva en la maqueta, no en la página.
  return '';
}

/** Patrocinios vivos hoy y, si se pide, de un concejo concreto. */
export function patrociniosDe(concejoSlug = null) {
  const hoy = new Date().toISOString().slice(0, 10);
  return anuncios.patrocinios.filter(
    (p) =>
      (!p.hasta || p.hasta >= hoy) &&
      (!p.desde || p.desde <= hoy) &&
      (!p.concejo || !concejoSlug || p.concejo === concejoSlug)
  );
}

const patrocinios = (concejoSlug = null) => {
  const vivos = patrociniosDe(concejoSlug);
  if (!vivos.length) {
    // Sin patrocinadores todavía: el hueco se convierte en el anzuelo para venderlo.
    return `<div class="caja">
  <h2 class="caja__titulo">${esc(T('sitioLibre'))}</h2>
  <p style="margin:0 0 12px;font-size:14.5px;color:var(--tinta-2)">${esc(T('sitioLibreTexto'))}</p>
  <p style="margin:0"><a href="${U('/anunciate/')}" style="color:var(--rojo);font-weight:700;font-size:14px">${esc(T('sitioLibreEnlace'))}</a></p>
</div>`;
  }
  return `<div class="caja"><h2 class="caja__titulo">${esc(T('conApoyo'))}</h2>
${vivos
  .map(
    (p) => `<a class="patrocinio" href="${escUrl(p.url)}" rel="sponsored noopener" target="_blank">
<span class="patrocinio__marca">${esc(T('patrocinado'))}</span>
<p class="patrocinio__titulo">${esc(p.titulo)}</p><p class="patrocinio__texto">${esc(p.texto)}</p></a>`
  )
  .join('\n')}</div>`;
};

/** Bloque de recomendación con enlaces de afiliado, con su aviso obligatorio. */
export function bloqueAfiliado(titulo, enlaces = []) {
  if (!enlaces.length) return '';
  return `<aside class="afiliado">
  <h2 class="afiliado__titulo">${esc(titulo)}</h2>
  <ul class="afiliado__lista">
    ${enlaces
      .map(
        (e) => `<li><a href="${escUrl(e.url)}" rel="sponsored nofollow noopener" target="_blank">
      <span class="afiliado__que">${esc(e.titulo)}</span>
      ${e.texto ? `<span class="afiliado__texto">${esc(e.texto)}</span>` : ''}</a></li>`
      )
      .join('\n')}
  </ul>
  <p class="afiliado__aviso">${esc(afiliados.aviso)}</p>
</aside>`;
}

/* --- piezas reutilizables -------------------------------------------------- */

export function chapa(pieza) {
  const slug = pieza.concejoSlug;
  return `<span class="chapa" style="${vars(slug)}">${disco(slug)}${esc(pieza.concejo)}</span>`;
}

/**
 * La tarjeta de una pieza, en dos tamaños.
 *
 * `nivel: 'media'` lleva foto y entradilla; `'menor'` no lleva ninguna de las
 * dos. La imagen es una señal de jerarquía, no un adorno: si todas las piezas
 * llevan foto, ninguna destaca, y además la portada se convierte en un muro de
 * ilustraciones. Quitarla en el tercer nivel ordena la página y la aligera.
 */
export function tarjeta(p, { foto = true, nivel = 'media' } = {}) {
  const menor = nivel === 'menor';
  return `<a class="pieza${menor ? ' pieza--menor' : ''}" href="${U(p.url)}" style="${vars(p.concejoSlug)}">
  ${!menor && foto && p.imagen ? `<img class="pieza__foto" src="${esc(p.imagen)}" alt="" loading="lazy">` : ''}
  <span class="pieza__cuerpo">
    ${chapa(p)}
    <span class="pieza__titular">${esc(tr(p, 'titular'))}</span>
    ${!menor && tr(p, 'entradilla') ? `<span class="pieza__entradilla">${esc(tr(p, 'entradilla'))}</span>` : ''}
    <span class="firma"><time datetime="${esc(p.fecha)}">${haceCuanto(p.fecha)}</time></span>
  </span>
</a>`;
}

export function destacada(p) {
  return `<a class="destacada" href="${U(p.url)}" style="${vars(p.concejoSlug)}">
  <span class="destacada__marco">
    ${p.imagen ? `<img class="destacada__foto" src="${esc(p.imagen)}" alt="" fetchpriority="high">` : ''}
    <span class="destacada__texto">
      ${chapa(p)}
      <span class="destacada__titular">${esc(tr(p, 'titular'))}</span>
      ${tr(p, 'entradilla') ? `<span class="destacada__entradilla">${esc(tr(p, 'entradilla'))}</span>` : ''}
      <span class="firma" style="margin-top:14px"><time datetime="${esc(p.fecha)}">${haceCuanto(p.fecha)}</time></span>
    </span>
  </span>
</a>`;
}

export function filaLista(p) {
  return `<li><a href="${U(p.url)}" style="${vars(p.concejoSlug)}">
  <span class="tira__texto">
    ${chapa(p)}
    <span class="tira__titular">${esc(tr(p, 'titular'))}</span>
    ${tr(p, 'entradilla') ? `<span class="tira__entradilla">${esc(tr(p, 'entradilla'))}</span>` : ''}
    <span class="firma"><time datetime="${esc(p.fecha)}">${haceCuanto(p.fecha)}</time></span>
  </span>
  ${p.imagen ? `<img src="${esc(p.imagen)}" alt="" loading="lazy">` : '<span></span>'}
</a></li>`;
}

/**
 * ¿Es de hoy?
 *
 * El módulo llegó a decir «lo que no te puedes perder HOY · martes, 8 de
 * septiembre» estando a 23. Si la fecha es la de hoy se dice «hoy» y no hace
 * falta repetirla; si no lo es, se pone la fecha y se calla lo de «hoy». Una
 * cosa o la otra, nunca las dos peleándose.
 */
const esHoy = (fecha) => {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return false;
  return d.toDateString() === new Date().toDateString();
};

/** Las tres paradas del día: tres números enormes en la línea de su concejo. */
export function bloqueDespertador(puntos, fecha) {
  if (!puntos?.length) return '';
  return `<section class="arranque" aria-labelledby="arranque">
  <div class="arranque__cab">
    <h2 class="arranque__titulo" id="arranque">${esc(T('tresParadas'))}</h2>
    <p class="arranque__pie">${
      esHoy(fecha)
        ? esc(T('tresParadasPie'))
        : esc(fechaLarga(fecha))
    }</p>
  </div>
  <ol class="arranque__lista">
    ${puntos
      .map((p, i) => {
        const slug = p.concejoSlug ?? concejos.find((c) => c.nombre === p.concejo)?.slug ?? '';
        return `<li><a class="arranque__enlace" href="${U(p.enlace)}" style="${vars(slug)}">
      <span class="arranque__num" aria-hidden="true">${i + 1}</span>
      <span><span class="arranque__frase">${esc(estado.idioma === IDIOMA_BASE ? p.frase : (p.trad?.[estado.idioma] || p.frase))}</span>
      <span class="arranque__donde chapa" style="${vars(slug)}">${disco(slug)}${esc(p.concejo)}</span></span>
    </a></li>`;
      })
      .join('\n')}
  </ol>
</section>`;
}

/* --- cursos y formación ------------------------------------------------------ */

export const categoriaCursoPorSlug = (slug) => categoriasCurso.find((c) => c.slug === slug);

export function nombreCategoriaCurso(cat) {
  if (!cat) return '';
  const mapa = {
    'formacion-empleo': { en: 'Job training', fr: "Formation à l'emploi", de: 'Berufliche Bildung' },
    'oficios-y-campo': { en: 'Trades and farming', fr: 'Métiers et campagne', de: 'Handwerk und Landwirtschaft' },
    'carnes-y-certificados': { en: 'Licences and certificates', fr: 'Permis et certificats', de: 'Scheine und Zertifikate' },
    idiomas: { en: 'Languages', fr: 'Langues', de: 'Sprachen' },
    digital: { en: 'Computers and digital', fr: 'Informatique et numérique', de: 'Computer und Digitales' },
    'cultura-y-ocio': { en: 'Arts and leisure', fr: 'Culture et loisirs', de: 'Kultur und Freizeit' },
  };
  if (estado.idioma === IDIOMA_BASE) return cat.nombre;
  return mapa[cat.slug]?.[estado.idioma] ?? cat.nombre;
}

/** ¿Sigue abierto el plazo? Un curso se retira solo cuando se pasa. */
export function cursoAbierto(c, ahora = new Date()) {
  const hoy = ahora.toISOString().slice(0, 10);
  if (c.inscripcionHasta) return c.inscripcionHasta >= hoy;
  if (c.empieza) return c.empieza >= hoy;
  const desde = c.desde ? new Date(c.desde) : null;
  if (!desde) return true;
  return new Date(desde.getTime() + (formacion.diasPorDefecto ?? 60) * 86400000) >= ahora;
}

export function categoriasCursoPresentes(lista) {
  const hay = new Set(lista.map((c) => c.categoria));
  return categoriasCurso.filter((c) => hay.has(c.slug));
}

const modalidadEn = (m) => {
  const mapa = {
    presencial: { en: 'In person', fr: 'En présentiel', de: 'In Präsenz' },
    'en línea': { en: 'Online', fr: 'En ligne', de: 'Online' },
    'en linea': { en: 'Online', fr: 'En ligne', de: 'Online' },
    mixta: { en: 'Blended', fr: 'Hybride', de: 'Gemischt' },
  };
  if (estado.idioma === IDIOMA_BASE) return m;
  return mapa[String(m).toLowerCase()]?.[estado.idioma] ?? m;
};

/**
 * La ficha de un curso.
 *
 * El dato que de verdad importa es el PLAZO: lo que se le pasa a la gente no es
 * el curso, es la fecha de apuntarse. Por eso va en la ficha y ordena la lista.
 */
export function tarjetaCurso(c) {
  const slug = c.concejoSlug ?? '';
  const cat = categoriaCursoPorSlug(c.categoria);
  const abierto = cursoAbierto(c);
  const filas = [
    c.quien ? [T('quienLoDa'), esc(c.quien)] : null,
    c.donde ? [T('donde'), esc([c.donde, c.concejo].filter(Boolean).join(', '))] : null,
    c.modalidad ? [T('modalidad'), esc(modalidadEn(c.modalidad))] : null,
    c.duracion ? [T('duracion'), esc(c.duracion)] : null,
    c.precio ? [T('precio'), esc(c.precio)] : null,
    c.plazas ? [T('plazas'), esc(c.plazas)] : null,
    c.empieza ? [T('empieza'), esc(fechaCorta(c.empieza))] : null,
    c.inscripcionHasta ? [T('inscripcionHasta'), esc(fechaCorta(c.inscripcionHasta))] : null,
  ].filter(Boolean);

  return `<article class="anuncio curso${c.destacado ? ' anuncio--destacado' : ''}${abierto ? '' : ' anuncio--caducado'}" style="${vars(slug)}" data-clave="${esc(c.categoria ?? '')}">
  <div class="anuncio__cab">
    ${cat ? `<span class="sello"><span class="sello__icono" aria-hidden="true">${cat.icono}</span>${esc(nombreCategoriaCurso(cat))}</span>` : ''}
    ${slug ? `<span class="chapa" style="${vars(slug)}">${disco(slug)}${esc(c.concejo ?? '')}</span>` : ''}
    ${c.ejemplo ? `<span class="empleo__ejemplo">${esc(T('ejemplo'))}</span>` : ''}
    ${c.destacado && !c.ejemplo ? `<span class="empleo__destaca">${esc(T('destacada'))}</span>` : ''}
    ${abierto ? '' : `<span class="empleo__cerrada">${esc(T('plazoInscripcionCerrado'))}</span>`}
  </div>
  <h3 class="anuncio__titulo">${esc(c.titulo)}</h3>
  ${c.texto ? `<p class="anuncio__texto">${esc(c.texto)}</p>` : ''}
  ${
    filas.length
      ? `<dl class="empleo__datos">${filas
          .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
          .join('')}</dl>`
      : ''
  }
  ${
    c.contacto && abierto
      ? `<p class="empleo__contacto"><a href="${escUrl(
          c.contacto.startsWith('http') ? c.contacto : `mailto:${c.contacto}`
        )}"${c.contacto.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(T('comoApuntarseCurso'))}</a></p>`
      : ''
  }
</article>`;
}

export function filtrosCursos(lista) {
  const cats = categoriasCursoPresentes(lista);
  if (cats.length < 2) return '';
  return `<div class="filtros" role="group" aria-label="${esc(T('filtrarCursos'))}">
  <button class="filtro filtro--activo" type="button" data-filtro="todo" aria-pressed="true">${esc(T('filtroTodo'))}</button>
  ${cats
    .map(
      (c) =>
        `<button class="filtro" type="button" data-filtro="${esc(c.slug)}" aria-pressed="false"><span aria-hidden="true">${c.icono}</span> ${esc(nombreCategoriaCurso(c))}</button>`
    )
    .join('')}
</div>`;
}

export function publicaTuCurso() {
  const correo = formacion.correo || sitio.email;
  return `<div class="caja caja--llamada">
  <h2 class="caja__titulo">${esc(T('dasCursos'))}</h2>
  <p style="margin:0 0 14px;font-size:15px;color:var(--tinta-2)">${esc(T('comoPublicarCurso'))}</p>
  <p style="margin:0"><a class="volver" style="margin:0" href="mailto:${esc(correo)}">${esc(T('escribirA'))} ${esc(correo)} →</a></p>
</div>`;
}

/** Los sitios oficiales. No caducan, así que siempre hay algo que mirar. */
export function dondeBuscarCursos() {
  const ayuntamientos = concejos
    .filter((c) => c.web)
    .map(
      (c) => `<li style="${vars(c.slug)}"><a href="${escUrl(c.web)}" target="_blank" rel="noopener">
    ${disco(c.slug)}${esc(T('ayuntamientoDe'))} ${esc(c.nombre)}</a></li>`
    )
    .join('\n');
  return `<aside class="caja" aria-labelledby="dondecursos">
  <h2 class="caja__titulo" id="dondecursos">${esc(T('dondeBuscarCursos'))}</h2>
  <p style="margin:0 0 14px;font-size:15px;color:var(--tinta-2)">${esc(T('dondeBuscarCursosPie'))}</p>
  <ul class="enlaces">
    ${enlacesFormacion
      .map(
        (e) => `<li><a href="${escUrl(e.url)}" target="_blank" rel="noopener">${esc(e.nombre)}</a>${
          e.nota ? `<small>${esc(e.nota)}</small>` : ''
        }</li>`
      )
      .join('\n')}
    ${ayuntamientos}
  </ul>
</aside>`;
}

/* --- el tablón de anuncios --------------------------------------------------- */

export const categoriaPorSlug = (slug) => categoriasAnuncio.find((c) => c.slug === slug);

/** El nombre de la categoría en el idioma que toca. */
export function nombreCategoria(cat) {
  if (!cat) return '';
  const mapa = {
    inmuebles: { en: 'Houses and land', fr: 'Maisons et terrains', de: 'Häuser und Land' },
    motor: { en: 'Vehicles and machinery', fr: 'Véhicules et matériel', de: 'Fahrzeuge und Maschinen' },
    'ganado-y-agro': { en: 'Livestock and farming', fr: 'Bétail et agriculture', de: 'Vieh und Landwirtschaft' },
    varios: { en: 'Odds and services', fr: 'Divers et services', de: 'Verschiedenes und Dienste' },
  };
  if (estado.idioma === IDIOMA_BASE) return cat.nombre;
  return mapa[cat.slug]?.[estado.idioma] ?? cat.nombre;
}

/** ¿Sigue vivo el anuncio? Caduca solo, sin que nadie tenga que acordarse. */
export function anuncioVivo(a, ahora = new Date()) {
  const hoy = ahora.toISOString().slice(0, 10);
  if (a.hasta) return a.hasta >= hoy;
  const desde = a.desde ? new Date(a.desde) : null;
  if (!desde) return true;
  const limite = new Date(desde.getTime() + (tablon.diasPorDefecto ?? 30) * 86400000);
  return limite >= ahora;
}

export function categoriasPresentes(lista) {
  const hay = new Set(lista.map((a) => a.categoria));
  return categoriasAnuncio.filter((c) => hay.has(c.slug));
}

/**
 * La ficha de un anuncio.
 *
 * Solo se pinta lo que el anunciante haya dado de verdad: ni un dato inventado,
 * ni un hueco con guion. En inmuebles el certificado energético va SIEMPRE
 * visible, porque en España es obligatorio en los anuncios de venta y alquiler.
 */
export function tarjetaAnuncio(a) {
  const slug = a.concejoSlug ?? '';
  const cat = categoriaPorSlug(a.categoria);
  const vivo = anuncioVivo(a);
  const filas = [
    a.precio ? [T('precio'), esc(a.precio)] : null,
    a.zona ? [T('donde'), esc([a.zona, a.concejo].filter(Boolean).join(', '))] : null,
    a.anunciante ? [T('quienAnuncia'), esc(T(a.anunciante === 'profesional' ? 'profesional' : 'particular'))] : null,
    cat?.exigeCertificadoEnergetico && a.certificadoEnergetico
      ? [T('certificadoEnergetico'), esc(a.certificadoEnergetico)]
      : null,
    a.hasta ? [T('hasta'), esc(fechaCorta(a.hasta))] : null,
  ].filter(Boolean);

  return `<article class="anuncio${a.destacado ? ' anuncio--destacado' : ''}${vivo ? '' : ' anuncio--caducado'}" style="${vars(slug)}" data-clave="${esc(a.categoria ?? '')}">
  <div class="anuncio__cab">
    ${cat ? `<span class="sello"><span class="sello__icono" aria-hidden="true">${cat.icono}</span>${esc(nombreCategoria(cat))}</span>` : ''}
    ${slug ? `<span class="chapa" style="${vars(slug)}">${disco(slug)}${esc(a.concejo ?? '')}</span>` : ''}
    ${a.ejemplo ? `<span class="empleo__ejemplo">${esc(T('ejemplo'))}</span>` : ''}
    ${a.destacado && !a.ejemplo ? `<span class="empleo__destaca">${esc(T('destacada'))}</span>` : ''}
    ${vivo ? '' : `<span class="empleo__cerrada">${esc(T('anuncioCaducado'))}</span>`}
  </div>
  <h3 class="anuncio__titulo">${esc(a.titulo)}</h3>
  ${a.texto ? `<p class="anuncio__texto">${esc(a.texto)}</p>` : ''}
  ${
    filas.length
      ? `<dl class="empleo__datos">${filas
          .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
          .join('')}</dl>`
      : ''
  }
  ${
    // Privacidad: el contacto del anunciante NO se publica ni se guarda en el
    // repositorio, que es público y no olvida (el historial de git conserva lo
    // borrado). Quien esté interesado escribe al diario con la referencia del
    // anuncio y el diario se lo hace llegar al anunciante.
    vivo
      ? `<p class="empleo__contacto"><a href="${escUrl(
          `mailto:${tablon.correo || sitio.email}?subject=${encodeURIComponent(`Anuncio ${a.id ?? ''}`)}`
        )}">${esc(T('contactar'))}</a> <small>· ${esc(T('referencia'))} ${esc(a.id ?? '')}</small></p>`
      : ''
  }
</article>`;
}

/** Los filtros por categoría. Sin JS se ve todo, que es lo correcto. */
export function filtrosTablon(lista) {
  const cats = categoriasPresentes(lista);
  if (cats.length < 2) return '';
  return `<div class="filtros" role="group" aria-label="${esc(T('filtrarTablon'))}">
  <button class="filtro filtro--activo" type="button" data-filtro="todo" aria-pressed="true">${esc(T('filtroTodo'))}</button>
  ${cats
    .map(
      (c) =>
        `<button class="filtro" type="button" data-filtro="${esc(c.slug)}" aria-pressed="false"><span aria-hidden="true">${c.icono}</span> ${esc(nombreCategoria(c))}</button>`
    )
    .join('')}
</div>`;
}

export function publicaTuAnuncio() {
  const correo = tablon.correo || sitio.email;
  return `<div class="caja caja--llamada">
  <h2 class="caja__titulo">${esc(T('vendesAlgo'))}</h2>
  <p style="margin:0 0 14px;font-size:15px;color:var(--tinta-2)">${esc(T('comoPublicar'))}</p>
  <p style="margin:0"><a class="volver" style="margin:0" href="mailto:${esc(correo)}">${esc(T('escribirA'))} ${esc(correo)} →</a></p>
</div>`;
}

/**
 * El aviso del tablón. No es letra pequeña: va arriba y se lee.
 *
 * La Prida publica, no media. Decirlo claro protege al vecino de la estafa
 * típica del anuncio y deja clara la posición del diario, que no es parte del
 * trato ni cobra comisión.
 */
export function avisoTablon() {
  return `<aside class="caja" aria-labelledby="avisotablon">
  <h2 class="caja__titulo" id="avisotablon">${esc(T('antesDeCerrarTrato'))}</h2>
  <p style="margin:0;font-size:15px;color:var(--tinta-2)">${esc(T('avisoTablon'))}</p>
</aside>`;
}

/* --- actividad cultural ------------------------------------------------------ */

/** El distintivo del tipo de plan. El icono nunca va solo: siempre lleva el nombre. */
export function nombreTipo(t) {
  return t ? nombreTipoEn(t.slug, t.nombre, estado.idioma) : '';
}

export function selloTipo(slug) {
  const t = tipoPorSlug(slug);
  if (!t) return '';
  return `<span class="sello"><span class="sello__icono" aria-hidden="true">${t.icono}</span>${esc(nombreTipo(t))}</span>`;
}

/**
 * La ficha del plan: dónde, cuándo, a qué hora y cuánto cuesta.
 * Solo se pintan los datos que la fuente haya dado de verdad.
 */
export function fichaPlan(p) {
  if (!p?.tipoEvento) return '';
  const f = fechaDelPlan(p);
  const filas = [
    f ? [T('cuando'), `${fechaLarga(f.toISOString())}${p.hora ? `, ${T('aLas')} ${esc(p.hora)}` : ''}`] : null,
    p.lugar ? [T('donde'), esc(p.lugar)] : null,
    !p.lugar && p.concejo ? [T('donde'), esc(p.concejo)] : null,
    p.precio ? [T('cuanto'), esc(p.precio)] : null,
  ].filter(Boolean);
  if (!filas.length && !f) return '';
  return `<aside class="ficha" style="${vars(p.concejoSlug)}" aria-label="${esc(T('datosDelPlan'))}">
  <p class="ficha__cab">${selloTipo(p.tipoEvento)}</p>
  <dl class="ficha__lista">
    ${filas.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
  </dl>
  ${
    f && !esFuturo(p)
      ? `<p class="ficha__pasado">${esc(T('yaPaso'))}</p>`
      : ''
  }
</aside>`;
}

/** Una entrada de la cartelera. */
export function itemAgenda(e) {
  const f = fechaDelPlan(e) ?? new Date(e.fecha);
  const slug = e.concejoSlug ?? concejos.find((c) => c.nombre === e.concejo)?.slug ?? '';
  const donde = [e.lugar, e.concejo].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ');
  return `<a class="agenda__item" href="${U(e.url ?? '/agenda/')}" style="${vars(slug)}"${
    e.tipoEvento ? ` data-tipo="${esc(e.tipoEvento)}" data-clave="${esc(e.tipoEvento)}"` : ''
  }${slug ? ` data-concejo="${esc(slug)}"` : ''}>
  <span class="agenda__fecha"><span class="agenda__dia">${f.getDate()}</span><span class="agenda__mes">${mesCortoEn(f, estado.idioma)}</span></span>
  <span class="agenda__que-cuerpo">
    ${e.tipoEvento ? selloTipo(e.tipoEvento) : ''}
    <span class="agenda__que">${esc(tr(e, 'titular'))}</span>
    <span class="agenda__donde">${esc(donde)}${e.hora ? ` · ${esc(e.hora)}` : ''}${e.precio ? ` · ${esc(e.precio)}` : ''}</span>
  </span>
</a>`;
}

/** Los filtros de la cartelera: por tipo de plan y por concejo. Funcionan sin JS. */
export function filtrosAgenda(piezas) {
  const tipos = tiposPresentes(piezas);
  if (!tipos.length) return '';
  return `<div class="filtros" role="group" aria-label="${esc(T('filtrarPor'))}">
  <button class="filtro filtro--activo" type="button" data-filtro="todo">${esc(T('filtroTodo'))}</button>
  ${tipos
    .map(
      (t) =>
        `<button class="filtro" type="button" data-filtro="${esc(t.slug)}"><span aria-hidden="true">${t.icono}</span> ${esc(nombreTipo(t))}</button>`
    )
    .join('')}
</div>`;
}

/** La caja de «esto no lo tenemos todo»: los programas oficiales, enlazados. */
export function programasOficiales() {
  if (!enlacesAgenda.length) return '';
  return `<div class="caja">
  <h2 class="caja__titulo">${esc(T('programaEntero'))}</h2>
  <p style="margin:0 0 14px;font-size:15px;color:var(--tinta-2)">${esc(T('programaEnteroTexto'))}</p>
  <ul class="programas">
    ${enlacesAgenda
      .map(
        (e) => `<li style="${vars(e.concejo)}"><a href="${escUrl(e.url)}" target="_blank" rel="noopener">
      ${disco(e.concejo)}<span>${esc(e.nombre)} ↗</span></a></li>`
      )
      .join('')}
  </ul>
</div>`;
}

/* --- empleo ------------------------------------------------------------------ */

/**
 * Una oferta de trabajo publicada por un negocio de casa. Vive en
 * content/data/empleo.json y no pasa por la ingesta: la pone una persona.
 */
export function tarjetaEmpleo(o) {
  const slug = o.concejoSlug ?? '';
  const hoy = new Date().toISOString().slice(0, 10);
  const cerrada = o.hasta && o.hasta < hoy;
  const filas = [
    o.empresa ? [T('quien'), esc(o.empresa)] : null,
    o.jornada ? [T('jornada'), esc(o.jornada)] : null,
    o.contrato ? [T('contrato'), esc(o.contrato)] : null,
    o.hasta ? [T('hasta'), esc(fechaCorta(o.hasta))] : null,
  ].filter(Boolean);
  return `<article class="empleo${o.destacada ? ' empleo--destacada' : ''}${cerrada ? ' empleo--cerrada' : ''}" style="${vars(slug)}">
  <div class="empleo__cab">
    ${slug ? `<span class="chapa" style="${vars(slug)}">${disco(slug)}${esc(o.concejo ?? '')}</span>` : ''}
    ${o.ejemplo ? `<span class="empleo__ejemplo">${esc(T('ejemplo'))}</span>` : ''}
    ${o.destacada && !o.ejemplo ? `<span class="empleo__destaca">${esc(T('destacada'))}</span>` : ''}
    ${cerrada ? `<span class="empleo__cerrada">${esc(T('plazoCerrado'))}</span>` : ''}
  </div>
  <h3 class="empleo__puesto">${esc(o.puesto)}</h3>
  ${o.texto ? `<p class="empleo__texto">${esc(o.texto)}</p>` : ''}
  ${
    filas.length
      ? `<dl class="empleo__datos">${filas
          .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
          .join('')}</dl>`
      : ''
  }
  ${
    o.contacto && !cerrada
      ? `<p class="empleo__contacto"><a href="${escUrl(
          o.contacto.startsWith('http') ? o.contacto : `mailto:${o.contacto}`
        )}"${o.contacto.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(T('comoApuntarse'))}</a></p>`
      : ''
  }
</article>`;
}

/** La caja de «publica tu oferta»: gratis, y de paso vende la destacada. */
export function publicaTuOferta() {
  return `<div class="caja caja--llamada">
  <h2 class="caja__titulo">${esc(T('buscasAlguien'))}</h2>
  <p style="margin:0 0 14px;font-size:15px;color:var(--tinta-2)">Publicar una oferta aquí es <strong>gratis</strong> para cualquier negocio de los cinco concejos. Mándanos el puesto, la jornada y cómo apuntarse, y sale a la mañana siguiente.</p>
  <p style="margin:0"><a class="volver" style="margin:0" href="mailto:${esc(sitio.email)}">Escribir a ${esc(sitio.email)} →</a></p>
</div>`;
}

/** Dónde se publica de verdad el empleo, para quien busque en serio. */
export function dondeBuscarEmpleo() {
  if (!enlacesEmpleo.length) return '';
  return `<div class="caja">
  <h2 class="caja__titulo">${esc(T('dondeMirarAdemas'))}</h2>
  <p style="margin:0 0 14px;font-size:15px;color:var(--tinta-2)">${esc(T('dondeMirarTexto'))}</p>
  <ul class="programas">
    ${enlacesEmpleo
      .map(
        (e) => `<li${e.concejo ? ` style="${vars(e.concejo)}"` : ''}><a href="${escUrl(e.url)}" target="_blank" rel="noopener">
      ${e.concejo ? disco(e.concejo) : '<span class="disco" aria-hidden="true">·</span>'}<span>${esc(e.nombre)} ↗</span></a></li>`
      )
      .join('')}
  </ul>
</div>`;
}

/* --- las escalas: la capa didáctica ---------------------------------------- */

/** «En 20 segundos»: tres frases y ya sabes de qué va. */
export function enVeinte(puntos = [], slug = '') {
  if (!puntos.length) return '';
  return `<aside class="modulo modulo--rapido" style="${vars(slug)}" aria-labelledby="e20">
  <span class="modulo__rotulo"${claroDe(slug)} id="e20">${esc(T('en20'))}</span>
  <ol>${puntos.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
</aside>`;
}

/** La cifra: un número grande y qué significa. */
export function laCifra(cifra, slug = '') {
  if (!cifra?.numero) return '';
  return `<aside class="modulo modulo--cifra" style="${vars(slug)}" aria-labelledby="ecifra">
  <span class="modulo__rotulo"${claroDe(slug)} id="ecifra">${esc(T('laCifra'))}</span>
  <p style="margin:0">
    <span class="modulo__numero">${esc(cifra.numero)}</span>
    ${cifra.unidad ? `<span class="modulo__unidad">${esc(cifra.unidad)}</span>` : ''}
  </p>
  <p class="modulo__glosa">${esc(cifra.glosa ?? '')}</p>
</aside>`;
}

/** La palabra de aquí: un diario local que además enseña la lengua de casa. */
export function laPalabra(palabra, slug = '') {
  if (!palabra?.termino) return '';
  return `<aside class="modulo modulo--palabra" style="${vars(slug)}" aria-labelledby="epal">
  <span class="modulo__rotulo"${claroDe(slug)} id="epal">${esc(T('laPalabra'))}</span>
  <p class="modulo__palabra">${esc(palabra.termino)}</p>
  ${palabra.como ? `<p class="modulo__fonetica">${esc(T('seDice'))} ${esc(palabra.como)}</p>` : ''}
  <p class="modulo__definicion">${esc(palabra.definicion)}</p>
</aside>`;
}

/** Por qué importa: la frase que convierte una noticia en algo que te toca. */
export function porQueImporta(texto, slug = '') {
  if (!texto) return '';
  return `<aside class="modulo modulo--importa" style="${vars(slug)}" aria-labelledby="eimp">
  <span class="modulo__rotulo"${claroDe(slug)} id="eimp">${esc(T('porQueImporta'))}</span>
  <p>${esc(texto)}</p>
</aside>`;
}

/** El plano: dónde caen los cinco concejos, que casi nadie lo sabe de memoria. */
export function plano(activo = '', cuentas = {}) {
  // Esquema, no escala: el mar arriba, Nava al oeste, Cabrales al este.
  const puntos = {
    nava: [48, 128],
    villaviciosa: [118, 50],
    cabranes: [124, 122],
    pilona: [190, 146],
    cabrales: [316, 104],
  };
  const orden = ORDEN_LINEA;
  const linea = orden.map((k) => puntos[k].join(',')).join(' ');
  return `<div class="plano">
  <h2 class="plano__titulo">${esc(T('planoTitulo'))}</h2>
  <p class="plano__nota">${esc(T('planoNota'))}</p>
  <svg viewBox="0 0 360 190" role="img" aria-label="${esc(T('planoAlt'))}">
    <path d="M0 26 Q 90 8 176 24 T 360 18 L360 0 L0 0 Z" fill="var(--azul)" opacity=".18"/>
    <text x="10" y="19" font-family="var(--mono)" font-size="9" fill="currentColor" opacity=".6">CANTÁBRICO</text>
    <polyline points="${linea}" fill="none" stroke="currentColor" stroke-width="3" stroke-opacity=".25" stroke-linecap="round" stroke-linejoin="round"/>
    ${orden
      .map((slug) => {
        const c = dato(slug);
        const [x, y] = puntos[slug];
        const act = slug === activo;
        return `<g>
      <circle cx="${x}" cy="${y}" r="${act ? 17 : 13}" fill="${c.color}" stroke="currentColor" stroke-width="2.5"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle" font-family="var(--display)" font-weight="800" font-size="${(act ? 17 : 14) - (String(c.letra).length > 1 ? 4 : 0)}" fill="${slug === 'nava' ? '#14120F' : '#fff'}">${esc(c.letra)}</text>
      <text x="${x}" y="${y + (act ? 34 : 30)}" text-anchor="middle" font-family="var(--display)" font-weight="700" font-size="12" fill="currentColor">${esc(c.nombre)}</text>
    </g>`;
      })
      .join('\n')}
  </svg>
  <ul class="plano__leyenda">
    ${enLinea()
      .map((c) => {
        const n = cuentas[c.slug] ?? 0;
        return `<li><a href="${U(`/${c.slug}/`)}">${disco(c.slug)}<span>${esc(c.nombre)}</span><small>${n} ${n === 1 ? T('pieza') : T('piezas')}</small></a></li>`;
      })
      .join('')}
  </ul>
</div>`;
}

export function apunte(texto, slug = '') {
  if (!texto) return '';
  return `<aside class="apunte" style="${vars(slug)}">
  ${LOGO(44)}
  <p class="apunte__texto">${esc(texto)}<span class="apunte__quien">${esc(T('apunteFirma'))}</span></p>
</aside>`;
}

const boletin = () => {
  const conectado = Boolean(cfgBoletin.accion);
  return `<section class="boletin">
  <h2 class="boletin__titulo">${esc(T('boletinTitulo'))}</h2>
  <p class="boletin__texto">${esc(T('boletinTexto'))}</p>
  <form class="boletin__forma"${
    conectado
      ? ` action="${esc(cfgBoletin.accion)}" method="post" target="_blank"`
      : ' aria-disabled="true"'
  }>
    <label class="saltar" for="correo">${esc(T('boletinCorreo'))}</label>
    <input id="correo" type="email" name="${esc(conectado ? cfgBoletin.campoCorreo : 'correo')}" placeholder="tunombre@correo.com" autocomplete="email" required${conectado ? '' : ' disabled'}>
    <button type="submit"${conectado ? '' : ' disabled'}>${esc(T('boletinBoton'))}</button>
  </form>
  ${conectado ? '' : `<p class="boletin__nota">${esc(T('boletinNota'))}</p>`}
</section>`;
};

/* --- esqueleto ------------------------------------------------------------- */

function menu(activo) {
  const enlaces = secciones
    .filter((x) => x.slug !== 'actualidad')
    .map((x) => ({ url: `/${x.slug}/`, nombre: nombreSeccion(x), slug: x.slug }));
  return `<nav class="menu" aria-label="Secciones"><div class="contenedor">
<a href="${U('/')}"${activo === 'portada' ? ' aria-current="page"' : ''}>${esc(T('portada'))}</a>
${enlaces
  .map((e) => `<a href="${U(e.url)}"${e.slug === activo ? ' aria-current="page"' : ''}>${esc(e.nombre)}</a>`)
  .join('\n')}
<a href="${U('/quienes-somos/')}"${activo === 'quienes-somos' ? ' aria-current="page"' : ''}>${esc(T('quienesSomos'))}</a>
</div></nav>`;
}

/**
 * Las cinco paradas, en fichas, para navegar por concejo.
 *
 * POR QUÉ NO ESTÁ ARRIBA. El riel vivía en la cabecera y ocupaba 232 px en
 * móvil, de una pantalla de 800. Sumado al tiempo, la mancheta y el menú, el
 * primer titular de la portada empezaba en el píxel 993: un periódico que no
 * enseña ni una noticia sin desplazar. La línea es la marca del diario y no se
 * toca, pero su sitio es después de las noticias, no antes.
 *
 * Y en esta forma sirve para algo: son enlaces con área táctil de 44 px y la
 * cuenta de piezas de cada concejo.
 */
function navegadorConcejos(activo, cuentas = {}) {
  return `<nav class="navconcejos" aria-label="${esc(T('laLinea'))}">
  <h2 class="navconcejos__titulo">${esc(T('porConcejo'))}</h2>
  <ul class="navconcejos__lista">
    ${enLinea()
      .map((c) => {
        const n = cuentas[c.slug];
        return `<li style="${vars(c.slug)}">
      <a class="navconcejos__ficha" href="${U(`/${c.slug}/`)}"${c.slug === activo ? ' aria-current="page"' : ''}>
        ${disco(c.slug)}
        <span class="navconcejos__nombre">${esc(c.nombre)}</span>
        ${n == null ? '' : `<span class="navconcejos__cuenta">${n}</span>`}
      </a>
    </li>`;
      })
      .join('\n')}
  </ul>
</nav>`;
}

function cintaTiempo(tiempo) {
  if (!tiempo?.concejos) return `<span>${esc(sitio.lema)}</span>`;
  return `<div class="cinta__tiempo">${concejos
    .filter((c) => tiempo.concejos[c.slug])
    .map((c) => {
      const t = tiempo.concejos[c.slug];
      return `<span>${esc(c.nombre)} <b>${t.max ?? '–'}°</b>/${t.min ?? '–'}°</span>`;
    })
    .join('')}</div>`;
}

export function pagina({
  titulo,
  esPortada = false,
  descripcion,
  url = '/',
  activo = '',
  contenido,
  tiempo = null,
  fecha = new Date().toISOString(),
  jsonLd = null,
  imagen = '',
  concejoSlug = '',
  cuentas = {},
}) {
  const idi = idiomaDe(estado.idioma);
  const enlaceCanonico = sitio.url + U(url);
  const tituloCompleto = url === '/' ? `${sitio.nombre} · ${sitio.lema}` : `${titulo} · ${sitio.nombre}`;
  return `<!doctype html>
<html lang="${idi.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${escUrl(enlaceCanonico)}">
${idiomas
  .map((i) => `<link rel="alternate" hreflang="${i.codigo}" href="${escUrl(sitio.url + ruta(i.codigo, url))}">`)
  .join('\n')}
<link rel="alternate" hreflang="x-default" href="${escUrl(sitio.url + ruta(IDIOMA_BASE, url))}">
<meta property="og:type" content="${url === '/' ? 'website' : 'article'}">
<meta property="og:site_name" content="${esc(sitio.nombre)}">
<meta property="og:title" content="${esc(tituloCompleto)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${esc(enlaceCanonico)}">
<meta property="og:locale" content="${idi.htmlLang.replace('-', '_')}">
${idiomas
  .filter((i) => i.codigo !== estado.idioma)
  .map((i) => `<meta property="og:locale:alternate" content="${i.htmlLang.replace('-', '_')}">`)
  .join('\n')}
${(() => {
  // LA TARJETA AL COMPARTIR.
  //
  // Antes esto apuntaba a la ilustración de la pieza, y no funcionaba en ningún
  // sitio por dos motivos a la vez: la ruta era relativa —WhatsApp, Facebook y
  // los demás exigen una URL entera— y el fichero era un SVG, formato que
  // ninguna de esas redes sabe pintar en una vista previa. Resultado: cada vez
  // que alguien pegaba un enlace de La Prida en el grupo del pueblo, salía un
  // recuadro gris sin nada. Para un diario local, que se reparte justo así, ese
  // era probablemente el fallo más caro de todo el sitio.
  //
  // Ahora se sirve un PNG de 1200x630 hecho a medida: el del concejo si la
  // página es de uno, y el de las cinco paradas si no. Son ficheros estáticos
  // generados a mano, así que el diario no gana ni una dependencia por esto.
  const cual = concejoSlug && enLinea().some((c) => c.slug === concejoSlug)
    ? `/social/og-${concejoSlug}.png`
    : '/social/og.png';
  const abs = sitio.url + cual;
  return `<meta property="og:image" content="${esc(abs)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(sitio.nombre)} · ${esc(sitio.lema)}">
<meta name="twitter:image" content="${esc(abs)}">`;
})()}
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="${esc(sitio.nombre)}" href="${estado.idioma === IDIOMA_BASE ? '/feed.xml' : `/${estado.idioma}/feed.xml`}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${estado.fuentesPropias
  ? '<link rel="stylesheet" href="/fuentes/fuentes.css">'
  : `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=Martian+Mono:wght@400;600&display=swap" rel="stylesheet">`}
<link rel="stylesheet" href="/estilos.css">
${verificacion.google ? `<meta name="google-site-verification" content="${esc(verificacion.google)}">` : ''}
<script type="application/ld+json">${jsonEnScript({
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  name: sitio.nombre,
  url: sitio.url,
  slogan: sitio.lema,
  email: sitio.email,
  areaServed: concejos.map((c) => ({ '@type': 'AdministrativeArea', name: `${c.nombre}, Asturias` })),
})}</script>
<script type="application/ld+json">${jsonEnScript({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: sitio.nombre,
  url: sitio.url,
  inLanguage: idi.htmlLang,
  publisher: { '@type': 'NewsMediaOrganization', name: sitio.nombre, url: sitio.url },
})}</script>
${jsonLd ? `<script type="application/ld+json">${jsonEnScript(jsonLd)}</script>` : ''}
<script>
  try {
    var t = localStorage.getItem('prida-tema');
    if (t) document.documentElement.dataset.tema = t;
  } catch (e) {}
  // Seguridad: si otra web mete La Prida dentro de un marco (para engañar al
  // lector con clics encima), la página sale del marco. GitHub Pages no deja
  // enviar la cabecera que lo prohíbe (frame-ancestors / X-Frame-Options).
  if (window.top !== window.self) {
    try { window.top.location.replace(window.self.location.href); } catch (e) {}
  }
</script>
${
  anuncios.activo && anuncios.adsense.cliente
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(
        anuncios.adsense.cliente
      )}" crossorigin="anonymous"></script>`
    : ''
}
${
  // El contador, si lo hay. Sin cookies: por eso no hace falta pedir permiso.
  // Con el token vacío no se carga absolutamente nada.
  analitica.token
    ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${esc(
        analitica.token
      )}"}'></script>`
    : ''
}
</head>
<body>
<a class="saltar" href="#principal">${esc(T('saltar'))}</a>

<div class="cinta"><div class="contenedor">
  ${cintaTiempo(tiempo)}
  <div class="cinta__mandos">
    ${selectorIdioma(url)}
    <button class="cinta__tema" type="button" data-tema-boton>${esc(T('modoNoche'))}</button>
  </div>
</div></div>

<header class="cabecera">
  <div class="contenedor">
    <div class="cabecera__alto">
      <a class="marca" href="${U('/')}">
        ${LOGO(54)}
        <span>
          ${
            // En la portada, el nombre del diario ES el encabezado de la
            // página: no había ningún h1 y eso deja a un lector de pantalla
            // sin punto de entrada, además de perjudicar en buscadores. En el
            // resto de páginas el h1 es el titular, y aquí va un simple span.
            esPortada
              ? `<h1 class="marca__nombre">La Prida</h1>`
              : `<span class="marca__nombre">La Prida</span>`
          }
          <span class="marca__lema">${esc(T('lema'))}</span>
        </span>
      </a>
      <p class="cabecera__data">
        <span class="cabecera__fecha">${esc(fechaLarga(fecha))}</span>
        <span class="cabecera__hora">${esc(rotuloDeEdicion(edicionActual()))}</span>
      </p>
    </div>
  </div>
  ${menu(activo)}
</header>
${
  estado.muestra
    ? `<p class="muestra">Edición de muestra: estas piezas son de ejemplo. Ejecuta la ingesta para llenarla de noticias reales.</p>`
    : ''
}

<main id="principal">
${contenido}
</main>
${esPortada ? '' : `<div class="contenedor">${navegadorConcejos(activo, cuentas)}</div>`}

<footer class="pie">
  <div class="contenedor">
    <div class="pie__rejilla">
      <div>
        <h2 class="pie__titulo">La Prida</h2>
        <p style="margin:0 0 12px;color:var(--tinta-2);max-width:44ch">${esc(sitio.descripcion)}</p>
        <p style="margin:0;color:var(--tinta-3);font-size:13.5px;line-height:1.6">Las piezas se redactan a partir de fuentes públicas y de medios locales, siempre citados y enlazados. Si algo está mal, se corrige: ${esc(sitio.email)}.</p>
      </div>
      <div>
        <h2 class="pie__titulo">${esc(T('concejosPie'))}</h2>
        <ul>${concejos.map((c) => `<li><a href="${U(`/${c.slug}/`)}">${esc(c.nombre)}</a></li>`).join('')}</ul>
      </div>
      <div>
        <h2 class="pie__titulo">${esc(T('laLinea'))}</h2>
        <ul>
          ${secciones
            .filter((x) => x.slug !== 'actualidad')
            .map((x) => `<li><a href="${U(`/${x.slug}/`)}">${esc(nombreSeccion(x))}</a></li>`)
            .join('')}
          <li><a href="${estado.idioma === IDIOMA_BASE ? '/feed.xml' : `/${estado.idioma}/feed.xml`}">${esc(T('rss'))}</a></li>
          <li><a href="${U('/quienes-somos/')}">${esc(T('quienesSomos'))}</a></li>
          <li><a href="${U('/anunciate/')}"><strong>${esc(T('anunciate'))}</strong></a></li>
          <li><a href="${U('/aviso-legal/')}">${esc(T('cookiesLegal'))}</a></li>
        </ul>
      </div>
    </div>
    <div class="pie__legal">
      <span>© ${new Date().getFullYear()} ${esc(sitio.nombre)}</span>
      <span>${esc(T('hechoEn'))}</span>
      <span><a href="${U('/accesibilidad/')}">${esc(T('accesibilidad'))}</a></span>
    </div>
  </div>
</footer>

${
  // El aviso de cookies solo aparece si HAY algo que consentir.
  //
  // Decía «usamos cookies propias y de terceros para medir visitas y mostrar
  // publicidad», y no era verdad: no hay analítica y AdSense está apagado. Lo
  // único que se guarda es si prefieres modo noche, que es una preferencia que
  // tú mismo pides y no necesita consentimiento. Pedir permiso para algo que no
  // se hace no es prudencia: es tapar la portada con una mentira y acostumbrar
  // al lector a aceptar sin leer.
  //
  // En cuanto se encienda la publicidad o se ponga un medidor que use cookies,
  // vuelve solo.
  anuncios.activo && anuncios.adsense.cliente
    ? `<div class="cookies" id="cookies">
  <p>${esc(T('cookiesTexto'))} <a href="${U('/aviso-legal/')}">${esc(T('cookiesLegal'))}</a>.</p>
  <div class="cookies__botones">
    <button class="cookies__no" type="button" data-cookies="no">${esc(T('cookiesSolo'))}</button>
    <button class="cookies__si" type="button" data-cookies="si">${esc(T('cookiesSi'))}</button>
  </div>
</div>`
    : ''
}

<script>
(function () {
  var DIA = ${JSON.stringify(T('modoDia'))};
  var NOCHE = ${JSON.stringify(T('modoNoche'))};
  var raiz = document.documentElement;
  var boton = document.querySelector('[data-tema-boton]');
  function pintar() {
    var oscuro = raiz.dataset.tema
      ? raiz.dataset.tema === 'oscuro'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    if (boton) boton.textContent = oscuro ? ${JSON.stringify.name ? '' : ''}DIA : NOCHE;
  }
  if (boton) {
    boton.addEventListener('click', function () {
      var oscuro = raiz.dataset.tema
        ? raiz.dataset.tema === 'oscuro'
        : matchMedia('(prefers-color-scheme: dark)').matches;
      raiz.dataset.tema = oscuro ? 'claro' : 'oscuro';
      try { localStorage.setItem('prida-tema', raiz.dataset.tema); } catch (e) {}
      pintar();
    });
  }
  pintar();

  // Filtros de la cartelera. Progresivo: sin JS se ve todo, que es lo correcto.
  var filtros = document.querySelector('.filtros');
  if (filtros) {
    filtros.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-filtro]');
      if (!b) return;
      var quiere = b.dataset.filtro;
      filtros.querySelectorAll('[data-filtro]').forEach(function (x) {
        x.classList.toggle('filtro--activo', x === b);
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      document.querySelectorAll('[data-cartelera] [data-clave]').forEach(function (it) {
        it.hidden = quiere !== 'todo' && it.dataset.clave !== quiere;
      });
      document.querySelectorAll('[data-cartelera]').forEach(function (lista) {
        var vivos = lista.querySelectorAll('[data-clave]:not([hidden])').length;
        var titulo = lista.previousElementSibling;
        lista.hidden = vivos === 0;
        if (titulo && titulo.classList.contains('titulo-seccion')) titulo.hidden = vivos === 0;
      });
    });
  }

  // El aviso de cookies solo existe si hay algo que consentir. Si no está
  // dibujado, aquí no hay nada que hacer — y sin esta comprobación la línea
  // siguiente reventaba el script en todas las páginas del sitio.
  var caja = document.getElementById('cookies');
  if (caja) {
    try {
      if (!localStorage.getItem('prida-cookies')) caja.dataset.visible = 'si';
    } catch (e) {}
    caja.addEventListener('click', function (ev) {
      var v = ev.target.getAttribute && ev.target.getAttribute('data-cookies');
      if (!v) return;
      try { localStorage.setItem('prida-cookies', v); } catch (e) {}
      caja.dataset.visible = 'no';
    });
  }
})();
</script>
</body>
</html>`;
}

/* --- páginas --------------------------------------------------------------- */

/**
 * «Lo práctico de hoy»: el corte de agua, la oferta de trabajo, el curso con
 * plazo y la próxima cita, en una sola banda.
 *
 * POR QUÉ EXISTE. Un vecino no vuelve tres veces al día por las noticias: vuelve
 * por si le cortan el agua el martes. Todo esto ya estaba en el diario, pero
 * repartido en cuatro secciones distintas, a tres toques de distancia. Juntarlo
 * arriba no añade contenido: lo pone donde se busca.
 *
 * Si no hay nada que poner, la banda no se dibuja.
 */
function bandaPractica({ avisos = [], empleo = [], cursos = [], agenda = [] }) {
  const filas = [];
  const a = avisos[0];
  if (a) filas.push({ clase: 'aviso', etiqueta: T('etiqAviso'), texto: a.titular ?? a.titulo, url: a.url ?? '/avisos/' });
  const e = empleo[0];
  if (e) filas.push({ clase: 'trabajo', etiqueta: T('etiqTrabajo'), texto: [e.puesto, e.concejo].filter(Boolean).join(' · '), url: '/trabajo/' });
  const c = cursos[0];
  if (c) filas.push({ clase: 'curso', etiqueta: T('etiqCurso'), texto: [c.titulo, c.concejo].filter(Boolean).join(' · '), url: '/cursos/' });
  const g = agenda[0];
  if (g) filas.push({ clase: 'agenda', etiqueta: T('etiqAgenda'), texto: g.titulo ?? g.titular, url: g.url ?? '/agenda/' });

  if (!filas.length) return '';

  return `<section class="practico" aria-labelledby="practico-t">
  <h2 class="practico__titulo" id="practico-t">${esc(T('loPractico'))}</h2>
  <ul class="practico__lista">
    ${filas
      .map(
        (f) => `<li><a class="practico__fila" href="${escUrl(U(f.url))}">
      <span class="practico__etiq practico__etiq--${f.clase}">${esc(f.etiqueta)}</span>
      <span class="practico__texto">${esc(f.texto ?? '')}</span>
    </a></li>`
      )
      .join('\n')}
  </ul>
</section>`;
}

/**
 * El destacado de pago del tablón. Sin nada destacado, no se dibuja: ver la
 * nota de `hueco()` sobre por qué un recuadro vacío es peor que ninguno.
 */
function destacadoTablon(anunciosTablon = []) {
  const d = anunciosTablon.find((x) => x.destacado && !x.ejemplo);
  if (!d) return '';
  return `<aside class="destacado" aria-label="${esc(T('destacadoTablon'))}">
  <p class="destacado__marca">${esc(T('destacadoTablon'))}</p>
  <a class="destacado__cuerpo" href="${escUrl(U('/tablon/'))}">
    <span class="destacado__titulo">${esc(d.titulo)}</span>
    <span class="destacado__pie">${esc([d.zona, d.concejo].filter(Boolean).join(', '))}${d.precio ? ` · ${esc(d.precio)}` : ''}</span>
  </a>
</aside>`;
}

/**
 * Las piezas que le importan a quien viene de fuera.
 *
 * HALLAZGO: no hacía falta escribir nada nuevo. La puja del queso de Cabrales,
 * el Festival de la Manzana, los cuarenta años de la Banda de Gaites, el cine
 * en los praos — todo eso ya estaba en el diario, enterrado bajo la etiqueta
 * «deporte y cultura», que es donde nadie de fuera va a mirar. Se reordena.
 */
/**
 * Vocabulario de lo que le interesa a quien viene de fuera.
 *
 * POR QUÉ HACE FALTA. La primera versión filtraba solo por sección —«agenda» y
 * «deporte y cultura»— y salió mal a la primera: la noticia más turística del
 * día, el Festival de la Manzana declarado de Interés Turístico Nacional, está
 * clasificada como «actualidad». La portada española la sacaba de apertura y la
 * inglesa la descartaba, y abría con un concurso ganadero de hacía 23 días.
 *
 * La sección dice de qué habla la redacción; esto dice a quién le importa. No
 * son lo mismo y hacía falta preguntar las dos cosas.
 */
const DE_INTERES_FORASTERO = new RegExp(
  '\\b(' +
    [
      'fiesta', 'fiestas', 'festival', 'romer[ií]a', 'certamen', 'concurso', 'feria',
      'exposici[oó]n', 'muestra', 'mercado', 'museo', 'ruta', 'senda', 'mirador',
      'sidra', 'llagar', 'manzana', 'queso', 'queser[ií]a', 'gaita', 'gaites',
      'concierto', 'jornadas', 'descenso', 'pr[eé]stamo', 'patrimonio',
      'r[oó]manico', 'rom[aá]nico', 'picos de europa', 'cares', 'interés turístico',
    ].join('|') +
    ')',
  'i'
);

const interesaAlForastero = (p) =>
  DE_INTERES_FORASTERO.test(`${p.titular ?? ''} ${p.entradilla ?? ''}`);

function piezasDeVisitante(piezas) {
  const culturales = piezas.filter(
    (x) => ['agenda', 'deporte-y-cultura'].includes(x.seccion) || interesaAlForastero(x)
  );
  const limite = Date.now() - frescura.tira * 86400000;
  const frescas = culturales.filter((x) => {
    const t = new Date(x.fecha).getTime();
    return Number.isFinite(t) ? t >= limite : false;
  });
  // Si no hay nada reciente, no se deja la portada en blanco ni se finge que lo
  // hay: se enseña lo último y el rótulo lo dice. Es la misma regla que ya
  // gobierna la tira de la portada española.
  const lista = frescas.length ? frescas : culturales;

  // Y una última pasada: en una portada en inglés, una pieza TRADUCIDA va antes
  // que una sin traducir de la misma tanda.
  //
  // No es un capricho de orden. Ahora mismo solo 23 de las 103 piezas tienen
  // traducción y ninguna de las recientes la tiene, así que sin esta regla la
  // portada inglesa abre con un titular en español. Entre enseñar lo más fresco
  // en un idioma que el lector no entiende y enseñar lo segundo más fresco en el
  // suyo, gana lo segundo. No arregla el problema de fondo —que la traducción
  // lleva parada desde el 19 de septiembre— pero no lo restriega en portada.
  const traducida = (x) => {
    const t = x?.trad?.[estado.idioma];
    return !!(t && typeof t.titular === 'string' && t.titular.trim());
  };
  const ordenada = [...lista.filter(traducida), ...lista.filter((x) => !traducida(x))];

  return { lista: ordenada, fresco: frescas.length > 0 };
}

/** «Dónde ir»: los cinco concejos, con una línea cada uno para quien no los conoce. */
function dondeIr(cuentas = {}) {
  return `<section class="dondeir" aria-labelledby="dondeir-t">
  <h2 class="dondeir__titulo" id="dondeir-t">${esc(T('dondeIr'))}</h2>
  <ul class="dondeir__lista">
    ${enLinea()
      .map((c) => {
        // El lema lo escribió Emilio para cada concejo; en los otros idiomas
        // se traduce, no se inventa. Si faltara, cae en el original.
        const linea = T(`lema_${c.slug}`) || c.lema || c.capital;
        return `<li style="${vars(c.slug)}">
      <a class="dondeir__fila" href="${U(`/${c.slug}/`)}">
        ${disco(c.slug)}
        <span class="dondeir__texto">
          <span class="dondeir__nombre">${esc(c.nombre)}</span>
          <span class="dondeir__pie">${esc(linea)}</span>
        </span>
        ${cuentas[c.slug] == null ? '' : `<span class="dondeir__cuenta">${cuentas[c.slug]}</span>`}
      </a>
    </li>`;
      })
      .join('\n')}
  </ul>
</section>`;
}

export function portada({ piezas, despertadorDatos, tiempo, agenda, avisos, empleo = [], cursos = [], tablon = [] }) {
  // Cuatro niveles, como un periódico de papel: la de apertura, dos medianas,
  // tres menores sin foto, y una tira de titulares. Con dos niveles todo lo que
  // no era la apertura pesaba igual, y el lector no tenía por dónde empezar.
  //
  // Y antes de repartir, el filtro que faltaba: solo entra lo FRESCO. La
  // portada llegó a abrir con una pieza de hacía diecinueve días porque cogía
  // las más recientes sin preguntarse si eran recientes de verdad. Si no hay
  // material, la portada sale corta; rellenar hacia atrás, no.
  const recientes = (dias) => {
    const limite = Date.now() - dias * 86400000;
    return piezas.filter((p) => {
      const t = new Date(p.fecha).getTime();
      return Number.isFinite(t) ? t >= limite : false;
    });
  };
  const delDia = recientes(frescura.portada);
  const [primera, ...resto] = delDia;
  const medianas = resto.slice(0, 2);
  const menores = resto.slice(2, 5);

  // Lo que ya va arriba no se repite abajo.
  const yaPuestas = new Set(delDia.slice(0, 6).map((p) => p.url));

  // La tira admite más recorrido. Y si un día NO hay nada fresco, la portada no
  // se queda en blanco ni finge: se enseña lo último que hay, bajo un rótulo
  // que dice exactamente eso. Abrir con algo de hace tres semanas es mentir;
  // decir «lo último» y poner la fecha, no.
  const tiraFresca = recientes(frescura.tira).filter((p) => !yaPuestas.has(p.url));
  // El rótulo describe lo que hay DEBAJO de él, no lo que haya arriba. Si la
  // tira ha tenido que tirar de archivo, se llama «lo último» aunque la
  // apertura sí sea de hoy: si no, se estaría vendiendo como novedad algo de
  // hace tres semanas, que es justo lo que había que quitar.
  const hayArchivo = tiraFresca.length === 0;
  const listaLarga = (hayArchivo ? piezas.filter((p) => !yaPuestas.has(p.url)) : tiraFresca).slice(0, 8);
  const rotuloTira = hayArchivo ? T('loUltimo') : T('sigueLinea');

  // «Las tres paradas» se esconde si es de ayer: un módulo caducado hace más
  // daño que no tenerlo.
  const puntosFrescos = (() => {
    const f = despertadorDatos?.fecha ? new Date(despertadorDatos.fecha).getTime() : NaN;
    if (!Number.isFinite(f)) return null;
    return Date.now() - f <= frescura.despertador * 86400000 ? despertadorDatos.puntos : null;
  })();
  const cuentas = Object.fromEntries(
    concejos.map((c) => [c.slug, piezas.filter((p) => p.concejoSlug === c.slug).length])
  );

  // La cuenta, en singular cuando toca. Decía «1 piezas».
  const cuenta = (n) => `${n} ${n === 1 ? T('pieza') : T('piezas')}`;

  // ── Dos portadas, un periódico ────────────────────────────────────────────
  //
  // El de aquí y el de fuera no vienen a lo mismo. El vecino vuelve tres veces
  // al día y quiere saber si le cortan el agua; el que llega desde Google
  // buscando los Picos de Europa viene una vez en su vida, antes de un viaje, y
  // los cortes de agua en Yernes no le dicen nada.
  //
  // Hasta ahora las cuatro portadas eran el mismo calco traducido. Ahora la
  // maquinaria es la misma —misma ingesta, mismas piezas, mismas plantillas— y
  // lo único que cambia es el ORDEN en que se componen, según el idioma.
  const paraVisitante = estado.idioma !== IDIOMA_BASE;

  const columnaLocal = `
      ${primera ? destacada(primera) : `<p class="vacio">${esc(textoSinNovedad())}</p>`}
      ${medianas.length ? `<div class="piezas piezas--2">${medianas.map((p) => tarjeta(p)).join('\n')}</div>` : ''}
      ${menores.length ? `<div class="piezas piezas--3 piezas--menores">${menores.map((p) => tarjeta(p, { nivel: 'menor' })).join('\n')}</div>` : ''}
      ${bandaPractica({ avisos, empleo, cursos, agenda })}
      ${bloqueDespertador(puntosFrescos, despertadorDatos?.fecha ?? new Date().toISOString())}
      ${destacadoTablon(tablon)}
      ${
        listaLarga.length
          ? `<h2 class="titulo-seccion">${esc(rotuloTira)} <span class="cuenta">${esc(cuenta(listaLarga.length))}</span></h2>
      <ul class="tira">${listaLarga.map(filaLista).join('\n')}</ul>`
          : ''
      }
      ${navegadorConcejos('portada', cuentas)}
      ${boletin()}`;

  // Portada de visitante: primero lo que se puede planear, después lo que pasa.
  const { lista: deFuera, fresco: hayFresco } = piezasDeVisitante(piezas);
  const [cabezaV, ...restoV] = deFuera;
  const yaEnV = new Set(deFuera.slice(0, 4).map((x) => x.url));
  const noticiasV = piezas.filter((x) => !yaEnV.has(x.url)).slice(0, 6);

  const columnaVisitante = `
      <p class="ladillo">${esc(hayFresco ? T('loQuePasaAhora') : T('loUltimo'))}</p>
      ${cabezaV ? destacada(cabezaV) : `<p class="vacio">${esc(textoSinNovedad())}</p>`}
      ${restoV.length ? `<div class="piezas piezas--3">${restoV.slice(0, 3).map((x) => tarjeta(x)).join('\n')}</div>` : ''}
      ${dondeIr(cuentas)}
      ${
        noticiasV.length
          ? `<h2 class="titulo-seccion">${esc(T('deLosConcejos'))} <span class="cuenta">${esc(cuenta(noticiasV.length))}</span></h2>
      <ul class="tira">${noticiasV.map(filaLista).join('\n')}</ul>`
          : ''
      }
      ${boletin()}`;

  const lateralLocal = `
      ${
        agenda.length
          ? `<div><h2 class="titulo-seccion">${esc(T('laAgenda'))}</h2>
      <div class="agenda">${agenda.slice(0, 5).map(itemAgenda).join('\n')}</div>
      <a class="volver" href="${U('/agenda/')}">${esc(T('verAgenda'))}</a></div>`
          : ''
      }
      ${
        avisos.length
          ? `<div><h2 class="titulo-seccion">${esc(T('avisos'))}</h2>
      <div class="avisos">${avisos.slice(0, 4).map(itemAviso).join('\n')}</div></div>`
          : ''
      }
      ${patrocinios()}`;

  // El mapa se queda SOLO en las portadas traducidas. En español duplicaba al
  // navegador de concejos, con los mismos cinco nombres y las mismas cuentas a
  // dos dedos de distancia; para quien no sabe dónde cae Cabranes, en cambio,
  // es justo lo que hace falta.
  const lateralVisitante = `
      ${plano('', cuentas)}
      ${
        agenda.length
          ? `<div><h2 class="titulo-seccion">${esc(T('laAgenda'))}</h2>
      <div class="agenda">${agenda.slice(0, 5).map(itemAgenda).join('\n')}</div>
      <a class="volver" href="${U('/agenda/')}">${esc(T('verAgenda'))}</a></div>`
          : ''
      }
      ${patrocinios()}`;

  return pagina({
    titulo: T('portada'),
    descripcion: paraVisitante ? T('descripcionVisitante') : sitio.descripcion,
    url: '/',
    activo: 'portada',
    esPortada: true,
    tiempo,
    cuentas,
    contenido: `<div class="contenedor">
  <div class="rejilla">
    <div>${paraVisitante ? columnaVisitante : columnaLocal}
    </div>

    <aside class="lateral">${paraVisitante ? lateralVisitante : lateralLocal}
    </aside>
  </div>
</div>`,
  });
}

export function itemAviso(a) {
  return `<a class="aviso" href="${escUrl(U(a.url ?? '/avisos/'))}">
  <span class="aviso__icono" aria-hidden="true">${esc(a.icono ?? '⚠️')}</span>
  <span><span class="aviso__que">${esc(a.titular)}</span>
  <span class="aviso__detalle">${esc(a.entradilla ?? a.concejo ?? '')}</span></span>
</a>`;
}

export function paginaConcejo(concejo, piezas, tiempo, cuentas = {}) {
  const [primera, ...resto] = piezas;
  const t = tiempo?.concejos?.[concejo.slug];
  return pagina({
    titulo: concejo.nombre,
    descripcion: `Noticias de ${concejo.nombre} (${concejo.capital}): ${concejo.lema}. Actualizado cada mañana en La Prida.`,
    url: `/${concejo.slug}/`,
    activo: concejo.slug,
    concejoSlug: concejo.slug,
    tiempo,
    cuentas,
    contenido: `<div class="contenedor" style="${vars(concejo.slug)}">
  <div class="portico portico--concejo">
    <span class="chapa" style="${vars(concejo.slug)}">${disco(concejo.slug)}${esc(T('parada'))} ${esc(concejo.letra)}</span>
    <h1>${esc(concejo.nombre)}</h1>
    <p>${esc(concejo.lema)}. La capital es ${esc(concejo.capital)}${
      t ? ` y hoy hace ${t.max ?? '–'}°/${t.min ?? '–'}°${t.estado ? `, ${esc(t.estado.toLowerCase())}` : ''}` : ''
    }.</p>
  </div>
  <div class="rejilla">
    <div>
      ${primera ? destacada(primera) : `<p class="vacio">${esc(textoSinNovedad())}</p>`}
      ${resto.length ? `<div class="piezas piezas--2">${resto.slice(0, 8).map((p) => tarjeta(p)).join('\n')}</div>` : ''}
      ${resto.length > 8 ? `<h2 class="titulo-seccion">${esc(T('loQueSeHizo'))}</h2><ul class="tira">${resto.slice(8).map(filaLista).join('\n')}</ul>` : ''}
      ${boletin()}
    </div>
    <aside class="lateral">
      ${plano(concejo.slug, cuentas)}
      <div class="caja">
        <h2 class="caja__titulo">${esc(T('deDondeSale'))}</h2>
        <p style="margin:0 0 12px;font-size:15px;color:var(--tinta-2)">${esc(T('deDondeSaleTexto'))}</p>
        <p style="margin:0"><a class="volver" style="margin:0" href="${escUrl(concejo.web)}" target="_blank" rel="noopener">${esc(T('ayuntamientoDe'))} ${esc(concejo.nombre)} →</a></p>
      </div>
      ${patrocinios(concejo.slug)}
      ${hueco('lateral')}
    </aside>
  </div>
</div>`,
  });
}

export function paginaSeccion(seccion, piezas, tiempo, extra = '', cuentas = {}) {
  return pagina({
    titulo: nombreSeccion(seccion),
    descripcion: `${descripcionSeccion(seccion)}`,
    url: `/${seccion.slug}/`,
    activo: seccion.slug,
    tiempo,
    cuentas,
    contenido: `<div class="contenedor">
  <div class="portico">
    <h1>${esc(nombreSeccion(seccion))}</h1>
    <p>${esc(descripcionSeccion(seccion))}</p>
  </div>
  ${extra}
  ${
    piezas.length
      ? `<div class="piezas piezas--3">${piezas.map((p) => tarjeta(p)).join('\n')}</div>`
      : `<p class="vacio">${esc(T('nadaPorAqui'))}</p>`
  }
  ${hueco('portadaMedia')}
  ${boletin()}
</div>`,
  });
}

// Los nombres de licencia son términos con traducción establecida; los códigos
// (CC BY-SA 4.0) no se tocan nunca, que son identificadores.
const LICENCIAS = {
  'Dominio público': { en: 'Public domain', fr: 'Domaine public', de: 'Gemeinfrei' },
};
const licenciaEn = (nombre) =>
  estado.idioma === IDIOMA_BASE ? nombre : LICENCIAS[nombre]?.[estado.idioma] ?? nombre;

/** Qué se escribe debajo de la foto, según de dónde salga. */
/**
 * El crédito de una foto.
 *
 * Con CC BY y CC BY-SA esto deja de ser cortesía y pasa a ser la condición que
 * te permite usar la foto. Lo que la licencia exige, y que aquí se cumple
 * entero: quién la hizo, qué licencia tiene, poder LEER esa licencia, de dónde
 * sale la foto, y decir si se ha tocado. Se redimensiona siempre a 1600 px, así
 * que siempre se ha tocado y siempre se dice.
 *
 * Si algún día falta un dato de los obligatorios, es preferible no publicar la
 * foto antes que publicarla mal acreditada.
 */
export function pieDeFoto(p) {
  if (p.ilustracion) return T('ilustracionDe');
  if (p.credito) {
    const c = p.credito;
    const licencia = c.licenciaUrl
      ? `<a href="${escUrl(c.licenciaUrl)}" target="_blank" rel="noopener license">${esc(licenciaEn(c.licencia))}</a>`
      : esc(licenciaEn(c.licencia));
    const tocada = c.atribucion && c.redimensionada ? ` · ${esc(T('redimensionada'))}` : '';
    return `${c.pie ? `${esc(c.pie)}. ` : ''}${esc(T('foto'))}: ${esc(c.autor)} · ${licencia} · <a href="${escUrl(c.origen)}" target="_blank" rel="noopener">${esc(c.fuente)}</a>${tocada}`;
  }
  return `${esc(T('imagenDe'))} ${esc(p.fuente?.nombre ?? '—')}.`;
}

export function paginaArticulo(p, relacionadas, tiempo, cuentas = {}) {
  const concejo = concejos.find((c) => c.slug === p.concejoSlug);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: tr(p, 'titular'),
    description: tr(p, 'entradilla'),
    datePublished: p.fecha,
    dateModified: p.fecha,
    image: p.imagen ? [p.imagen] : undefined,
    author: { '@type': 'Organization', name: sitio.autor },
    publisher: { '@type': 'Organization', name: sitio.nombre },
    contentLocation: { '@type': 'Place', name: `${p.concejo}, Asturias, España` },
    inLanguage: idiomaDe(estado.idioma).htmlLang,
    mainEntityOfPage: sitio.url + U(p.url),
  };

  // Las escalas: sólo aparecen las que la pieza traiga de verdad.
  const escalas = [
    enVeinte(tr(p, 'enVeinte'), p.concejoSlug),
    laCifra(tr(p, 'cifra'), p.concejoSlug),
    laPalabra(tr(p, 'palabra'), p.concejoSlug),
    porQueImporta(tr(p, 'porQue'), p.concejoSlug),
  ].filter(Boolean);

  const traducida = estaTraducida(p);
  const cuerpo = traducida ? tr(p, 'cuerpo') ?? [] : p.cuerpo ?? [];
  const corte = Math.min(2, cuerpo.length);

  return pagina({
    titulo: tr(p, 'titular'),
    descripcion: tr(p, 'entradilla') || tr(p, 'titular'),
    url: p.url,
    activo: p.concejoSlug,
    tiempo,
    cuentas,
    fecha: p.fecha,
    imagen: p.imagen,
    concejoSlug: p.concejoSlug,
    jsonLd,
    contenido: `<div class="contenedor" style="${vars(p.concejoSlug)}">
  <article class="articulo">
    <div class="articulo__chapas">
      <a href="${U(`/${p.concejoSlug}/`)}" style="text-decoration:none">${chapa(p)}</a>
      <span class="rotulo" style="color:var(--tinta-3)">${esc(
        (() => {
          const s = secciones.find((x) => x.slug === p.seccion);
          return s ? nombreSeccion(s) : T('portada');
        })()
      )}</span>
      ${p.tipoEvento ? selloTipo(p.tipoEvento) : ''}
    </div>
    <h1 class="articulo__titular">${esc(tr(p, 'titular'))}</h1>
    ${tr(p, 'entradilla') ? `<p class="articulo__entradilla">${esc(tr(p, 'entradilla'))}</p>` : ''}
    <p class="articulo__firma">
      <span>${esc(sitio.autor)}</span><span>·</span>
      <time datetime="${esc(p.fecha)}">${esc(fechaLarga(p.fecha))}</time><span>·</span>
      <span>${esc(concejo?.capital ?? p.concejo)}</span>
    </p>
    ${p.imagen ? `<img class="articulo__foto" src="${esc(p.imagen)}" alt="">` : ''}
    ${p.imagen ? `<p class="articulo__pie">${pieDeFoto(p)}</p>` : ''}
    ${
      estado.idioma === IDIOMA_BASE
        ? ''
        : traducida
          ? `<p class="nota-idioma">${esc(T('traduccionAuto'))}</p>`
          : `<p class="nota-idioma nota-idioma--aviso">${esc(T('sinTraducir'))}
             <a href="${rutaLimpia(ruta(IDIOMA_BASE, p.url))}" lang="es">${esc(T('leerEnEspanol'))}</a></p>`
    }
    ${fichaPlan(p)}
    ${escalas[0] ? `<div class="escalas">${escalas[0]}</div>` : ''}
    <div class="articulo__cuerpo articulo__cuerpo--inicio">
      ${cuerpo.slice(0, corte).map((par) => `<p>${esc(par)}</p>`).join('\n')}
    </div>
    ${escalas.length > 1 ? `<div class="escalas">${escalas.slice(1, 3).join('\n')}</div>` : ''}
    <div class="articulo__cuerpo">
      ${cuerpo.slice(corte).map((par) => `<p>${esc(par)}</p>`).join('\n')}
    </div>
    ${escalas[3] ? `<div class="escalas">${escalas[3]}</div>` : ''}
    ${apunte(tr(p, 'apunte'), p.concejoSlug)}
    ${hueco('articuloTexto')}
    ${
      p.fuente?.url
        ? `<p class="fuente"><strong>${esc(T('fuenteTitulo'))}</strong> ${esc(T('fuenteTexto'))}
      <a href="${escUrl(p.fuente.url)}" target="_blank" rel="noopener">${esc(p.fuente.nombre)}</a>${
            p.fuente.titularOriginal ? `: «${esc(p.fuente.titularOriginal)}»` : ''
          }. ${esc(T('fuenteError'))} ${esc(sitio.email)}.</p>`
        : ''
    }
    <a class="volver" href="${U(`/${p.concejoSlug}/`)}">← ${esc(T('volverParada'))} ${esc(concejo?.letra ?? '')} · ${esc(p.concejo)}</a>
  </article>

  ${
    relacionadas.length
      ? `<section style="max-width:1200px;margin:56px auto 0">
    <h2 class="titulo-seccion">${esc(T('sigueLinea'))}</h2>
    <div class="piezas piezas--3">${relacionadas.map((r) => tarjeta(r)).join('\n')}</div>
  </section>`
      : ''
  }
  ${boletin()}
</div>`,
  });
}

export function paginaTexto({ titulo, descripcion, url, html, activo = '', cuentas = {} }) {
  return pagina({
    titulo,
    descripcion,
    url,
    activo,
    cuentas,
    contenido: `<div class="contenedor"><article class="articulo">
  <h1 class="articulo__titular" style="font-size:clamp(30px,5vw,46px)">${esc(titulo)}</h1>
  <div class="articulo__cuerpo" style="margin-top:22px">${html}</div>
</article></div>`,
  });
}
