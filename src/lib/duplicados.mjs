// Dos controles que deciden si una pieza entra o no en La Prida.
//
// 1. ¿Cuenta un suceso que ya está publicado?
//    La deduplicación por URL (`claveFuente` en la ingesta) solo caza el mismo
//    artículo repetido. El mismo SUCESO contado por dos medios tiene dos URL:
//    el 02/10/2026 el feed publicado tenía 13 de 40 piezas repetidas
//    (Torrecerredo ×5, Festival de la Manzana ×5, Poreñu, Cordal de Peón…).
//
// 2. ¿Es publicidad?
//    «Cuatro días para olvidarse de todo: una escapada rural… desde 71 euros por
//    persona y noche» entró como noticia de Villaviciosa.

import { ingesta } from '../config.mjs';

// Palabras que no dicen de qué va una pieza. Los nombres de los concejos van aquí
// a propósito: dos piezas de Villaviciosa comparten «Villaviciosa» sin contar lo
// mismo. Y «euros» también: unía las Fiestas del Portal con el Cordal de Peón.
const VACIAS = new Set(
  (
    'para como tras sobre entre desde hasta este esta estos estas anos esto ' +
    'que del los las una unos unas con por sus han mas muy sera tiene ' +
    'euros villaviciosa pilona nava cabrales cabranes asturias asturiano asturiana ' +
    'ayuntamiento concejo principado'
  ).split(' ')
);

export function palabras(texto) {
  return new Set(
    String(texto ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\(\d\d\/\d\d\/\d{4}\)/g, '')
      .replace(/[^a-z ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !VACIAS.has(w))
  );
}

// Además del porcentaje, un mínimo de palabras en común. Con titulares cortos
// dos palabras daban el 67 %: «El comercio se suma a los 40 años de la Banda de
// Gaites» y «5.000 euros más para la escuela de la Banda de Gaites» son dos
// noticias distintas que solo comparten «Banda» y «Gaites».
const MIN_COMUNES = 3;

const solape = (A, B) => {
  if (!A.size || !B.size) return 0;
  let comunes = 0;
  for (const w of A) if (B.has(w)) comunes++;
  return comunes >= MIN_COMUNES ? comunes / Math.min(A.size, B.size) : 0;
};

/**
 * Parte de las palabras del titular MÁS CORTO que aparecen en el otro.
 *
 * Se divide por el más corto, no por la unión: «Un joven inglés muere en
 * Torrecerredo» tiene cuatro palabras y el titular largo del mismo suceso,
 * doce. Con la unión no se parecían nunca. (Ese par concreto se queda fuera
 * igualmente: solo comparten dos palabras. Lo marca el vigilante.)
 *
 * Y se comparan titular con titular —el nuestro y el del medio de origen, en
 * las cuatro combinaciones— quedándose con el mayor. Mezclar los dos titulares
 * en una sola bolsa diluía el parecido: los dos de Torrecerredo daban 0,25.
 */
export function parecido(a, b) {
  const ta = [a.titular, a.fuente?.titularOriginal].filter(Boolean).map(palabras);
  const tb = [b.titular, b.fuente?.titularOriginal].filter(Boolean).map(palabras);
  let max = 0;
  for (const A of ta) for (const B of tb) max = Math.max(max, solape(A, B));
  return max;
}

/**
 * ¿Cuentan `a` y `b` lo mismo? Mismo concejo, menos de N horas entre las dos
 * y más del umbral de parecido.
 *
 * La ventana de horas es lo que separa «el mismo suceso en dos medios» de
 * «el anuncio y la crónica»: los duplicados medidos salen con horas de
 * diferencia (Torrecerredo: 17 h entre la primera y la última), mientras que
 * el anuncio y la crónica legítimos van separados por días (Sella 49 h, biogás
 * 56 h, Miércoles del Portal 43 h).
 */
export function esDuplicado(a, b) {
  if (a.concejoSlug !== b.concejoSlug) return 0;
  const horas = Math.abs(Date.parse(a.fecha) - Date.parse(b.fecha)) / 36e5;
  if (!(horas <= ingesta.ventanaDuplicadoHoras)) return 0;
  const r = parecido(a, b);
  return r > ingesta.umbralDuplicado ? r : 0;
}

/** Devuelve la primera pieza de `lista` que cuenta lo mismo que `pieza`, o null. */
export function duplicadoDe(pieza, lista) {
  for (const otra of lista) {
    const r = esDuplicado(pieza, otra);
    if (r) return { otra, r };
  }
  return null;
}

// Un precio por persona, una oferta o un patrocinio en el titular o la
// entradilla es un anuncio, no una noticia. Las noticias con precios de verdad
// (entradas a un concierto, una subvención) no llevan «por persona y noche».
const PUBLICIDAD = [
  /\bdesde\s+\d+[.,]?\d*\s*(€|euros?)\s+(por|la|al)\s+(persona|noche|d[ií]a)/i,
  /\b(\d+[.,]?\d*\s*(€|euros?))\s+por\s+persona\s+y\s+noche/i,
  /\bescapada(s)?\s+(rural|romántica|de\s+fin\s+de\s+semana)\b.*\b\d+\s*(€|euros?)/i,
  /\b(patrocinad[oa]|publirreportaje|contenido\s+patrocinado|en\s+colaboraci[oó]n\s+con|branded)\b/i,
  /\b(oferta|descuento|c[oó]digo\s+promocional|reserva\s+ya|plazas\s+limitadas)\b.*\b\d+\s*(€|euros?|%)/i,
];

export function esPublicidad(item) {
  const texto = `${item.titulo ?? ''} ${String(item.resumenOriginal ?? '').slice(0, 300)}`;
  return PUBLICIDAD.some((re) => re.test(texto));
}
