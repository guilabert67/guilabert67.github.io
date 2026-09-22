# La Prida

El diario de la mañana de **Piloña, Nava, Cabrales y Villaviciosa**. Se lee con el café, en cinco
minutos, y se actualiza solo cada madrugada.

Es un generador de sitio estático **sin ninguna dependencia**: solo Node 20 o superior. No hay
`npm install` que valga, no hay framework que se rompa dentro de un año.

---

## Arrancar en dos minutos

```bash
node build.mjs        # construye el sitio en dist/ con las piezas de muestra
npm run ver           # lo levanta en http://localhost:4173
```

Verás la web tal cual. Si algún día vuelves a llenarla con las piezas de muestra, sale una franja
dorada avisando; desaparece sola en cuanto entra la primera noticia real.

## El día a día

```bash
npm run ingesta       # recoge las fuentes, filtra por concejo y reescribe
npm run build         # regenera dist/
npm run diario        # las dos cosas seguidas: es lo que corre cada mañana
```

Para que la reescritura funcione hace falta una clave de la API de Claude:

```bash
# Windows (PowerShell)
$env:ANTHROPIC_API_KEY = "sk-ant-..."
# macOS / Linux
export ANTHROPIC_API_KEY="sk-ant-..."
```

Sin clave, la ingesta sigue funcionando: en vez de reescribir, guarda titular + extracto + enlace a
la fuente. Con `npm run ingesta:sin-ia` fuerzas ese modo a propósito.

El tiempo de los cuatro concejos sale de Open-Meteo, que **no pide clave ni registro**. Las
coordenadas están en `concejos[].coords`.

---

## Cómo está montado

```
src/config.mjs            ← lo que vas a tocar el 90 % de las veces
src/estilos.css           ← todo el diseño, en un solo archivo
src/lib/rss.mjs           ← lector de RSS/Atom propio
src/lib/redactor.mjs      ← reescritura con Claude + plan B sin IA
src/lib/plantillas.mjs    ← el HTML
src/lib/portadas.mjs      ← ilustraciones generadas para las piezas sin foto
src/lib/antiplagio.mjs    ← control de calco: avisa si una pieza copia a su fuente
scripts/ingesta.mjs       ← recoger noticias
scripts/fotos.mjs         ← buscar foto libre según el tema de cada pieza
scripts/empaquetar.mjs    ← todo el sitio en un archivo, para enseñarlo
scripts/servidor.mjs      ← servidor local para verlo
build.mjs                 ← generar dist/
content/data/*.json       ← el archivo de noticias, la agenda y el tiempo
```

### `src/config.mjs`, lo importante

| Qué | Dónde | Para qué |
|---|---|---|
| `sitio.url` | arriba del todo | **Cámbialo** al dominio real antes de publicar: de ahí salen el sitemap, el RSS y las etiquetas de compartir |
| `concejos[].feeds` | uno por concejo | fuentes ya filtradas por concejo |
| `concejos[].claves` | topónimos | con esto se pescan las noticias de casa dentro de los medios regionales |
| `fuentesRegionales` | lista | se leen enteras y se filtran por los topónimos de arriba |
| `manualDeEstilo` | texto largo | **el tono de la web**. Es literalmente lo que lee el redactor antes de escribir |
| `anuncios` | objeto | AdSense y patrocinios locales |
| `ingesta` | objeto | cuántas piezas por concejo, cuántos días vive una noticia, modelo |
| `ingesta.usarImagenDeLaFuente` | dentro de `ingesta` | **déjalo en false**: las fotos de los feeds son del medio que las publicó |
| `tarifas` | lista | lo que sale publicado en `/anunciate/` |
| `boletin` | objeto | pega aquí la URL del formulario de MailerLite y empieza a recoger correos |
| `afiliados` | objeto | identificadores de Booking, GetYourGuide, Civitatis y Amazon |

Cambiar el tono de la web es editar un párrafo de `manualDeEstilo`. Si algo suena demasiado formal,
díselo ahí y en la siguiente edición ya sale distinto.

---

## Fuentes ya verificadas

Funcionando y en `config.mjs`:

- `elfielato.es` — tiene **feed propio por concejo** para los cuatro. Es la fuente principal.
- `rtpa.es`, `asturiasmundial.com`, `eldiario.es/asturias` — regionales, se filtran por topónimo.
- Open-Meteo para el tiempo, sin clave. Si algún día quieres AEMET, los códigos INE son: Piloña
  `33049`, Nava `33040`, Cabrales `33008`, Villaviciosa `33076`.

Pendientes de conectar (existen, pero hay que probarlas desde tu propio servidor porque bloquean
peticiones automáticas desde según dónde):

- Los cuatro ayuntamientos: `ayto-pilona.es/noticias`, `ayto-nava.es/noticias`, `cabrales.es/noticias`,
  `villaviciosa.es/noticias`. Los cuatro usan el mismo gestor y publican un RSS enlazado en el pie.
- BOPA: `miprincipado.asturias.es/bopa-sumario?p_r_p_summaryDate=DD%2FMM%2FAAAA`, filtrando por el
  nombre de cada concejo. No hay API oficial.
- LNE y El Comercio: tienen feeds, pero conviene comprobarlos desde tu servidor.

---

## Publicar

### GitHub Pages (gratis, es lo que trae montado)

1. Sube esto a un repositorio.
2. En **Settings → Pages**, elige *GitHub Actions* como origen.
3. En **Settings → Secrets and variables → Actions**, añade `ANTHROPIC_API_KEY` (solo si quieres la
   reescritura con IA; sin ella el sitio funciona igual en modo agregador).
4. Ya está: `.github/workflows/publicar.yml` recoge las noticias, construye y publica **todas las
   mañanas a las 7:10**. También hay un botón para lanzarlo a mano desde la pestaña *Actions*.

El workflow además guarda el archivo de noticias en el repositorio, así que la hemeroteca se va
construyendo sola.

### Netlify o Cloudflare Pages

Comando de build: `node build.mjs` · carpeta publicada: `dist`. Las claves van en las variables de
entorno del panel.

---

## Ganar dinero con esto

Está preparado, no activado:

1. **AdSense.** Pon tu `ca-pub-…` en `anuncios.adsense.cliente`, los identificadores de bloque en
   `slots` y `activo: true`. Hay cuatro huecos: cabecera de portada, mitad de portada, dentro del
   artículo y lateral. Mientras esté apagado se ven como recuadros discretos, así que puedes
   enseñárselos a un anunciante tal cual.
2. **Patrocinios locales.** Añade entradas a `anuncios.patrocinios` (llagares, queserías, hostelería,
   inmobiliarias). Se ven aunque AdSense esté apagado y suelen pagar mucho mejor por visita que la
   publicidad programática cuando el público es de casa.
3. **Boletín.** El formulario está puesto y sin conectar. Enchúfalo a Buttondown, Mailerlite o
   similar: en medios hiperlocales el correo diario es el activo que de verdad vale dinero.

Para que AdSense te acepte necesitas, sí o sí, aviso legal, política de privacidad, aviso de cookies
y contenido propio publicándose con regularidad. Las tres primeras cosas ya están hechas; la cuarta
la resuelve el workflow.

---

## Derechos de autor: cómo está resuelto

Esto es lo que separa un agregador honrado de un problema legal. Está atado en cuatro sitios.

**El texto.** Cada pieza se redacta de nuevo a partir del hecho, no de la frase del otro. El
`manualDeEstilo` lo dice expresamente, incluida la trampa más habitual: reordenar la frase ajena no
es reescribir. Las expresiones textuales de terceros van entrecomilladas y atribuidas, que es lo que
ampara el derecho de cita (art. 32 LPI).

**El control automático.** `src/lib/antiplagio.mjs` compara cada pieza con su material de partida y
avisa si comparten ocho palabras seguidas. Nadie escribe ocho palabras iguales por casualidad. La
ingesta lo ejecuta sola: las piezas sospechosas quedan marcadas con `revisar` en el JSON y salen
avisadas por consola para que las repases antes de publicar.

**Las fotos.** `ingesta.usarImagenDeLaFuente` está en **false** a propósito. Los feeds traen la foto
del medio que la publicó, y esa foto no es tuya ni aunque se cargue desde su servidor: enlazarla es
usarla. Se guarda en `imagenFuente` solo como referencia y la web tira de foto libre de Wikimedia
Commons o de ilustración propia. Ponlo a `true` únicamente para un medio que te lo haya autorizado
por escrito.

**La atribución.** Bajo cada foto sale autor, licencia y enlace al original. Al pie de cada pieza,
el medio de donde salió la información, enlazado. Las tipografías (Fraunces e Inter) son SIL Open
Font License, de uso comercial libre. El logo y las ilustraciones son originales.

Y la regla que resuelve el 99 % de los conflictos antes de que existan: si un medio te pide que
dejes de recoger su canal, quítalo de `config.mjs` ese mismo día y contéstale dando las gracias.

## Las otras reglas de la casa

- **No se inventa nada.** El redactor tiene orden de no añadir cifras, citas, nombres ni fechas que
  no estén en el material de partida. Si da para dos párrafos, escribe dos.
- **Se corrige rápido.** Correo de contacto visible y correcciones el mismo día, con constancia al
  pie de la pieza.

---

## Ideas para más adelante

- Boletín de correo automático a las 7:00 con el mismo contenido del Despertador.
- Cartelera de fiestas de todo el año, que es lo que más se busca desde fuera.
- Farmacias de guardia (hay que pedirle el calendario al Colegio de Farmacéuticos de Asturias).
- Esquelas y avisos de vecinos: en local, es de lo más leído que existe.
- Página por parroquia dentro de cada concejo, cuando haya volumen suficiente.
