# Fotos

Aquí van las fotografías del sitio. Hay tres maneras de llenarlo, y se usan en este orden:

1. **La foto que trae la propia noticia.** Muchos feeds incluyen imagen; la ingesta la coge sola.
2. **Fotos libres descargadas por tema.** `node scripts/fotos.mjs` busca en Openverse y Wikimedia
   Commons una foto **relacionada con el asunto de cada pieza** (sidra, queso, feria de ganado,
   carretera, ría…), y solo se queda con las de **dominio público o CC0**: sin restricciones, sin
   permiso y sin obligación de citar. El crédito se guarda igualmente en `creditos.json` y sale al
   pie de la foto, que es lo suyo aunque la licencia no lo pida.
3. **Ilustración propia**, generada con código, si no hay ninguna foto. Nunca queda un hueco.

## Poner tus propias fotos

Es la mejor opción y la más rápida: una foto tuya de Infiestu vale más que cualquier banco de
imágenes. Guarda el archivo aquí con el mismo nombre que la pieza y añade su ficha a
`creditos.json`:

```json
{
  "infiesto-arregla-el-parque-infantil-del-paseo": {
    "archivo": "infiesto-arregla-el-parque-infantil-del-paseo.jpg",
    "autor": "Emilio L. Guilabert",
    "licencia": "Fotografía propia",
    "origen": "https://laprida.example",
    "fuente": "La Prida"
  }
}
```

El identificador de cada pieza está en `content/data/noticias.json`, en el campo `id`.
