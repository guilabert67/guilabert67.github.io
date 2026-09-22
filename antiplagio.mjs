// Detector de calco. Compara un texto propio con el de la fuente y avisa si
// comparten tiradas largas de palabras seguidas.
//
// Por qué existe: cuando lo único que llega del feed es un titular y un extracto
// de dos líneas, es facilísimo «reescribir» reordenando la frase del otro. Eso
// sigue siendo copiar. Esto lo caza antes de publicar.

const VACIAS = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'unos', 'unas', 'y', 'o',
  'a', 'al', 'en', 'con', 'por', 'para', 'que', 'se', 'su', 'sus', 'lo', 'le',
  'les', 'como', 'más', 'ya', 'no', 'es', 'ha', 'han', 'este', 'esta', 'esto',
]);

/** Deja el texto en palabras comparables: minúsculas, sin tildes ni puntuación. */
export function palabras(texto = '') {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function tiradas(lista, n) {
  const salida = new Map();
  for (let i = 0; i + n <= lista.length; i++) {
    const trozo = lista.slice(i, i + n);
    // Una tirada que es toda preposiciones y artículos no dice nada.
    if (trozo.every((p) => VACIAS.has(p))) continue;
    salida.set(trozo.join(' '), i);
  }
  return salida;
}

/**
 * Devuelve las tiradas de `n` palabras seguidas que comparten los dos textos.
 * Con n = 8, una coincidencia ya es calco: nadie escribe ocho palabras iguales
 * seguidas por casualidad, salvo en nombres propios largos.
 */
export function solapamiento(propio, fuente, n = 8) {
  const a = tiradas(palabras(propio), n);
  const b = tiradas(palabras(fuente), n);
  const comunes = [];
  for (const clave of a.keys()) if (b.has(clave)) comunes.push(clave);
  return comunes;
}

/** ¿Cuánto del texto propio está tomado tal cual? De 0 a 1. */
export function proporcionCalcada(propio, fuente, n = 6) {
  const total = Math.max(1, palabras(propio).length - n + 1);
  return solapamiento(propio, fuente, n).length / total;
}

/**
 * Revisa una pieza entera contra su material de partida.
 * Devuelve { limpio, avisos[] }. `avisos` trae las frases problemáticas.
 */
export function revisarPieza(pieza, materialOriginal, { n = 8 } = {}) {
  const mio = [pieza.titular, pieza.entradilla, ...(pieza.cuerpo ?? [])].join(' \n ');
  const comunes = solapamiento(mio, materialOriginal, n);
  const proporcion = proporcionCalcada(mio, materialOriginal, 6);
  return {
    limpio: comunes.length === 0 && proporcion < 0.12,
    proporcion,
    avisos: comunes,
  };
}
