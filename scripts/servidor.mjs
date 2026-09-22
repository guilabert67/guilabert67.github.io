#!/usr/bin/env node
// Servidor local para ver el sitio sin instalar nada.  →  npm run ver
// Abre http://localhost:4173

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const DIST = path.join(import.meta.dirname, '..', 'dist');
const PUERTO = Number(process.env.PUERTO ?? 4173);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

http
  .createServer(async (req, res) => {
    try {
      const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
      let destino = path.join(DIST, url);
      if (!destino.startsWith(DIST)) throw new Error('fuera');
      const info = await fs.stat(destino).catch(() => null);
      if (!info || info.isDirectory()) destino = path.join(destino, 'index.html');
      const cuerpo = await fs.readFile(destino);
      res.writeHead(200, { 'content-type': TIPOS[path.extname(destino)] ?? 'application/octet-stream' });
      res.end(cuerpo);
    } catch {
      const err404 = await fs.readFile(path.join(DIST, '404.html')).catch(() => 'No encontrado');
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end(err404);
    }
  })
  .listen(PUERTO, () => console.log(`☕ La Prida en http://localhost:${PUERTO}`));
