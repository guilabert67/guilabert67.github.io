# Seguridad de La Prida

## Cómo avisar de un fallo

Si encuentras un fallo de seguridad en https://guilabert67.github.io o en este
repositorio, **no abras una incidencia pública**. Usa una de estas dos vías:

- El botón **«Report a vulnerability»** de la pestaña *Security* de este
  repositorio (aviso privado).
- Un correo a **laprida.asturias@gmail.com** con el asunto «Seguridad».

Contesto en un plazo de 7 días. Si el fallo es real, se corrige y, si quieres,
se te cita en el aviso.

## Qué se considera fallo

- Ejecutar código en el navegador de un lector (XSS) o saltarse la política de
  contenidos (CSP).
- Conseguir que el diario publique o enlace algo que no ha pasado por la
  ingesta y la reescritura.
- Acceder a secretos del repositorio o modificar los flujos de publicación.

No hace falta avisar de lo que depende de GitHub Pages y no se puede cambiar
desde aquí: las cabeceras HTTP del servidor (`X-Frame-Options`,
`Permissions-Policy` y las demás), que GitHub no deja configurar.

## Lo que ya hay

- Política de contenidos (CSP) calculada para cada página: solo se ejecutan los
  scripts propios (por su huella sha256) y el contador de Cloudflare por su ruta
  exacta. Sin `data:`, sin marcos, sin formularios hacia fuera.
- Las URL que vienen de fuera (feeds, anuncios, el redactor) se filtran: solo
  `http`, `https`, `mailto`, `tel` y rutas propias. Las rutas propias se codifican.
- Los datos estructurados (JSON-LD) se escapan para que un titular no pueda
  cerrar el bloque `<script>`.
- Las piezas con dirección o concejo de forma inválida no se publican.
- El material de los feeds llega al modelo marcado como dato, y la respuesta se
  descarta si trae enlaces, correos, HTML o frases de instrucción que no estaban
  en la fuente (defensa contra la inyección de instrucciones).
- Los feeds se leen con tope de tamaño (5 MB), tiempo límite y un analizador de
  coste lineal; las fotos, solo JPEG/PNG/WebP comprobados por sus primeros
  bytes y con tope de 15 MB.
- Si otra web mete el diario en un marco, la página sale del marco.
- Las acciones de GitHub están fijadas por SHA, los flujos no tienen permisos
  por defecto y cada trabajo tiene tiempo máximo. Dependabot las revisa.
- `/.well-known/security.txt` según el RFC 9116.
