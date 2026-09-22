#!/usr/bin/env node
// Recupera el banco de fotos desde una edición ya publicada.
//
// POR QUÉ EXISTE. El contenedor donde corre la edición diaria es efímero y no
// tiene salida a Wikimedia, así que no puede volver a descargar las fotos. Pero
// el propio artefacto publicado las lleva dentro, incrustadas como data URI en
// un bloque <script id="imagenes">. Este script las saca de ahí y las devuelve a
// content/fotos/, que es lo único que le falta al generador para reconstruir el
// sitio entero sin perder ni una imagen.
//
//   node scripts/restaurar.mjs <ruta-del-html-publicado>

import fs from 'node:fs/promises';
import path from 'node:path';

const origen = process.argv[2];
if (!origen) {
  console.error('Uso: node scripts/restaurar.mjs <ruta-del-html-publicado>');
  process.exit(1);
}

const RAIZ = path.join(import.meta.dirname, '..');
const html = await fs.readFile(origen, 'utf8');

const m = html.match(/<script id="imagenes" type="application\/json">([\s\S]*?)<\/script>/);
if (!m) {
  console.error('⚠ Ese HTML no lleva banco de imágenes. ¿Seguro que es una edición empaquetada?');
  process.exit(2);
}

let banco;
try {
  banco = JSON.parse(m[1]);
} catch (err) {
  console.error(`⚠ El banco de imágenes no es JSON válido: ${err.message}`);
  process.exit(2);
}

let escritas = 0;
let saltadas = 0;
for (const [ruta, dato] of Object.entries(banco)) {
  // solo las fotos: las ilustraciones de /img/ las regenera el propio build
  if (!ruta.startsWith('/fotos/')) continue;
  const mm = String(dato).match(/^data:[^;]+;base64,(.+)$/);
  if (!mm) { saltadas++; continue; }
  const destino = path.join(RAIZ, 'content', 'fotos', path.basename(ruta));
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, Buffer.from(mm[1], 'base64'));
  escritas++;
}

console.log(`📷 ${escritas} fotos recuperadas en content/fotos/${saltadas ? ` (${saltadas} sin datos)` : ''}`);
