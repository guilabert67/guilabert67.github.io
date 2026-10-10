// Lector de RSS/Atom sin dependencias. Node 18+ (usa fetch nativo).

const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü',
  laquo: '«', raquo: '»', hellip: '…', mdash: '—', ndash: '–',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', deg: '°', euro: '€',
};

// Seguridad: el feed lo escribe un tercero. Las expresiones perezosas del tipo
// /<item[\s\S]*?<\/item>/ son cuadráticas cuando la etiqueta no se cierra:
// medido el 03/10/2026, 4 MB de «<item>» sin cerrar colgaban la ingesta más de
// un minuto (y con ella la edición). Todo lo que recorre el texto va ahora en
// una sola pasada con indexOf, y cada pieza tiene un tamaño máximo.
const TOPE_BLOQUE = 300 * 1024; // una pieza de feed normal no llega a 50 KB
const TOPE_PIEZAS = 500;

/** Quita todo lo que vaya entre `abre` y `cierra` (sin distinguir mayúsculas), en una pasada. */
function quitarTramos(txt, abre, cierra, sustituto = ' ') {
  const bajo = txt.toLowerCase();
  let salida = '';
  let desde = 0;
  for (;;) {
    const i = bajo.indexOf(abre, desde);
    if (i < 0) break;
    const j = bajo.indexOf(cierra, i + abre.length);
    if (j < 0) {
      salida += txt.slice(desde, i);
      desde = txt.length;
      break;
    }
    salida += txt.slice(desde, i) + sustituto;
    desde = j + cierra.length;
  }
  return salida + txt.slice(desde);
}

/** Sustituye cada <![CDATA[…]]> por su contenido, en una pasada. */
function sinCdata(txt) {
  let salida = '';
  let desde = 0;
  for (;;) {
    const i = txt.indexOf('<![CDATA[', desde);
    if (i < 0) break;
    const j = txt.indexOf(']]>', i + 9);
    if (j < 0) break;
    salida += txt.slice(desde, i) + txt.slice(i + 9, j);
    desde = j + 3;
  }
  return salida + txt.slice(desde);
}

const caracter = (n) => (Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '');

export function decodificar(txt = '') {
  return sinCdata(String(txt))
    .replace(/&#x([0-9a-f]{1,8});/gi, (_, h) => caracter(parseInt(h, 16)))
    .replace(/&#(\d{1,8});/g, (_, d) => caracter(Number(d)))
    .replace(/&([a-z]{1,10});/gi, (m, n) => (n in ENTIDADES ? ENTIDADES[n] : m));
}

export function sinHtml(txt = '') {
  let t = quitarTramos(String(txt), '<script', '</script>');
  t = quitarTramos(t, '<style', '</style>');
  return decodificar(
    t
      .replace(/<\/(p|div|li|h[1-6]|br)>/gi, '\n')
      // [^<>]{0,2000}: una etiqueta no contiene «<», y sin tope un «<» suelto
      // hacía que cada búsqueda recorriera el texto entero (cuadrático).
      .replace(/<[^<>]{0,2000}>/g, ' ')
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Todos los contenidos de <nombre …>…</nombre> del bloque, en una pasada. */
function contenidos(bloque, nombre, maximo = Infinity) {
  const bajo = bloque.toLowerCase();
  const abre = `<${nombre.toLowerCase()}`;
  const cierra = `</${nombre.toLowerCase()}>`;
  const salida = [];
  let desde = 0;
  while (salida.length < maximo) {
    const i = bajo.indexOf(abre, desde);
    if (i < 0) break;
    const sig = bajo[i + abre.length];
    if (sig !== '>' && sig !== ' ' && sig !== '\t' && sig !== '\n' && sig !== '\r' && sig !== '/') {
      desde = i + abre.length; // <linkx>, <title2>… no son esta etiqueta
      continue;
    }
    const fin = bajo.indexOf('>', i);
    if (fin < 0) break;
    if (bajo[fin - 1] === '/') { desde = fin + 1; continue; } // <link href="…"/> vacía
    const j = bajo.indexOf(cierra, fin + 1);
    if (j < 0) break;
    salida.push(bloque.slice(fin + 1, j));
    desde = j + cierra.length;
  }
  return salida;
}

function etiqueta(bloque, nombre) {
  const [primero] = contenidos(bloque, nombre, 1);
  return primero !== undefined ? decodificar(primero).trim() : '';
}

function atributo(bloque, nombre, attr) {
  // [^>]{0,2000}: acotado para que una etiqueta sin cerrar no dispare la búsqueda.
  const re = new RegExp(`<${nombre}\\b[^>]{0,2000}?\\b${attr}=["']([^"']{1,2000})["']`, 'i');
  const m = bloque.match(re);
  return m ? decodificar(m[1]).trim() : '';
}

function imagenDe(bloque) {
  return (
    atributo(bloque, 'media:content', 'url') ||
    atributo(bloque, 'media:thumbnail', 'url') ||
    atributo(bloque, 'enclosure', 'url') ||
    (bloque.match(/<img[^>]{1,2000}?src=["']([^"']{1,2000})["']/i)?.[1] ?? '')
  );
}

/**
 * Fechas «día-mes-año» (RTPA: «09-10-2026 22:47»), en hora de Asturias.
 *
 * `new Date()` las lee al estilo americano, mes-día-año: el 9 de octubre se
 * convertía en el 10 de septiembre, y cualquier día por encima del 12 en una
 * fecha inválida que se sellaba con la de hoy. Comprobado el 10/10/2026.
 * Solo se aceptan con el año al final y en cuatro cifras, así que no pisa las
 * fechas RFC 822 («Fri, 09 Oct 2026…») ni las ISO («2026-10-09…»).
 */
const RE_FECHA_EUROPEA = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const minutosDeMadrid = (ms) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(new Date(ms)).map((x) => [x.type, Number(x.value)])
  );
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - ms) / 60000;
};
export function fechaEuropea(texto) {
  const m = RE_FECHA_EUROPEA.exec(String(texto).trim());
  if (!m) return null;
  const [, d, mes, a, h = '0', mi = '0', se = '0'] = m;
  if (+mes < 1 || +mes > 12 || +d < 1 || +d > 31 || +h > 23 || +mi > 59) return null;
  const local = Date.UTC(+a, +mes - 1, +d, +h, +mi, +se);
  if (new Date(local).getUTCDate() !== +d) return null; // 31-02 y similares
  // Dos pasadas por si la hora cae justo en el cambio de hora.
  let ms = local - minutosDeMadrid(local) * 60000;
  ms = local - minutosDeMadrid(ms) * 60000;
  return new Date(ms);
}

function fechaDe(bloque) {
  const bruto =
    etiqueta(bloque, 'pubDate') ||
    etiqueta(bloque, 'published') ||
    etiqueta(bloque, 'updated') ||
    etiqueta(bloque, 'dc:date');
  const d = bruto ? (fechaEuropea(bruto) ?? new Date(bruto)) : null;
  // Si el canal no da fecha usable se sella con la de hoy, porque el resto del
  // sistema necesita una fecha. Pero eso convierte una pieza vieja en «de hoy»,
  // así que la marca queda a la vista en `sinFecha` y la ingesta la cuenta.
  return d && !Number.isNaN(d.getTime())
    ? { fecha: d.toISOString(), sinFecha: false }
    : { fecha: new Date().toISOString(), sinFecha: true };
}

/** Las piezas (<item> de RSS o <entry> de Atom), en una pasada y con topes. */
function bloquesDe(xml) {
  const bajo = xml.toLowerCase();
  const salida = [];
  const re = /<(item|entry)[\s>]/g;
  let m;
  while ((m = re.exec(bajo)) && salida.length < TOPE_PIEZAS) {
    const cierra = `</${m[1]}>`;
    const j = bajo.indexOf(cierra, m.index);
    if (j < 0) break;
    const fin = j + cierra.length;
    if (fin - m.index <= TOPE_BLOQUE) salida.push(xml.slice(m.index, fin));
    re.lastIndex = fin;
  }
  return salida;
}

/** Convierte el XML de un feed RSS o Atom en una lista de objetos planos. */
export function parsearFeed(xml, origen = '') {
  const items = bloquesDe(String(xml));
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
      ...fechaDe(bloque),
      resumenOriginal: sinHtml(cuerpo).slice(0, 2400),
      imagen: imagenDe(bloque),
      categorias: contenidos(bloque, 'category', 30).map((c) => sinHtml(c)),
      origen,
    };
  });
}

/**
 * Un canal caído no puede pasar desapercibido.
 *
 * Antes esto era un `console.warn`: se quedaba DENTRO del registro de la
 * ejecución, que nadie abre, y la edición salía en verde. Si un medio cambiara
 * una URL o bloqueara el agente, La Prida dejaría de traer noticias de un
 * concejo entero y no lo diría en ninguna parte. `::warning title=…::` sale en
 * la lista de ejecuciones de Actions, a la vista, sin abrir nada.
 */
function gritar(mensaje) {
  console.warn(`  ⚠︎ ${mensaje}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Canal caído::${mensaje}`);
}

/** Descarga un feed y lo parsea. Nunca lanza: devuelve [] si algo falla. */
const TOPE_FEED = 5 * 1024 * 1024; // 5 MB: un feed normal pesa menos de 1 MB

export async function leerConTope(res, tope) {
  const declarado = Number(res.headers.get('content-length') ?? 0);
  if (declarado > tope) throw new Error(`demasiado grande (${declarado} bytes)`);
  const lector = res.body.getReader();
  const trozos = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.length;
    if (total > tope) {
      await lector.cancel();
      throw new Error(`demasiado grande (más de ${tope} bytes)`);
    }
    trozos.push(value);
  }
  return Buffer.concat(trozos).toString('utf8');
}

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
    if (!res.ok) {
      clearTimeout(t);
      gritar(`${origen || url}: HTTP ${res.status}. Ese canal no ha aportado nada a esta edición.`);
      return [];
    }
    // Seguridad: el feed es de un tercero. Se lee con tope de tamaño y con el
    // reloj corriendo hasta el último byte: un feed gigante o que gotea byte a
    // byte no puede colgar la edición ni agotar la memoria.
    const texto = await leerConTope(res, TOPE_FEED);
    clearTimeout(t);
    return parsearFeed(texto, origen || new URL(url).hostname);
  } catch (err) {
    gritar(`${origen || url}: ${err.message}. Ese canal no ha aportado nada a esta edición.`);
    return [];
  }
}

/** ¿Habla esta pieza de un concejo concreto? */
const limpiarTexto = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * ¿Es un repaso a toda Asturias disfrazado de noticia de casa?
 *
 * Los medios regionales publican resúmenes que tocan media región y nombran uno
 * de nuestros concejos de pasada. Pasan el filtro de topónimos con todas las de
 * la ley, pero no son noticia local. Si la pieza nombra DOS o más lugares de
 * fuera de la línea, no entra.
 */
export function esResumenRegional(item, otrosLugares, minimo = 2) {
  const heno = limpiarTexto(`${item.titulo} ${item.resumenOriginal} ${item.categorias.join(' ')}`);
  const fuera = new Set();
  for (const lugar of otrosLugares) {
    const l = limpiarTexto(lugar).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^a-z])${l}([^a-z]|$)`).test(heno)) fuera.add(lugar);
    if (fuera.size >= minimo) return [...fuera];
  }
  return fuera.size >= minimo ? [...fuera] : null;
}

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
