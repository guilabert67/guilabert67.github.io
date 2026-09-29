# DESIGN.md — La Prida

Identidad visual del diario. **No es una propuesta: está sacada del código que
ya publica**, `src/estilos.css` (1.116 líneas) y `src/config.mjs`. Si algo de
aquí no cuadra con el CSS, manda el CSS y se corrige este fichero.

Para quien genere interfaz: lee esto antes de escribir una línea de HTML o CSS
de La Prida, y usa los nombres de variable, no los valores en crudo.

---

## 1. De qué va

Un diario hiperlocal de papel, hecho en pantalla. La referencia no es una web
de noticias moderna: es **un periódico impreso** — papel crema, tinta negra,
línea gruesa, titulares apretados y una retícula que se ve.

Tres decisiones lo resumen:

- **Sombra dura, nunca difuminada.** `5px 5px 0` en negro sólido, sin blur.
- **La línea se ve.** 3 px en todo: cajas, separadores, chapas.
- **El color no decora, informa.** Cada concejo tiene el suyo y solo eso.

Lo que NO es: degradados, cristal esmerilado, sombras suaves, animaciones de
entrada, iconos de librería, cajas con relleno gris claro.

---

## 2. Color

### Papel y tinta

| Variable | Claro | Oscuro |
|---|---|---|
| `--fondo` | `#fdfcf8` | `#0d0c0a` |
| `--fondo-2` | `#f3f0e8` | `#171512` |
| `--fondo-3` | `#e8e3d7` | `#22201b` |
| `--tinta` | `#14120f` | `#f7f4ec` |
| `--tinta-2` | `#4b463d` | `#c0b9a9` |
| `--tinta-3` | `#6b6455` | `#8d8676` |
| `--linea` | `#14120f` | `#f7f4ec` |
| `--linea-suave` | `#d8d2c4` | `#35322a` |

El fondo es **crema, no blanco**, y la tinta es **casi negra, no negra**. Es lo
que da el aire de papel. No sustituir por `#fff` / `#000`.

### Los cinco concejos

Cada concejo tiene un color de marca y **otro distinto para texto**, más oscuro,
porque el de marca no llega al contraste AA sobre papel.

| Concejo | Marca | Texto sobre papel |
|---|---|---|
| Piloña | `#F2451B` naranja | `#C6320F` |
| Nava | `#F2B705` amarillo | `#8A6400` |
| Cabranes | `#00A39B` verde | `#00807A` |
| Cabrales | `#1B4DFF` azul | `#1B4DFF` |
| Villaviciosa | `#D6009A` magenta | `#B00080` |

Se usan a través de `--c` (marca) y `--c-txt` (texto), que cada concejo pisa.
**Nunca escribir el hex a pelo en un componente.**

### Reglas de contraste que ya costaron un arreglo

- `--tinta-3` es `#6b6455` y da 5,7:1. Antes era `#7a7365`, que daba 4,1:1 y no
  llegaba al AA. **No aclararlo.**
- En modo noche los `--c-txt` no valen: se oscurecieron para el papel y sobre
  negro se hunden (el azul de Cabrales daba 3,3:1). Por eso en oscuro la chapa
  usa `color-mix(in srgb, var(--c) 62%, #ffffff)`.
- El amarillo de Nava pide tinta negra encima: `.disco[data-claro='si']`.

El foco es **siempre** `outline: 3px solid var(--azul)` con `offset: 3px`. No se
quita nunca.

---

## 3. Tipografía

Tres familias, las tres con licencia **SIL Open Font License 1.1**, servidas
desde `/fuentes/` (con Google Fonts solo como respaldo).

| Variable | Fuente | Para qué |
|---|---|---|
| `--display` | **Bricolage Grotesque** 500/600/700/800 | titulares y nombres |
| `--texto` | **Inter** 400/500/600/700 | cuerpo |
| `--mono` | **Martian Mono** 400/600 | chapas, horas, cintas, datos |

Cuerpo base: **17 px, interlineado 1,7**. No bajar de 17.

Los titulares son de display, peso 800, **interlineado por debajo de 1 y letra
apretada** — es la mitad del carácter del diario:

```
portada       clamp(48px, 9vw, 74px)     line-height 1      letter-spacing -0.05em
apertura      clamp(52px, 12vw, 86px)    line-height 0.82
artículo      clamp(30px, 5.4vw, 54px)   line-height 1.02   letter-spacing -0.04em
cabecera      clamp(32px, 6vw, 50px)     line-height 0.9    letter-spacing -0.035em
sección       clamp(20px, 3vw, 27px)
```

La mono va casi siempre a **12,5 px, mayúsculas, `letter-spacing` 0.04–0.06em**.
Es la voz de los datos: la hora, el concejo, el número, la fuente.

---

## 4. Forma

```
--ancho    1200px     ancho máximo del contenido
--grosor   3px        el trazo, en todas partes (26 usos)
--radio    10px       esquina
--duro     5px 5px 0 var(--linea)    sombra sólida, sin desenfoque (5 usos)
```

La sombra dura se reserva para lo que debe destacar de verdad. Cinco usos en
1.116 líneas: si se pone en todo, deja de significar nada.

---

## 5. Nombres

BEM en castellano, siempre. Bloque, `__` elemento, `--` variante:

```
.articulo  .articulo__titular  .articulo__entradilla  .articulo__cuerpo
.anuncio   .anuncio__marca     .anuncio--destacado    .anuncio--caducado
.agenda    .agenda__dia        .agenda__donde
.chapa     .chapa .disco
.cinta   .cabecera   .riel   .pieza   .arranque   .apunte   .afiliado
```

**Nada en inglés.** Ni `card`, ni `badge`, ni `hero`. El código de La Prida se
lee en el mismo idioma que se escribe el periódico.

---

## 6. Claro y oscuro

`color-scheme: light dark`. El oscuro entra por `prefers-color-scheme` bajo
`:root:not([data-tema='claro'])`, y se puede forzar con `:root[data-tema='oscuro']`.
Las dos ramas se escriben siempre juntas: **todo token nuevo necesita su valor
de noche el mismo día que nace.**

---

## 7. Al tocar una página

1. Usar variables, nunca valores sueltos.
2. Componente nuevo → nombre en castellano, BEM.
3. Color de concejo → `--c` / `--c-txt`, y comprobar que en oscuro se lee.
4. Nada de blur, degradados ni sombras suaves.
5. Antes de dar algo por bueno: mirarlo en claro y en oscuro, y a 360 px de ancho.
