// Ilustraciones de portada. Se usan cuando una pieza no trae fotografía.
// Cada concejo tiene su motivo y cada pieza su momento del día, siempre el mismo:
// la ilustración se deriva del identificador, así que no baila entre compilaciones.
//
// Son dibujos originales hechos con código: no hay licencias de por medio.

const A = 1200;
const B = 750;

function semilla(txt) {
  let h = 2166136261;
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Momentos del día: cielo (arriba, abajo), disco solar, tinte de las capas.
const MOMENTOS = [
  { nombre: 'amanecer', cielo: ['#FBEFE0', '#F3D9BE'], astro: '#E0703F', tinte: '#8A5A3C', luz: 0.80 },
  { nombre: 'mañana',   cielo: ['#F7F4EC', '#DCE7E4'], astro: '#EBC15C', tinte: '#4A6B62', luz: 0.86 },
  { nombre: 'tarde',    cielo: ['#FAEEDF', '#E8CDB2'], astro: '#D9603A', tinte: '#7A4E38', luz: 0.78 },
  { nombre: 'orbayu',   cielo: ['#EFEFEA', '#D8DCD6'], astro: '#C9CBC0', tinte: '#5A6158', luz: 0.84 },
];

function mezclar(hex, hacia, factor) {
  const n = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = n(hex);
  const [r2, g2, b2] = n(hacia);
  const m = (a, b) => Math.round(a + (b - a) * factor);
  return `#${[m(r1, r2), m(g1, g2), m(b1, b2)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

// Cadena de capas de fondo: colinas suaves, cada vez más oscuras hacia delante.
function capas(r, color, momento, { alturaBase = 0.52, capas: n = 3, ondulacion = 1 } = {}) {
  const salida = [];
  for (let i = 0; i < n; i++) {
    const base = B * (alturaBase + (i / n) * 0.34);
    const amp = (26 + r() * 54) * ondulacion;
    const puntos = [];
    const trozos = 4;
    for (let x = 0; x <= trozos; x++) {
      const px = (A / trozos) * x;
      const py = base - Math.sin((x / trozos) * Math.PI * (1 + r() * 0.7) + i * 1.3) * amp - r() * 16;
      puntos.push([px, py]);
    }
    let d = `M0,${B} L0,${puntos[0][1].toFixed(1)}`;
    for (let k = 1; k < puntos.length; k++) {
      const [x0, y0] = puntos[k - 1];
      const [x1, y1] = puntos[k];
      const cx = (x0 + x1) / 2;
      d += ` C${cx.toFixed(1)},${y0.toFixed(1)} ${cx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
    }
    d += ` L${A},${B} Z`;
    const tono = mezclar(color, momento.tinte, 0.22 + (i / n) * 0.3);
    salida.push(`<path d="${d}" fill="${mezclar(tono, '#ffffff', Math.max(0.05, momento.luz - 0.3 - i * 0.2))}"/>`);
  }
  return salida.join('\n');
}

/* --- motivos por concejo -------------------------------------------------- */

// Cabrales: el Picu Urriellu, la torre de caliza que se ve desde medio concejo.
function picos(r, color, m) {
  const x = 300 + r() * 560;
  const cima = 176 + r() * 60;
  const anchoBase = 132;
  const roca = mezclar(color, m.tinte, 0.34);
  return `
${capas(r, color, m, { alturaBase: 0.62, capas: 2, ondulacion: 0.7 })}
<path d="M${x - anchoBase},${B} L${x - anchoBase * 0.62},${cima + 168}
  L${x - 46},${cima + 24} L${x - 14},${cima} L${x + 30},${cima + 46}
  L${x + 58},${cima + 150} L${x + anchoBase},${B} Z"
  fill="${mezclar(roca, '#ffffff', m.luz - 0.34)}"/>
<path d="M${x - 14},${cima} L${x + 30},${cima + 46} L${x + 58},${cima + 150} L${x + anchoBase},${B}
  L${x + 34},${B} Z" fill="${mezclar(roca, '#000000', 0.18)}" opacity="0.5"/>
<path d="M${x - 46},${cima + 24} L${x - 14},${cima} L${x + 6},${cima + 22} L${x - 26},${cima + 52} Z"
  fill="#ffffff" opacity="0.5"/>
${capas(r, color, m, { alturaBase: 0.84, capas: 1, ondulacion: 0.5 })}`;
}

// Villaviciosa: la ría, el banco de arena y una vela pequeña.
function ria(r, color, m) {
  const agua = mezclar(color, m.tinte, 0.3);
  const velaX = 220 + r() * 700;
  const horizonte = B * 0.54;
  const brillos = Array.from({ length: 7 }, (_, i) => {
    const y = horizonte + 34 + i * 26 + r() * 8;
    const w = 90 + r() * 300;
    const x = r() * (A - w);
    return `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="4" rx="2" fill="#ffffff" opacity="${(0.3 - i * 0.03).toFixed(2)}"/>`;
  }).join('');
  return `
${capas(r, color, m, { alturaBase: 0.4, capas: 2, ondulacion: 0.6 })}
<rect x="0" y="${horizonte}" width="${A}" height="${B - horizonte}" fill="${mezclar(agua, '#ffffff', m.luz - 0.42)}"/>
${brillos}
<path d="M${velaX},${horizonte - 88} L${velaX + 46},${horizonte - 6} L${velaX - 4},${horizonte - 6} Z"
  fill="#ffffff" opacity="0.9"/>
<path d="M${velaX - 10},${horizonte - 6} L${velaX + 58},${horizonte - 6} L${velaX + 44},${horizonte + 8}
  L${velaX + 2},${horizonte + 8} Z" fill="${mezclar(agua, '#000000', 0.35)}"/>
<path d="M0,${B} C${A * 0.3},${B - 96} ${A * 0.7},${B - 34} ${A},${B - 88} L${A},${B} Z"
  fill="${mezclar(color, m.tinte, 0.16)}" opacity="0.9"/>`;
}

// Nava: pumarada en cuesta, con su manzana.
function pumarada(r, color, m) {
  const filas = 3;
  const arboles = [];
  for (let f = 0; f < filas; f++) {
    const y = B * (0.62 + f * 0.12);
    const paso = 150 - f * 22;
    for (let x = -30; x < A + 40; x += paso) {
      const jx = x + r() * 22;
      const rr = 24 + f * 7 + r() * 6;
      const copa = mezclar(color, m.tinte, 0.3 + f * 0.14);
      arboles.push(
        `<g opacity="${(0.9 - f * 0.06).toFixed(2)}"><rect x="${(jx - 2.5).toFixed(0)}" y="${(y - 4).toFixed(0)}" width="5" height="${(rr * 0.7).toFixed(0)}" fill="${mezclar(copa, '#000000', 0.3)}"/>` +
          `<circle cx="${jx.toFixed(0)}" cy="${(y - rr * 0.5).toFixed(0)}" r="${rr.toFixed(0)}" fill="${mezclar(copa, '#ffffff', Math.max(0.04, m.luz - 0.62 - f * 0.06))}"/></g>`
      );
    }
  }
  const mx = 120 + r() * 260;
  return `
${capas(r, color, m, { alturaBase: 0.5, capas: 2, ondulacion: 0.8 })}
${arboles.join('\n')}
<g transform="translate(${mx.toFixed(0)}, 150)">
  <circle cx="0" cy="0" r="52" fill="#C4361F" opacity="0.9"/>
  <path d="M0,-52 C-16,-72 -44,-74 -52,-62 C-38,-50 -14,-46 0,-52 Z" fill="#2F6F4E" opacity="0.9"/>
  <path d="M0,-52 C2,-66 8,-76 16,-82" stroke="#4A3220" stroke-width="5" fill="none" stroke-linecap="round"/>
</g>`;
}

// Piloña: el valle del río, con un hórreo en primer término.
function valle(r, color, m) {
  const hx = 180 + r() * 780;
  const hy = B - 118;
  const madera = mezclar('#6B4A2E', m.tinte, 0.22);
  const rio = mezclar('#7FA9C4', m.tinte, 0.3);
  return `
${capas(r, color, m, { alturaBase: 0.46, capas: 3, ondulacion: 1.05 })}
<path d="M-20,${B} C${A * 0.24},${B - 128} ${A * 0.52},${B - 52} ${A + 20},${B - 132} L${A + 20},${B} Z"
  fill="${mezclar(rio, '#ffffff', m.luz - 0.4)}" opacity="0.85"/>
<g transform="translate(${hx.toFixed(0)}, ${hy})">
  <rect x="-52" y="-4" width="9" height="34" fill="${madera}"/>
  <rect x="-16" y="-4" width="9" height="34" fill="${madera}"/>
  <rect x="20" y="-4" width="9" height="34" fill="${madera}"/>
  <rect x="56" y="-4" width="9" height="34" fill="${madera}"/>
  <rect x="-66" y="-56" width="140" height="54" rx="2" fill="${mezclar(madera, '#ffffff', 0.16)}"/>
  <path d="M-84,-56 L4,-108 L92,-56 Z" fill="${mezclar('#3B2F26', m.tinte, 0.18)}"/>
  <rect x="-30" y="-42" width="26" height="26" fill="${mezclar(madera, '#000000', 0.34)}" opacity="0.7"/>
</g>`;
}

// Cabranes: la collada, el camín que la sube y un castañal. Interior, sin mar
// y sin picos: lo que se ve desde Torazu es loma sobre loma.
function collada(r, color, m) {
  const cx = 420 + r() * 380;
  const verde = mezclar(color, m.tinte, 0.3);
  const camino = mezclar('#D9C9A8', m.tinte, 0.2);
  const arboles = Array.from({ length: 5 }, (_, i) => {
    const x = 120 + i * (180 + r() * 40) + r() * 40;
    const y = B * (0.74 + r() * 0.1);
    const rr = 30 + r() * 16;
    return `<g><rect x="${(x - 3).toFixed(0)}" y="${(y - 6).toFixed(0)}" width="6" height="${(rr * 0.8).toFixed(0)}" fill="${mezclar(verde, '#000000', 0.42)}"/>` +
      `<circle cx="${x.toFixed(0)}" cy="${(y - rr * 0.6).toFixed(0)}" r="${rr.toFixed(0)}" fill="${mezclar(verde, '#ffffff', Math.max(0.05, m.luz - 0.66))}"/></g>`;
  }).join('\n');
  return `
${capas(r, color, m, { alturaBase: 0.44, capas: 3, ondulacion: 1.25 })}
<path d="M${cx},${B * 0.52} C${cx - 90},${B * 0.68} ${cx + 120},${B * 0.8} ${cx - 40},${B}"
  stroke="${mezclar(camino, '#ffffff', m.luz - 0.5)}" stroke-width="26" fill="none" stroke-linecap="round" opacity="0.85"/>
<path d="M${cx},${B * 0.52} C${cx - 90},${B * 0.68} ${cx + 120},${B * 0.8} ${cx - 40},${B}"
  stroke="${mezclar(camino, '#000000', 0.18)}" stroke-width="3" fill="none" stroke-dasharray="14 18" opacity="0.5"/>
${arboles}`;
}

const MOTIVOS = { picos, ria, pumarada, valle, collada };

/* --- detalle: cuando el paisaje ya cansa ----------------------------------- */
//
// Una rejilla de doce piezas ilustradas con doce paisajes iguales se lee como
// un error de carga, no como un diario. Estas composiciones no son paisajes:
// están hechas con lo que ya es La Prida —el disco de parada, la línea, las
// curvas de nivel— y rompen la repetición sin salirse de la casa.

function curvasDeNivel(r, color, m) {
  const cx = 240 + r() * 720;
  const cy = 180 + r() * 380;
  const anillos = Array.from({ length: 9 }, (_, i) => {
    const rr = 60 + i * (44 + r() * 14);
    const gr = (0.5 + r() * 0.5).toFixed(1);
    return `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rr.toFixed(0)}" ry="${(rr * (0.56 + r() * 0.12)).toFixed(0)}"
      fill="none" stroke="${mezclar(color, m.tinte, 0.2 + i * 0.05)}" stroke-width="${gr}" opacity="${(0.78 - i * 0.06).toFixed(2)}"/>`;
  }).join('\n');
  return `<rect width="${A}" height="${B}" fill="${mezclar(m.cielo[0], color, 0.06)}"/>
${anillos}
<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="26" fill="${color}" opacity="0.9"/>`;
}

function laLinea(r, color, m) {
  const y = B * (0.36 + r() * 0.3);
  const n = 3 + Math.floor(r() * 3);
  const paso = A / (n + 1);
  const paradas = Array.from({ length: n }, (_, i) => {
    const x = paso * (i + 1) + (r() - 0.5) * 40;
    const rr = i === Math.floor(n / 2) ? 46 : 30;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr}" fill="${i === Math.floor(n / 2) ? color : mezclar(color, m.cielo[0], 0.5)}"
      stroke="${mezclar(color, '#000000', 0.42)}" stroke-width="5"/>`;
  }).join('\n');
  return `<rect width="${A}" height="${B}" fill="${mezclar(m.cielo[0], color, 0.05)}"/>
<line x1="60" y1="${y.toFixed(0)}" x2="${A - 60}" y2="${y.toFixed(0)}" stroke="${color}" stroke-width="12" stroke-linecap="round" opacity="0.85"/>
${paradas}`;
}

function franjas(r, color, m) {
  const giro = -24 + r() * 48;
  const barras = Array.from({ length: 11 }, (_, i) => {
    const h = 26 + r() * 74;
    const y = -140 + i * 92;
    return `<rect x="-260" y="${y.toFixed(0)}" width="${A + 520}" height="${h.toFixed(0)}"
      fill="${mezclar(color, m.tinte, 0.08 + (i % 4) * 0.16)}" opacity="${(0.5 + (i % 3) * 0.16).toFixed(2)}"/>`;
  }).join('\n');
  return `<rect width="${A}" height="${B}" fill="${mezclar(m.cielo[1], color, 0.08)}"/>
<g transform="rotate(${giro.toFixed(1)} ${A / 2} ${B / 2})">${barras}</g>`;
}

const DETALLES = [curvasDeNivel, laLinea, franjas];

/**
 * Devuelve un SVG (cadena) de 1200x750.
 * @param {string} id      identificador de la pieza: fija el resultado
 * @param {string} color   color del concejo
 * @param {string} motivo  'picos' | 'ria' | 'pumarada' | 'valle'
 */
export function portadaSvg(id, color = '#2F6F4E', motivo = 'valle') {
  const r = semilla(id);
  const m = MOMENTOS[Math.floor(r() * MOMENTOS.length)];

  // Casi una de cada dos va en "detalle". Con un tercio todavía salían dos rías
  // casi idénticas juntas en la portada: cuando varias piezas del mismo concejo
  // caen seguidas, comparten motivo y comparten paleta, y se notan.
  const sorteo = r();
  if (sorteo < 0.45) {
    const hacer = DETALLES[Math.floor(r() * DETALLES.length)];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${A} ${B}" width="${A}" height="${B}" role="img" aria-label="Ilustración de La Prida">
${hacer(r, color, m)}
</svg>`;
  }

  const dibujar = MOTIVOS[motivo] ?? valle;

  // El sol tampoco es obligatorio: estaba en todas y unificaba de más.
  const conAstro = r() < 0.6;
  const astroX = 190 + r() * 820;
  const astroY = 96 + r() * 74;
  const astroR = 40 + r() * 26;

  const grano = Array.from({ length: 60 }, () => {
    const x = (r() * A).toFixed(0);
    const y = (r() * B).toFixed(0);
    return `<circle cx="${x}" cy="${y}" r="${(0.7 + r() * 1.6).toFixed(1)}" fill="${m.tinte}" opacity="0.10"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${A} ${B}" width="${A}" height="${B}" role="img" aria-label="Ilustración de ${motivo}, ${m.nombre}">
<defs>
  <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${m.cielo[0]}"/>
    <stop offset="100%" stop-color="${m.cielo[1]}"/>
  </linearGradient>
</defs>
<rect width="${A}" height="${B}" fill="url(#cielo)"/>
${
  conAstro
    ? `<circle cx="${astroX.toFixed(0)}" cy="${astroY.toFixed(0)}" r="${(astroR * 1.9).toFixed(0)}" fill="${m.astro}" opacity="0.14"/>
<circle cx="${astroX.toFixed(0)}" cy="${astroY.toFixed(0)}" r="${astroR.toFixed(0)}" fill="${m.astro}" opacity="0.62"/>`
    : ''
}
${dibujar(r, color, m)}
${grano}
</svg>`;
}
