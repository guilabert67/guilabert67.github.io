#!/usr/bin/env node
// Empaqueta todo dist/ en una sola página autónoma (para publicar como vista previa).
//   node scripts/empaquetar.mjs  →  vista-previa.html

import fs from 'node:fs/promises';
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..');
const DIST = path.join(RAIZ, 'dist');

async function paginas(dir = DIST, base = '') {
  const salida = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) salida.push(...(await paginas(p, `${base}/${e.name}`)));
    else if (e.name === 'index.html') salida.push({ ruta: `${base}/` || '/', archivo: p });
  }
  return salida;
}

const cuerpoDe = (html) => {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let c = m ? m[1] : html;
  c = c.replace(/<script[\s\S]*?<\/script>\s*$/i, '');          // el script global va una sola vez
  c = c.replace(/<div class="cookies"[\s\S]*?<\/div>\s*<\/div>/i, ''); // idem el aviso de cookies
  return c.trim();
};

const tituloDe = (html) => (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? 'La Prida').trim();

async function main() {
  const lista = (await paginas()).sort((a, b) => a.ruta.localeCompare(b.ruta));
  const rutas = new Set(lista.map((p) => p.ruta));

  // imágenes → data URI
  const imgs = new Map();
  const TIPOS = { '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
  for (const carpeta of ['img', 'fotos']) {
    let ficheros = [];
    try { ficheros = await fs.readdir(path.join(DIST, carpeta)); } catch { continue; }
    for (const f of ficheros) {
      const tipo = TIPOS[path.extname(f).toLowerCase()];
      if (!tipo) continue;
      const bytes = await fs.readFile(path.join(DIST, carpeta, f));
      imgs.set(`/${carpeta}/${f}`, `data:${tipo};base64,${bytes.toString('base64')}`);
    }
  }

  const secciones = [];
  for (const { ruta, archivo } of lista) {
    const html = await fs.readFile(archivo, 'utf8');
    let cuerpo = cuerpoDe(html);
    cuerpo = cuerpo.replace(/(href=")(\/[^"]*)(")/g, (m, a, url, z) =>
      rutas.has(url) ? `${a}#${url}${z}` : `${a}#/${z}`
    );
    // Las imágenes no se incrustan una vez por página: se referencian y se
    // reparten al cargar. Así una foto que sale en cuatro páginas pesa una vez.
    cuerpo = cuerpo.replace(/(<img\b[^>]*?)src="(\/[^"]*)"/g, (m, antes, url) =>
      imgs.has(url) ? `${antes}data-foto="${url}"` : m
    );
    secciones.push(
      `<div class="ruta" data-ruta="${ruta}" data-titulo="${tituloDe(html).replace(/"/g, '&quot;')}" hidden>\n${cuerpo}\n</div>`
    );
  }

  // El artefacto marca el tema con data-theme="dark"/"light"; la hoja usa data-tema.
  const css = (await fs.readFile(path.join(DIST, 'estilos.css'), 'utf8'))
    .replace(/\[data-tema='oscuro'\]/g, '[data-theme="dark"]')
    .replace(/\[data-tema='claro'\]/g, '[data-theme="light"]');

  const salida = `<title>La Prida</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,900&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
${css}
.ruta[hidden] { display: none !important; }
</style>

${secciones.join('\n\n')}

<script id="imagenes" type="application/json">${JSON.stringify(Object.fromEntries(imgs))}</script>
<script>
(function () {
  var raiz = document.documentElement;
  var rutas = [].slice.call(document.querySelectorAll('.ruta'));

  var banco = JSON.parse(document.getElementById('imagenes').textContent);
  [].forEach.call(document.querySelectorAll('img[data-foto]'), function (img) {
    var d = banco[img.getAttribute('data-foto')];
    if (d) img.src = d;
  });

  function pintarRuta() {
    var actual = (location.hash || '#/').slice(1) || '/';
    var encontrada = false;
    rutas.forEach(function (r) {
      var suya = r.dataset.ruta === actual;
      r.hidden = !suya;
      if (suya) { encontrada = true; document.title = r.dataset.titulo; }
    });
    if (!encontrada && rutas.length) {
      rutas[0].hidden = false;
      rutas.forEach(function (r) { if (r.dataset.ruta === '/') r.hidden = false; });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  addEventListener('hashchange', pintarRuta);
  pintarRuta();

  var boton = null;
  function esOscuro() {
    return raiz.dataset.theme
      ? raiz.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function pintarTema() {
    document.querySelectorAll('[data-tema-boton]').forEach(function (b) {
      b.textContent = esOscuro() ? 'Modo día' : 'Modo noche';
    });
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-tema-boton]');
    if (!b) return;
    raiz.dataset.theme = esOscuro() ? 'light' : 'dark';
    try { localStorage.setItem('prida-tema', raiz.dataset.theme); } catch (e) {}
    pintarTema();
  });
  try {
    var g = localStorage.getItem('prida-tema');
    if (g) raiz.dataset.theme = g;
  } catch (e) {}
  pintarTema();
})();
</script>`;

  await fs.writeFile(path.join(RAIZ, 'vista-previa.html'), salida);
  console.log(`Vista previa: ${lista.length} páginas en un solo archivo (${Math.round(salida.length / 1024)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
