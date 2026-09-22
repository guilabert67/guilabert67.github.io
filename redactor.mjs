// Reescritura de piezas con la API de Claude, siguiendo el manual de estilo de La Prida.
// Si no hay ANTHROPIC_API_KEY, cae elegantemente a un resumen extractivo con atribución.

import { manualDeEstilo, ingesta } from '../config.mjs';

const API = 'https://api.anthropic.com/v1/messages';

function extraerJSON(texto) {
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/** Plan B sin IA: titular original + primeras frases + enlace. Honesto y legal. */
export function resumenExtractivo(item, concejo) {
  const frases = (item.resumenOriginal || '')
    .split(/(?<=[.!?])\s+/)
    .filter((f) => f.trim().length > 30);
  const cuerpo = frases.slice(0, 3).join(' ').trim();
  return {
    titular: item.titulo,
    entradilla: cuerpo.slice(0, 180),
    cuerpo: cuerpo ? [cuerpo] : [],
    tipoEvento: '',
    lugar: '',
    hora: '',
    precio: '',
    enVeinte: [],
    cifra: null,
    palabra: null,
    porQue: '',
    seccion: 'actualidad',
    etiquetas: [concejo.nombre],
    reescrito: false,
  };
}

/**
 * Reescribe una pieza. Devuelve {titular, entradilla, cuerpo[], seccion, etiquetas[], reescrito}.
 * Nunca lanza: ante cualquier fallo devuelve el resumen extractivo.
 */
export async function reescribir(item, concejo, { apiKey = process.env.ANTHROPIC_API_KEY } = {}) {
  if (!apiKey || !ingesta.reescribir) return resumenExtractivo(item, concejo);

  const material = [
    `CONCEJO: ${concejo.nombre} (capital: ${concejo.capital})`,
    `TITULAR ORIGINAL: ${item.titulo}`,
    `MEDIO DE ORIGEN: ${item.origen}`,
    `FECHA: ${item.fecha}`,
    `TEXTO DE PARTIDA:\n${item.resumenOriginal}`,
  ].join('\n');

  const instruccion = `${manualDeEstilo}

Te paso el material en bruto de una pieza. Reescríbela para La Prida.

${material}

Devuelve SOLO un objeto JSON, sin texto alrededor, con esta forma exacta:
{
  "titular": "…",
  "entradilla": "una frase",
  "cuerpo": ["párrafo 1", "párrafo 2", "párrafo 3"],
  "seccion": "actualidad" | "agenda" | "deporte-y-cultura" | "avisos",
  "etiquetas": ["2 a 4 etiquetas cortas"],
  "fechaEvento": "AAAA-MM-DD si la pieza anuncia algo con fecha futura concreta; si no, cadena vacía",
  "tipoEvento": "concierto | escena | cine | expo | feria | mercado | fiesta | gastro | letras | taller, o cadena vacía si no es un plan al que se pueda ir",
  "lugar": "dónde se celebra, tal cual lo diga la fuente (sala, plaza, pueblo), o cadena vacía",
  "hora": "la hora de comienzo si la fuente la da, p. ej. «20:30», o cadena vacía",
  "precio": "«5 €», «gratis», «con invitación»… solo si la fuente lo dice; si no, cadena vacía",
  "apunte": "una línea corta y con retranca sobre el asunto, o cadena vacía si no procede",
  "enVeinte": ["tres frases que resuman la pieza entera para quien no la va a leer"],
  "cifra": { "numero": "…", "unidad": "…", "glosa": "dos o tres frases explicando qué significa esa cifra" },
  "palabra": { "termino": "…", "como": "cómo se pronuncia o se dice por aquí", "definicion": "dos o tres frases" },
  "porQue": "una o dos frases: por qué esto le importa a quien vive en el concejo"
}

Elige "agenda" si el asunto tiene fecha y hora futura (fiesta, pleno, feria, concierto).
Elige "avisos" si es una obra, un corte, una guardia, un plazo o un trámite.
Elige "deporte-y-cultura" si va de equipos, salas, patrimonio o tradición.

ACTIVIDAD CULTURAL. Todo lo que se puede ir a ver cuenta: conciertos y actuaciones en vivo,
teatro, danza, cine, exposiciones, ferias, certámenes, mercadillos, rastros, almonedas,
romerías, verbenas, espichas, jornadas gastronómicas, charlas, presentaciones y talleres.
Si la pieza anuncia una de esas cosas, rellena "tipoEvento" y, si la fuente los da, "lugar",
"hora" y "precio". Un plan con fecha futura va a "agenda"; si ya pasó o no se sabe cuándo es,
va a "deporte-y-cultura". Lugar, hora y precio NO se inventan nunca: si la fuente no los da,
cadena vacía. Vale más un plan sin hora que un plan con la hora equivocada.

LAS ESCALAS ("enVeinte", "cifra", "palabra", "porQue") son la parte didáctica del diario y
se rigen por tres reglas duras:
1. Solo con datos que estén en el material de partida o que sean conocimiento general
   verificable (qué es una parroquia, qué es la dermatosis nodular). Nunca inventes cifras,
   fechas, nombres ni euros. Si no hay una cifra clara en el material, devuelve "cifra": null.
2. "palabra" es para una palabra de aquí que un forastero no entendería: un término asturiano
   (prau, llagar, mayar, espicha, foliada, majada, güelu), un topónimo o un tecnicismo local o
   administrativo que aparezca en la pieza. Si no hay ninguna, devuelve null. No expliques
   palabras que entiende todo el mundo.
3. "porQue" no repite la noticia: dice qué cambia para el vecino. Si no aporta nada, cadena vacía.

Si el texto de partida es demasiado pobre para escribir con rigor, devuelve "titular": "" y nada más.`;

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ingesta.modelo,
        max_tokens: ingesta.maxTokens,
        messages: [{ role: 'user', content: instruccion }],
      }),
    });

    if (!res.ok) {
      console.warn(`  ⚠︎ redactor: HTTP ${res.status} — uso resumen extractivo`);
      return resumenExtractivo(item, concejo);
    }

    const data = await res.json();
    const texto = (data.content ?? []).map((b) => b.text ?? '').join('');
    const j = extraerJSON(texto);
    if (!j || !j.titular) return resumenExtractivo(item, concejo);

    return {
      titular: String(j.titular).trim(),
      entradilla: String(j.entradilla ?? '').trim(),
      cuerpo: Array.isArray(j.cuerpo) ? j.cuerpo.map(String).filter(Boolean) : [],
      seccion: ['actualidad', 'agenda', 'deporte-y-cultura', 'avisos'].includes(j.seccion)
        ? j.seccion
        : 'actualidad',
      etiquetas: Array.isArray(j.etiquetas) ? j.etiquetas.map(String).slice(0, 4) : [concejo.nombre],
      fechaEvento: /^\d{4}-\d{2}-\d{2}/.test(String(j.fechaEvento ?? '')) ? String(j.fechaEvento) : '',
      tipoEvento: String(j.tipoEvento ?? '').trim(),
      lugar: String(j.lugar ?? '').trim(),
      hora: String(j.hora ?? '').trim(),
      precio: String(j.precio ?? '').trim(),
      apunte: String(j.apunte ?? '').trim(),
      enVeinte: Array.isArray(j.enVeinte) ? j.enVeinte.map(String).filter(Boolean).slice(0, 3) : [],
      cifra:
        j.cifra && j.cifra.numero
          ? {
              numero: String(j.cifra.numero).trim(),
              unidad: String(j.cifra.unidad ?? '').trim(),
              glosa: String(j.cifra.glosa ?? '').trim(),
            }
          : null,
      palabra:
        j.palabra && j.palabra.termino && j.palabra.definicion
          ? {
              termino: String(j.palabra.termino).trim(),
              como: String(j.palabra.como ?? '').trim(),
              definicion: String(j.palabra.definicion).trim(),
            }
          : null,
      porQue: String(j.porQue ?? '').trim(),
      reescrito: true,
    };
  } catch (err) {
    console.warn(`  ⚠︎ redactor: ${err.message} — uso resumen extractivo`);
    return resumenExtractivo(item, concejo);
  }
}

/** Redacta el "Despertador": las tres cosas del día, a partir de las piezas ya reescritas. */
export async function despertador(piezas, { apiKey = process.env.ANTHROPIC_API_KEY } = {}) {
  const titulares = piezas
    .slice(0, 14)
    .map((p, i) => `${i + 1}. [${p.concejo}] ${p.titular} — ${p.entradilla}`)
    .join('\n');

  if (!apiKey || piezas.length === 0) {
    return piezas.slice(0, 3).map((p) => ({
      concejo: p.concejo,
      frase: p.titular,
      enlace: p.url,
    }));
  }

  const instruccion = `${manualDeEstilo}

Estos son los titulares de hoy en La Prida:

${titulares}

Escribe EL DESPERTADOR: las tres cosas que hay que saber esta mañana, en orden de importancia para
alguien que vive en estos concejos. Cada una en una sola frase de 15 palabras como mucho, escrita
para leerse de un vistazo con el café en la mano. Nada de "el ayuntamiento informa de que".

Devuelve SOLO JSON: {"puntos":[{"indice":1,"frase":"…"},{"indice":5,"frase":"…"},{"indice":9,"frase":"…"}]}
donde "indice" es el número del titular de la lista de arriba.`;

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ingesta.modelo,
        max_tokens: 600,
        messages: [{ role: 'user', content: instruccion }],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const j = extraerJSON((data.content ?? []).map((b) => b.text ?? '').join(''));
    if (!j?.puntos?.length) throw new Error('respuesta vacía');
    return j.puntos
      .map((p) => {
        const pieza = piezas[Number(p.indice) - 1];
        return pieza ? { concejo: pieza.concejo, frase: String(p.frase), enlace: pieza.url } : null;
      })
      .filter(Boolean)
      .slice(0, 3);
  } catch (err) {
    console.warn(`  ⚠︎ despertador: ${err.message}`);
    return piezas.slice(0, 3).map((p) => ({ concejo: p.concejo, frase: p.titular, enlace: p.url }));
  }
}


/**
 * Traduce una pieza ya escrita al inglés, el francés y el alemán en UNA sola
 * llamada. Devuelve { en: {...}, fr: {...}, de: {...} } o {} si algo falla.
 *
 * El español es el original y manda: aquí no se reescribe, se traduce. Si la
 * traducción se sale del original, es un error, no una mejora.
 */
export async function traducir(pieza, { apiKey = process.env.ANTHROPIC_API_KEY } = {}) {
  if (!apiKey || !ingesta.traducir) return {};

  const fuente = {
    titular: pieza.titular,
    entradilla: pieza.entradilla,
    cuerpo: pieza.cuerpo ?? [],
    apunte: pieza.apunte ?? '',
    enVeinte: pieza.enVeinte ?? [],
    cifra: pieza.cifra ?? null,
    palabra: pieza.palabra ?? null,
    porQue: pieza.porQue ?? '',
    lugar: pieza.lugar ?? '',
    precio: pieza.precio ?? '',
  };

  const instruccion = `Traduce esta pieza de La Prida, un diario local de Asturias (España), al inglés, al francés y al alemán.

QUIÉN VA A LEER ESTO
Gente extranjera que vive en Piloña, Nava, Cabrales o Villaviciosa, o que está pensando en venir.
No conocen la comarca: escribe para alguien inteligente que acaba de llegar.

CÓMO SE TRADUCE
- Traduce, no reescribas. No añadas datos, no quites datos, no cambies cifras ni fechas.
- Tono natural en cada lengua, no calcado del español. Frases cortas, como el original.
- NO se traducen: topónimos (Piloña, Infiesto, Sotres, Valles de San Román), nombres propios,
  nombres de fiestas y certámenes oficiales, ni nombres de entidades (Banda de Gaites, La Benéfica).
- Palabras asturianas dentro del texto (llagar, espicha, prau, mayar, foliada): se dejan en
  asturiano en cursiva mental —es decir, tal cual— y, la primera vez, se añade entre paréntesis
  una glosa cortísima en la lengua de destino. Ejemplo en inglés: "a espicha (a cider-house feast)".
- El bloque "palabra" es un glosario: ahí el término SE QUEDA en asturiano y lo que se traduce
  es la definición y la guía de pronunciación.
- Unidades: los euros se quedan en euros. Nada de convertir divisas.
- Si un campo viene vacío o nulo, devuélvelo igual de vacío o nulo. No lo rellenes.

PIEZA (JSON):
${JSON.stringify(fuente, null, 1)}

Devuelve SOLO un objeto JSON con esta forma exacta, sin texto alrededor:
{
  "en": { "titular": "…", "entradilla": "…", "cuerpo": ["…"], "apunte": "…", "enVeinte": ["…"],
          "cifra": {"numero":"…","unidad":"…","glosa":"…"} , "palabra": {"termino":"…","como":"…","definicion":"…"},
          "porQue": "…", "lugar": "…", "precio": "…" },
  "fr": { … las mismas claves … },
  "de": { … las mismas claves … }
}`;

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ingesta.modelo,
        max_tokens: ingesta.maxTokensTraduccion ?? 3000,
        messages: [{ role: 'user', content: instruccion }],
      }),
    });
    if (!res.ok) {
      console.warn(`  ⚠︎ traductor: HTTP ${res.status} — la pieza se queda solo en español`);
      return {};
    }
    const data = await res.json();
    const j = extraerJSON((data.content ?? []).map((b) => b.text ?? '').join(''));
    if (!j) return {};

    const limpio = {};
    for (const codigo of ['en', 'fr', 'de']) {
      const v = j[codigo];
      if (!v || !v.titular) continue;
      limpio[codigo] = {
        titular: String(v.titular).trim(),
        entradilla: String(v.entradilla ?? '').trim(),
        cuerpo: Array.isArray(v.cuerpo) ? v.cuerpo.map(String).filter(Boolean) : [],
        apunte: String(v.apunte ?? '').trim(),
        enVeinte: Array.isArray(v.enVeinte) ? v.enVeinte.map(String).filter(Boolean) : [],
        cifra:
          v.cifra && v.cifra.numero
            ? { numero: String(v.cifra.numero), unidad: String(v.cifra.unidad ?? ''), glosa: String(v.cifra.glosa ?? '') }
            : null,
        palabra:
          v.palabra && v.palabra.termino
            ? {
                termino: String(v.palabra.termino),
                como: String(v.palabra.como ?? ''),
                definicion: String(v.palabra.definicion ?? ''),
              }
            : null,
        porQue: String(v.porQue ?? '').trim(),
        lugar: String(v.lugar ?? '').trim(),
        precio: String(v.precio ?? '').trim(),
      };
    }
    return limpio;
  } catch (err) {
    console.warn(`  ⚠︎ traductor: ${err.message} — la pieza se queda solo en español`);
    return {};
  }
}
