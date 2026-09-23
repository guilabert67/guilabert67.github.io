// Lector de RSS/Atom sin dependencias. Node 18+ (usa fetch nativo).

const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü',
  laquo: '«', raquo: '»', hellip: '…', mdash: '—', ndash: '–',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', deg: '°', euro: '€',
};

export function decodificar(txt = '') {
  return txt
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => (n in ENTIDADES ? ENTIDADES[n] : m));
}

export function sinHtml(txt = '') {
  return decodificar(
    txt
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<\/(p|div|li|h[1-6]|br)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function etiqueta(bloque, nombre) {
  const re = new RegExp(`<${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${nombre}>`, 'i');
  const m = bloque.match(re);
  return m ? decodificar(m[1]).trim() : '';
}

function atributo(bloque, nombre, attr) {
  const re = new RegExp(`<${nombre}\\b[^>]*\\b${attr}=["']([^"']+)["']`, 'i');
  const m = bloque.match(re);
  return m ? decodificar(m[1]).trim() : '';
}

function imagenDe(bloque) {
  return (
    atributo(bloque, 'media:content', 'url') ||
    atributo(bloque, 'media:thumbnail', 'url') ||
    atributo(bloque, 'enclosure', 'url') ||
    (bloque.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? '')
  );
}

function fechaDe(bloque) {
  const bruto =
    etiqueta(bloque, 'pubDate') ||
    etiqueta(bloque, 'published') ||
    etiqueta(bloque, 'updated') ||
    etiqueta(bloque, 'dc:date');
  const d = bruto ? new Date(bruto) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
}

/** Convierte el XML de un feed RSS o Atom en una lista de objetos planos. */
export function parsearFeed(xml, origen = '') {
  const items = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  return items.map((bloque) => {
    const enlace =
      etiqueta(bloque, 'link') ||
      atributo(bloque, 'link', 'href') ||
      etiqueta(bloque, 'guid');
    const cuerpo =
      etiqueta(bloque, 'content:encoded') ||
      etiqueta(bloque, 'content') ||
      etiqueta(bloque, 'description') ||
      etiqueta(bloque, 'summary');
    return {
      titulo: sinHtml(etiqueta(bloque, 'title')),
      enlace: enlace.trim(),
      fecha: fechaDe(bloque),
      resumenOriginal: sinHtml(cuerpo).slice(0, 2400),
      imagen: imagenDe(bloque),
      categorias: [...bloque.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map((m) =>
        sinHtml(m[1])
      ),
      origen,
    };
  });
}

/** Descarga un feed y lo parsea. Nunca lanza: devuelve [] si algo falla. */
export async function leerFeed(url, origen = '', { timeoutMs = 20000 } = {}) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'user-agent': 'LaPrida/1.0 (+agregador local de noticias de Asturias)',
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok) {
      console.warn(`  ⚠︎ ${origen || url}: HTTP ${res.status}`);
      return [];
    }
    return parsearFeed(await res.text(), origen || new URL(url).hostname);
  } catch (err) {
    console.warn(`  ⚠︎ ${origen || url}: ${err.message}`);
    return [];
  }
}

/** ¿Habla esta pieza de un concejo concreto? */
/**
 * ¿La pieza nombra este concejo o alguno de sus pueblos?
 *
 * `usarEnlace` existe por una trampa sutil: en el feed propio de un concejo la
 * URL de cada noticia ya lleva el nombre del concejo dentro
 * (elfielato.es/villaviciosa/...), así que mirarla haría que TODO pasara el
 * filtro, incluida una noticia del gochu de Noreña. Al comprobar una pieza
 * contra el concejo de su propio feed hay que dejar el enlace fuera: es prueba
 * circular. Para las fuentes regionales, en cambio, el enlace sí informa.
 */
export function mencionaConcejo(item, concejo, { usarEnlace = true } = {}) {
  const limpiar = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const heno = limpiar(
    `${item.titulo} ${item.resumenOriginal} ${item.categorias.join(' ')} ${usarEnlace ? item.enlace : ''}`
  );
  return concejo.claves.some((clave) => {
    const c = limpiar(clave);
    return new RegExp(`(^|[^a-z])${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(heno);
  });
}
