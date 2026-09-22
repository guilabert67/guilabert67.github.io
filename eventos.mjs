// Clasificación de actividad cultural: de un texto suelto a un tipo de plan.
// Sin dependencias y sin IA: si el redactor con IA acierta, se respeta lo suyo;
// si no hay clave de API, esto sigue funcionando igual.

import { tiposEvento, clavesEmpleo } from '../config.mjs';

const limpiar = (s = '') =>
  String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function busca(heno, clave) {
  const c = clave
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // tolera el plural: "proyección" encuentra "proyecciones", "taller" encuentra "talleres"
  return new RegExp(`(^|[^a-z0-9])${c}(es|s)?([^a-z0-9]|$)`).test(heno);
}

/**
 * ¿De qué tipo de plan habla esto? Devuelve el slug del tipo más apoyado, o
 * cadena vacía si no parece una actividad a la que se pueda ir.
 *
 * Lo que aparece en el titular vale por tres: «Piloña estrena La Benefílmica:
 * cine en los praos» es cine, aunque el cuerpo hable de espectáculos. Y hace
 * falta más de una pista suelta, para que una sola mención de «concurso» no
 * convierta un pleno municipal en una feria.
 */
export function tipoDeEvento(texto = '', titular = '') {
  const heno = limpiar(texto);
  const cabeza = limpiar(titular);
  let mejor = { slug: '', puntos: 0 };
  for (const tipo of tiposEvento) {
    let puntos = 0;
    for (const clave of tipo.claves) {
      if (cabeza && busca(cabeza, clave)) puntos += 3;
      else if (busca(heno, clave)) puntos += 1;
    }
    if (puntos > mejor.puntos) mejor = { slug: tipo.slug, puntos };
  }
  // Umbral: hace falta una pista en el titular (3 puntos) o dos en el cuerpo.
  // Una sola palabra suelta enterrada en un párrafo no clasifica nada.
  return mejor.puntos >= 3 ? mejor.slug : '';
}

export const tipoPorSlug = (slug) => tiposEvento.find((t) => t.slug === slug) ?? null;

/** Los tipos que de verdad aparecen en una lista de piezas, en el orden de config. */
export function tiposPresentes(piezas = []) {
  const vivos = new Set(piezas.map((p) => p.tipoEvento).filter(Boolean));
  return tiposEvento.filter((t) => vivos.has(t.slug));
}

/**
 * ¿Esto es un plan al que se puede ir? Hace falta un tipo reconocido y, para
 * mandarlo a la agenda, una fecha futura. Sin fecha va a deporte y cultura:
 * sigue siendo actividad cultural, pero ya pasó o no se sabe cuándo es.
 */
export function esPlan(pieza) {
  return Boolean(pieza?.tipoEvento);
}

/** La fecha del plan, venga como AAAA-MM-DD o como marca de tiempo completa. */
export function fechaDelPlan(pieza) {
  if (!pieza?.fechaEvento) return null;
  const d = new Date(pieza.fechaEvento);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function esFuturo(pieza, ahora = new Date()) {
  const d = fechaDelPlan(pieza);
  if (!d) return false;
  // cuenta el día entero: una feria de hoy sigue siendo un plan de hoy
  const fin = new Date(d);
  fin.setHours(23, 59, 59, 999);
  return fin >= ahora;
}

/**
 * ¿Esto es una oferta o una noticia de empleo? Mismo criterio que los planes:
 * una pista en el titular o dos en el cuerpo. Así un pleno que menciona de
 * pasada una plaza no acaba en la sección de Trabajo.
 */
export function esEmpleo(texto = '', titular = '') {
  const heno = limpiar(texto);
  const cabeza = limpiar(titular);
  let puntos = 0;
  for (const clave of clavesEmpleo) {
    if (cabeza && busca(cabeza, clave)) puntos += 3;
    else if (busca(heno, clave)) puntos += 1;
    if (puntos >= 3) return true;
  }
  return false;
}
