// La Prida — configuración general del sitio.
// Todo lo que se toca a menudo (fuentes, colores, secciones, anuncios) vive aquí.

// Una prida es, en asturiano, la cuesta que da salida a un alto: la collada, el
// sitio desde el que se ve el valle entero. Del latín PRODITAM, «la que está
// delante». Hay una Prida en Piloña (Ques y San Xuan de Berbío), otra en
// Villaviciosa y las Cabañas de la Prida en Cabrales.
export const sitio = {
  nombre: 'La Prida',
  lema: 'Lo que se ve dende la collada',
  descripcion:
    'El diario de la mañana de Piloña, Nava, Cabranes, Cabrales y Villaviciosa. Lo que pasa en casa, contado corto y con gracia, para leer con el café.',
  // La dirección del sitio. NO hace falta tocarla: al publicar desde GitHub, el
  // propio flujo la rellena con https://tu-usuario.github.io. Solo se cambia a
  // mano el día que haya dominio propio (sin barra final).
  url: process.env.SITIO_URL || 'https://laprida.example',
  idioma: 'es-ES',
  autor: 'Redacción de La Prida',
  email: 'laprida.asturias@gmail.com',
  zonaHoraria: 'Europe/Madrid',
  // Las tres ediciones del día, hora de Asturias. Llevan NOMBRE, no hora: el
  // sello de portada dice «Edición de la mañana», no «Edición de las 07:00».
  //
  // Por qué. GitHub no cumple la hora de los disparos programados: los retrasa
  // y a veces se los salta. Una edición anunciada a las 07:00 puede acabar
  // saliendo a las 07:40, y entonces la portada se desmiente a sí misma. Jurar
  // un minuto exacto que no está en nuestra mano es prometer de más tres veces
  // al día; nombrar la edición, en cambio, nunca es mentira.
  //
  // `desde` es la hora a partir de la cual esa edición pasa a ser la vigente.
  // El rótulo que se imprime no vive aquí sino en idiomas.mjs, porque cambia
  // con el idioma; la clave es lo que los une.
  //
  // Si añades o quitas una, cámbiala también en .github/workflows/publicar.yml
  // y añade su rótulo en los cuatro idiomas.
  // POR QUÉ `desde` NO COINCIDE CON LA HORA DE LA EDICIÓN. Las tres ediciones
  // siguen siendo las de las 07:00, las 14:00 y las 20:00: eso es lo que el
  // diario promete y lo que el lector espera. Pero GitHub arranca cuando le
  // viene bien —se han medido retrasos de media hora, de dos horas y de cuatro—
  // y un tren que sale tarde llega tarde.
  //
  // Así que el diario se PREPARA dos horas antes de la hora prometida. Si el
  // disparo es puntual, la edición está lista pronto y no pasa nada; si llega
  // con dos horas de retraso, llega justo a su hora. El retraso deja de ser lo
  // normal y pasa a ser el caso peor.
  //
  // El precio, dicho claro: la edición de la mañana puede cerrarse a las 05:40
  // y no recoger lo que se publique entre esa hora y las siete. En estos cinco
  // concejos, a esas horas, no suele publicarse nada.
  ediciones: [
    { clave: 'manana', desde: 5 },   // edición de las 07:00
    { clave: 'mediodia', desde: 12 }, // edición de las 14:00
    { clave: 'noche', desde: 18 },   // edición de las 20:00
  ],
};

// ── Medir visitas ───────────────────────────────────────────────────────────
//
// Un contador SIN COOKIES, que es la única clase que este diario acepta: si
// usara cookies habría que volver a poner el aviso de consentimiento que se
// quitó, y tapar la portada para contar visitas es un mal negocio.
//
// Mientras `token` esté vacío no se carga nada en absoluto: ni una petición, ni
// un byte. El sitio funciona exactamente igual que hoy.
//
// Para encenderlo: crear una cuenta gratuita en Cloudflare, entrar en «Web
// Analytics», añadir el sitio guilabert67.github.io y copiar aquí el token que
// da (una cadena larga de letras y números). Nada más.
export const analitica = {
  token: 'aa2a568fed4d4e19a747372c5e0b9853',
};

// ── Avisar a los buscadores (IndexNow) ──────────────────────────────────────
// Protocolo abierto y gratuito: en vez de esperar a que el buscador pase, se le
// avisa en cuanto sale una edición. Lo usan Bing, Yandex, Seznam y otros.
//
// La clave no es un secreto y NO hay que esconderla: el protocolo obliga a
// publicarla en la raíz del sitio, en <clave>.txt, y es precisamente eso lo que
// demuestra que quien avisa manda de verdad en el dominio. Es un número de
// bastidor, no una contraseña.
//
// Para cambiarla: cualquier cadena de 8 a 128 letras y números vale. El fichero
// de la raíz se regenera solo en la siguiente edición.
// Dejarla en blanco apaga el aviso sin romper nada.
export const indexnow = {
  clave: 'de7a0f3dd4c62d014f185f38a88f65a5',
};

// ── Monetización ────────────────────────────────────────────────────────────
// Todo lo de ganar dinero vive aquí. Nada de esto cuesta nada de entrada.
export const anuncios = {
  // AdSense: pon tu ca-pub-… en `cliente`, los IDs de bloque en `slots`, y activo: true.
  // Mientras esté apagado los huecos se ven como recuadros discretos, que sirven de
  // muestra para enseñárselos a un anunciante.
  activo: false,

  // ¿Se comercializa la publicidad AHORA MISMO?
  //
  // Puesto en false el 1/10/2026. El diario no ha facturado nunca, pero la
  // página «Anúnciate» ofrecía tarifas con precios, y ofrecer un servicio a
  // cambio de dinero es lo que mete el proyecto en zona gris mientras no estén
  // hechos los trámites (alta censal, y lo que diga el gestor sobre autónomos).
  // Como no se estaba vendiendo nada, quitar la oferta no cuesta nada y cierra
  // la duda.
  //
  // La página NO desaparece: sigue contando qué es La Prida y recoge el interés
  // de quien quiera anunciarse, para avisarle cuando se abra. Así no se pierde
  // ni el posicionamiento ni los interesados.
  //
  // Para volver a vender: poner esto en true. Vuelven los precios y el «cómo se
  // contrata» solos, sin tocar nada más.
  seVende: false,
  adsense: {
    cliente: '', // 'ca-pub-0000000000000000'
    slots: {
      portadaSuperior: '',
      portadaMedia: '',
      articuloTexto: '',
      lateral: '',
    },
  },

  // Patrocinios locales vendidos por ti. Son los que de verdad pagan.
  // `hasta` en formato AAAA-MM-DD: al pasar la fecha, el patrocinio desaparece solo.
  patrocinios: [
    // {
    //   titulo: 'Llagar Fulanín',
    //   texto: 'Sidra de Nava desde 1948. Espichas todo el año.',
    //   url: 'https://…',
    //   concejo: 'nava',        // opcional: solo aparece en ese concejo
    //   hasta: '2026-12-31',
    // },
  ],
};

// Lo que le enseñas a un negocio cuando pregunta «¿y esto cuánto vale?».
// Sale publicado en /anunciate/. Ajusta los precios cuando tengas datos reales.
export const tarifas = [
  {
    nombre: 'Patrocinador de concejo',
    precio: '35 € al mes',
    descripcion: 'Tu negocio en el lateral de tu concejo y en todas sus piezas. Para quien vende en casa.',
    incluye: ['Nombre, frase y enlace', 'Todas las páginas del concejo', 'Sin permanencia'],
  },
  {
    nombre: 'Patrocinador del diario',
    precio: '80 € al mes',
    descripcion: 'En la portada y en los cinco concejos. El sitio de más visibilidad que hay.',
    incluye: ['Portada y todas las secciones', 'Mención en el boletín de la mañana', 'Sin permanencia'],
    destacado: true,
  },
  {
    nombre: 'Boletín de la mañana',
    precio: '25 € por envío',
    descripcion: 'Una línea tuya en el correo que la gente abre desayunando. Se vende por días sueltos.',
    incluye: ['Una línea y un enlace', 'Un solo patrocinador por envío'],
  },
  {
    nombre: 'Oferta de empleo destacada',
    precio: '20 € por oferta',
    descripcion: 'Publicar una oferta es gratis. Por 20 € sale arriba, en la portada y en el boletín de la mañana.',
    incluye: ['Publicación gratuita siempre', 'Destacada 15 días', 'Sale en el boletín'],
  },
  {
    nombre: 'Anuncio destacado en el tablón',
    precio: '10 € por anuncio',
    descripcion: 'Poner un anuncio es gratis y lo será siempre. Por 10 € sale arriba del tablón y en la portada de su concejo.',
    incluye: ['Publicación gratuita siempre', 'Destacado 15 días', 'También en el boletín'],
  },
  {
    nombre: 'Esquelas y avisos',
    precio: '15 € por aviso',
    descripcion: 'Esquelas, funerales y avisos de vecinos. Publicación el mismo día.',
    incluye: ['Publicación en el día', 'Se mantiene una semana'],
  },
];

// Boletín. Al darte de alta en MailerLite, Buttondown o similar, te dan la URL del
// formulario: pégala en `accion` y el formulario de la web empieza a funcionar.
export const boletin = {
  accion: '', // 'https://assets.mailerlite.com/jsonp/000000/forms/000000/subscribe'
  campoCorreo: 'fields[email]', // el nombre que pide tu proveedor; con Buttondown es 'email'
};

// Afiliación. Alta gratuita en todos. Pega tu identificador y los bloques funcionan.
export const afiliados = {
  aviso:
    'Algunos enlaces de esta página son de afiliado: si reservas a través de ellos, La Prida se lleva una pequeña comisión y a ti no te cuesta un céntimo más.',
  programas: {
    booking: '',      // aid=……
    getyourguide: '', // partner_id=……
    civitatis: '',    // ?aid=……
    amazon: '',       // tag=……-21
  },
};

// ── Titularidad ─────────────────────────────────────────────────────────────
// QUIÉN ESTÁ DETRÁS DEL DIARIO.
//
// Comprobado en las preguntas frecuentes oficiales de la LSSI
// (lssi.digital.gob.es) el 29/09/2026. Dos cosas que conviene tener claras,
// porque la versión anterior de este comentario las decía mal:
//
// 1. EL DISPARADOR ES COBRAR, NO OFRECER. Una web es «actividad económica»
//    para su titular «cuando éste percibe ingresos directos o indirectos (por
//    publicidad, patrocinio, etc.)». Con cero ingresos la obligación del
//    artículo 10 NO ha nacido. Nace con el primer euro, por pequeño que sea.
//    Tener una página de tarifas sin cobrar aún es zona gris: lo barato es
//    rellenar esto y dejar de pensar en ello.
//
// 2. NO HAY QUE PUBLICAR LA CALLE Y EL NÚMERO. Para una web personal con
//    publicidad, lo exigido es nombre, NIF, correo y domicilio «indicando, AL
//    MENOS, la localidad y provincia de residencia». O sea: «Infiesto
//    (Asturias)» cumple. Esto es lo que frena a casi todo el mundo y resulta
//    que no hacía falta.
//
// El RGPD es otra obligación distinta y más suave: para identificar al
// responsable basta nombre y un medio de contacto. No exige NIF ni domicilio.
//
// Mientras esto esté vacío, el aviso legal lo dice en voz alta en vez de fingir
// que está completo, y la compilación avisa en la pestaña Actions. Reconocer
// una falta siempre es mejor que taparla.
//
// Para rellenarlo solo hacen falta tres datos. Escríbelos entre las comillas:
export const titular = {
  nombre: 'Emilio López Guilabert',
  nif: '51387142J',
  // Concejo y provincia. La LSSI pide el domicilio «indicando, AL MENOS, la
  // localidad y provincia», así que esto cumple y no publica la calle.
  domicilio: 'Piloña (Asturias)',
  correo: 'laprida.asturias@gmail.com',
};

// Verificación de Google Search Console (la etiqueta que te dan al dar de alta el sitio).
export const verificacion = {
  google: 'nI6U2XsCaJGj0lDsSyzoRSXmpKTRBSvEFp99qOmAyIw',
};

// ── Concejos ────────────────────────────────────────────────────────────────
export const concejos = [
  {
    slug: 'pilona',
    coords: [43.3500, -5.3700], // lat, lon (para el tiempo)
    nombre: 'Piloña',
    capital: 'Infiesto',
    gentilicio: 'piloñeses',
    ine: '33049',
    color: '#F2451B',
    colorTexto: '#C6320F',
    letra: 'P',
    emoji: '🌰',
    lema: 'Del Sella arriba, con Infiesto en medio',
    feeds: [
      'https://www.elfielato.es/rss/pilona/',
      // La Benéfica de Infiesto. Añadido el 29/09/2026: es el equipamiento
      // cultural del concejo y publica su propia agenda (cine, folclore,
      // talleres, mercáu d'arte). Piloña era el concejo con la fuente más seca
      // —El Fielato llevaba desde el 22 de septiembre sin publicar nada de
      // allí— y esto es información de primera mano, no refrito.
      'https://labenefica.org/feed/',
    ],
    web: 'https://www.ayto-pilona.es/noticias',
    claves: [
      'piloña', 'pilona', 'infiesto', 'infiestu', 'sevares', 'villamayor', 'espinaredo', 'borines',
      // salas y espacios: una pieza puede nombrar la sala y no el concejo
      'la benéfica', 'la benefica', 'la benefílmica', 'la benefilmica',
      'bocanegra', 'amc bocanegra', 'valles de san román', 'valles de san roman',
      'casa de cultura de infiesto',
    
      'coya',
      'lodeña',
      'lodena',
      'miyares',
      'anayo',
      'beloncio',
      'pintueles',
      'biedes',
      "l'infiestu",
      'valle de piloña',
      'sella',
    ],
  },
  {
    slug: 'nava',
    coords: [43.3500, -5.5000], // lat, lon (para el tiempo)
    nombre: 'Nava',
    capital: 'Nava',
    gentilicio: 'navetos',
    ine: '33040',
    color: '#F2B705',
    colorTexto: '#8A6400',
    letra: 'N',
    emoji: '🍏',
    lema: 'Pequeña, llana y con museo propio',
    feeds: ['https://www.elfielato.es/rss/nava/'],
    web: 'https://www.ayto-nava.es/noticias',
    claves: [
      'nava', 'ceceda', 'priandi', 'fuensanta',
      'museo de la sidra', 'festival de la sidra', 'casa de cultura de nava',
    
      'tresali',
      'cuenya',
      'paraes',
      'la ferrería',
      'la ferreria',
      'ordiales',
      'bimeda',
      'concejo de nava',
      'naveses',
    ],
  },
  {
    slug: 'cabranes',
    coords: [43.3800, -5.4200], // Santolaya
    nombre: 'Cabranes',
    capital: 'Santolaya',
    gentilicio: 'cabraneses',
    ine: '33009',
    color: '#00A39B',
    colorTexto: '#00807A',
    letra: 'CN',
    lema: 'El concejo que toca a los otros tres',
    feeds: ['https://www.elfielato.es/rss/cabranes/'],
    web: 'https://www.cabranes.es/',
    claves: [
      'cabranes', 'torazu', 'torazo', 'viñón', 'vinon', 'pandenes', 'gramedo',
      'santolaya de cabranes', 'santa eulalia de cabranes',
      'festival del arroz con leche', 'boroña de forna', 'borona de forna',
    
      'incós',
      'incos',
      'graciana',
      'fresnedo',
      'madiedo',
      'camás',
      'camas',
    ],
  },
  {
    slug: 'cabrales',
    coords: [43.3000, -4.8500], // lat, lon (para el tiempo)
    nombre: 'Cabrales',
    capital: 'Carreña',
    gentilicio: 'cabraliegos',
    ine: '33008',
    color: '#1B4DFF',
    colorTexto: '#1B4DFF',
    letra: 'CL',
    emoji: '⛰️',
    lema: 'Donde el mapa se pone vertical',
    feeds: [
      'https://www.elfielato.es/rss/cabrales/',
      // Sección de Cabrales de COPE Ribadesella. Comprobado el 29/09/2026:
      // canal por concejo, vivo, y trae los rescates de Picos que son el grueso
      // de lo que se publica de aquí.
      'https://coperibadesella.com/seccion/comarca/cabrales/feed/',
    ],
    web: 'https://www.cabrales.es/noticias',
    claves: [
      'cabrales', 'carreña', 'carrena', 'arenas de cabrales', 'poncebos', 'bulnes', 'sotres',
      'tielve', 'naranjo de bulnes', 'picu urriellu',
      'certamen del queso', 'casa de cultura de carreña', 'casa de cultura de carrena',
    
      'asiego',
      'berodia',
      'ortiguero',
      'inguanzo',
      'camarmeña',
      'camarmena',
      'poo de cabrales',
      'canales de cabrales',
      'puertas de cabrales',
      'cares',
      // Añadidos el 29/09/2026: aparecían en titulares reales de rescates que
      // el filtro estaba dejando fuera. Son cumbres del macizo central de los
      // Picos, en Cabrales, y sus nombres no se dan en ningún otro concejo,
      // así que no pueden provocar falsos positivos.
      'torrecerredo',
      'urriellu',
    
      'beceña','becena','la caballar','queso de cabrales','queserías de cabrales',
      'queserias de cabrales','denominación de origen cabrales','picu urriellu','naranjo de bulnes',
    ],
  },
  {
    slug: 'villaviciosa',
    coords: [43.4800, -5.4400], // lat, lon (para el tiempo)
    nombre: 'Villaviciosa',
    capital: 'Villaviciosa',
    gentilicio: 'villaviciosinos',
    ine: '33076',
    color: '#D6009A',
    colorTexto: '#B00080',
    letra: 'V',
    emoji: '🍎',
    lema: 'La ría, la manzana y el románico',
    feeds: ['https://www.elfielato.es/rss/villaviciosa/'],
    web: 'https://www.villaviciosa.es/noticias',
    claves: [
      'villaviciosa', 'maliayo', 'tazones', 'rodiles', 'amandi', 'valdediós', 'valdedios',
      'selorio', 'ría de villaviciosa',
      'teatro riera', 'festival internacional de la gaita', 'fiesta del portal',
      'concurso del portal', 'casa de cultura de villaviciosa',
    
      'argüero',
      'arguero',
      'quintueles',
      'oles',
      'careñes',
      'carenes',
      'bedriñana',
      'bedrinana',
      'grases',
      'la llera',
      'lugás',
      'lugas',
      'priesca',
      'sietes',
      'la ría de villaviciosa',
    ],
  },
];

// Fuentes regionales: se leen enteras y se filtran por las palabras clave de cada concejo.
/**
 * Otros lugares de Asturias que NO son de la línea.
 *
 * Sirven para detectar los resúmenes regionales: «del gochu gratis de Noreña al
 * cordero de Saliencia, los figos de Villaviciosa y 40 mesas indianas en Oviedo»
 * menciona Villaviciosa de pasada, así que colaba el filtro de topónimos. Si una
 * pieza nombra DOS o más sitios de fuera, es un repaso a toda Asturias y no una
 * noticia de casa.
 *
 * Están fuera a propósito los nombres que son también palabras corrientes
 * (Caso, Salas, Grado, Illas, Lena): darían falsos positivos a mansalva.
 * Amplíala cuando veas colarse un repaso regional.
 */
export const otrosLugares = [
  'oviedo', 'uviéu', 'gijón', 'xixón', 'avilés', 'siero', 'pola de siero', 'langreo',
  'mieres', 'noreña', 'llanera', 'carreño', 'candás', 'luanco', 'gozón', 'corvera',
  'castrillón', 'piedras blancas', 'laviana', 'pola de laviana', 'san martín del rey aurelio',
  'sotrondio', 'bimenes', 'sariego', 'nava de asturias', 'llanes', 'ribadesella',
  'cangas de onís', 'parres', 'arriondas', 'colunga', 'lastres', 'caravia', 'onís',
  'peñamellera alta', 'peñamellera baja', 'panes', 'ribadedeva', 'colombres', 'amieva',
  'ponga', 'sobrescobio', 'tineo', 'cangas del narcea', 'valdés', 'luarca', 'navia',
  'pravia', 'cudillero', 'muros de nalón', 'soto del barco', 'somiedo', 'saliencia',
  'teverga', 'quirós', 'proaza', 'santo adriano', 'candamo', 'las regueras', 'riosa',
  'morcín', 'ribera de arriba', 'belmonte de miranda', 'allande', 'ibias', 'degaña',
  'boal', 'coaña', 'el franco', 'tapia de casariego', 'castropol', 'vegadeo', 'taramundi',
  'villayón', 'grandas de salime', 'pesoz', 'illano', 'oscos',
];

export const fuentesRegionales = [
  { nombre: 'El Fielato', url: 'https://www.elfielato.es/rss/', tipo: 'rss' },
  { nombre: 'El Fielato · Cultura', url: 'https://www.elfielato.es/rss/cultura/', tipo: 'rss' },
  { nombre: 'El Fielato · Deportes', url: 'https://www.elfielato.es/rss/deportes/', tipo: 'rss' },
  { nombre: 'RTPA', url: 'https://www.rtpa.es/rss', tipo: 'rss' },
  { nombre: 'AsturiasMundial', url: 'https://www.asturiasmundial.com/rss', tipo: 'rss' },
  // Añadido el 29/09/2026. La Prida dependía de un solo medio para los cinco
  // concejos y ese medio llevaba días sin publicar nada de cuatro de ellos:
  // Piloña desde el 22, Cabranes desde el 19, Nava desde el 15. No fallaba la
  // ingesta, faltaban fuentes. COPE Ribadesella cubre la comarca entera a
  // diario —incluidos Piloña y Cabrales— y el filtro por topónimos ya se
  // encarga de quedarse solo con lo de casa.
  { nombre: 'COPE Ribadesella', url: 'https://coperibadesella.com/feed/', tipo: 'rss' },

  // ---- Barrido sistemático de fuentes, 29/09/2026 ----
  // Todas comprobadas una a una: canal válido, con items y con fecha reciente.
  // Ninguna se añade "porque debería funcionar".
  //
  // ENCAJE LEGAL: son canales RSS públicos. La Prida toma titular y entradilla,
  // reescribe con criterio propio, atribuye el medio y enlaza al original —
  // exactamente lo mismo que ya hace con El Fielato y AsturiasMundial. Que el
  // medio tenga muro de pago en su web no cambia nada: lo que se usa es lo que
  // el propio medio publica abierto en su canal para que se sindique.

  // La mejor del lote: 129 piezas, 35 de los cinco concejos (Cabrales sobre
  // todo, que es el que peor cubría El Fielato).
  { nombre: 'El Comercio · Oriente', url: 'https://www.elcomercio.es/rss/2.0/?section=/asturias/oriente', tipo: 'rss' },
  // Canal monográfico de un concejo entero.
  { nombre: 'El Comercio · Villaviciosa', url: 'https://www.elcomercio.es/rss/2.0/?section=/area-metropolitana-asturias/villaviciosa', tipo: 'rss' },
  // Diario y fresco, pero solo 10 piezas en el canal: si un día no se mira, se
  // pierde. Con seis ediciones al día no debería pasar.
  { nombre: 'La Nueva España · Oriente', url: 'https://www.lne.es/rss/section/3022', tipo: 'rss' },
  // Revista de cultura sidrera: Nava y Villaviciosa de lleno.
  { nombre: 'La Sidra', url: 'https://www.lasidra.net/es/feed/', tipo: 'rss' },

  // TRAMPA COMPROBADA, NO CAER EN ELLA: La Nueva España sí tiene canales por
  // concejo (lne.es/rss/section/1762407 Piloña, 1766493 Nava, 1769636 Cabranes,
  // 1724674 Cabrales, 1730973 Villaviciosa). Devuelven XML válido y parecen
  // perfectos, pero están CONGELADOS: alimentaban la serie «Asturianos» de
  // 2022-23 y su última pieza es de julio de 2022 a enero de 2023. Un canal
  // válido y muerto es peor que uno caído, porque no da error.

  // Añadidas el 10/10/2026. El canal de Nava de El Fielato no publica nada desde
  // el 15/09 (comprobado también en su web): no fallaba la ingesta, faltaban
  // fuentes. Las noticias de comarca de El Fielato no salen en su canal de Nava
  // (los montes de Nava y Villaviciosa, 25/09, se escaparon por eso). El Búscolu
  // cubre todo el Oriente: en 100 piezas de 5 días, 15 eran de los cinco concejos.
  { nombre: 'El Fielato · Comarca de la Sidra', url: 'https://www.elfielato.es/rss/comarca-de-la-sidra/', tipo: 'rss' },
  { nombre: 'El Búscolu', url: 'https://www.elbuscolu.com/feed', tipo: 'rss' },

  { nombre: 'elDiario.es Asturias', url: 'https://www.eldiario.es/rss/asturias/', tipo: 'rss' },
];

// ── Actividad cultural ──────────────────────────────────────────────────────
// Todo lo que se puede ir a ver: conciertos, teatro, ferias, mercadillos,
// almonedas, exposiciones, romerías. Cada tipo tiene sus palabras: la ingesta
// las busca en el texto para clasificar el plan y ponerle su distintivo.
//
// Para añadir un tipo nuevo basta con meterlo aquí: la web lo recoge sola.
export const tiposEvento = [
  {
    slug: 'concierto', nombre: 'Concierto', icono: '🎸',
    claves: ['concierto', 'conciertos', 'actuación musical', 'actuacion musical', 'recital',
      'gira', 'en directo', 'música en vivo', 'musica en vivo', 'bolo', 'banda de rock',
      'dj', 'festival de música', 'festival de musica', 'jam session', 'grupo musical',
      'festival', 'banda de gaites', 'bagad', 'gaita', 'tonada', 'coral', 'orquesta'],
  },
  {
    slug: 'escena', nombre: 'Teatro y danza', icono: '🎭',
    claves: ['teatro', 'obra de teatro', 'compañía', 'compania', 'monólogo', 'monologo',
      'danza', 'ballet', 'espectáculo', 'espectaculo', 'función', 'funcion', 'circo',
      'títeres', 'titeres', 'marionetas'],
  },
  {
    slug: 'cine', nombre: 'Cine', icono: '🎬',
    claves: ['cine', 'proyección', 'proyeccion', 'película', 'pelicula', 'largometraje',
      'cortometraje', 'documental', 'filmoteca', 'ciclo de cine'],
  },
  {
    slug: 'expo', nombre: 'Exposición', icono: '🖼️',
    claves: ['exposición', 'exposicion', 'muestra', 'retrospectiva', 'inaugura la muestra',
      'sala de exposiciones', 'obra expuesta', 'se puede visitar hasta'],
  },
  {
    slug: 'feria', nombre: 'Feria y certamen', icono: '🎪',
    claves: ['feria', 'certamen', 'concurso', 'muestra ganadera', 'exposición de ganado',
      'exposicion de ganado', 'subasta', 'puja', 'campeonato'],
  },
  {
    slug: 'mercado', nombre: 'Mercadillo y almoneda', icono: '🧺',
    claves: ['mercadillo', 'mercado', 'rastro', 'almoneda', 'almonedas', 'anticuarios',
      'artesanía', 'artesania', 'puestos', 'trueque', 'segunda mano', 'mercáu', 'mercau'],
  },
  {
    slug: 'fiesta', nombre: 'Fiesta y romería', icono: '🎉',
    claves: ['romería', 'romeria', 'fiestas de', 'fiesta de', 'verbena', 'foliada',
      'espicha', 'xira', 'prau', 'festejos', 'pregón', 'pregon', 'desfile', 'carroza',
      'hoguera', 'fuegos artificiales'],
  },
  {
    slug: 'gastro', nombre: 'Gastronomía', icono: '🍽️',
    claves: ['jornadas gastronómicas', 'jornadas gastronomicas', 'degustación', 'degustacion',
      'cata', 'menú especial', 'menu especial', 'concurso de tortilla', 'concurso de sidra',
      'concurso de queso', 'showcooking', 'ruta de pinchos', 'pinchos'],
  },
  {
    slug: 'letras', nombre: 'Charlas y libros', icono: '📚',
    claves: ['charla', 'conferencia', 'presentación del libro', 'presentacion del libro',
      'presenta su libro', 'tertulia', 'club de lectura', 'cuentacuentos', 'coloquio',
      'mesa redonda', 'jornada divulgativa'],
  },
  {
    slug: 'taller', nombre: 'Talleres y cursos', icono: '🛠️',
    claves: ['taller', 'talleres', 'curso', 'cursillo', 'monográfico', 'monografico',
      'obrador', 'aprender a', 'plazas limitadas', 'inscripción', 'inscripcion'],
  },
];

// ── Empleo ──────────────────────────────────────────────────────────────────
// Palabras que delatan que una pieza habla de trabajo. Sirven para mandarla a
// la sección de Trabajo aunque el redactor no se dé cuenta.
export const clavesEmpleo = [
  'oferta de empleo', 'ofertas de empleo', 'oferta de trabajo', 'bolsa de empleo',
  'se busca', 'se necesita', 'busca personal', 'contratará', 'contratara', 'contrata a',
  'puesto de trabajo', 'puestos de trabajo', 'plaza de', 'plazas de', 'convocatoria',
  'oposición', 'oposicion', 'proceso selectivo', 'bases del concurso-oposición',
  'currículum', 'curriculum', 'incorporación inmediata', 'incorporacion inmediata',
  'media jornada', 'jornada completa', 'contrato fijo', 'contrato temporal',
  'servicio público de empleo', 'sepe', 'trabayu',
];

// Dónde se publica de verdad el empleo de la comarca. Se enlazan en /trabajo/:
// no son canales que se puedan leer solos, pero son los sitios buenos.
export const enlacesEmpleo = [
  { nombre: 'Trabajastur (Servicio Público de Empleo del Principado)', url: 'https://trabajastur.asturias.es/' },
  { nombre: 'BOPA — convocatorias y oposiciones', url: 'https://sede.asturias.es/bopa' },
  { nombre: 'Ayuntamiento de Piloña', url: 'https://www.ayto-pilona.es/', concejo: 'pilona' },
  { nombre: 'Ayuntamiento de Nava', url: 'https://www.ayto-nava.es/', concejo: 'nava' },
  { nombre: 'Ayuntamiento de Cabranes', url: 'https://www.cabranes.es/', concejo: 'cabranes' },
  { nombre: 'Ayuntamiento de Cabrales', url: 'https://www.cabrales.es/', concejo: 'cabrales' },
  { nombre: 'Ayuntamiento de Villaviciosa', url: 'https://www.villaviciosa.es/', concejo: 'villaviciosa' },
];

// Agendas oficiales de la comarca. No son canales RSS, así que no se leen solas:
// salen enlazadas en /agenda/ para quien quiera mirar el programa entero.
export const enlacesAgenda = [
  { concejo: 'pilona', nombre: 'La Benéfica (Infiesto)', url: 'https://labenefica.org/' },
  { concejo: 'pilona', nombre: 'AMC Bocanegra (Valles de San Román)', url: 'https://amcppbocanegra.blogspot.com/' },
  { concejo: 'pilona', nombre: 'Ayuntamiento de Piloña', url: 'https://www.ayto-pilona.es/' },
  { concejo: 'nava', nombre: 'Museo de la Sidra de Nava', url: 'https://www.museodelasidra.com/' },
  { concejo: 'nava', nombre: 'Ayuntamiento de Nava', url: 'https://www.ayto-nava.es/' },
  { concejo: 'cabranes', nombre: 'Ayuntamiento de Cabranes', url: 'https://www.cabranes.es/' },
  { concejo: 'cabrales', nombre: 'Ayuntamiento de Cabrales', url: 'https://www.cabrales.es/' },
  { concejo: 'villaviciosa', nombre: 'Teatro Riera y cultura de Villaviciosa', url: 'https://www.culturavillaviciosa.es/agenda/' },
  { concejo: 'villaviciosa', nombre: 'Turismo de Villaviciosa', url: 'https://www.turismovillaviciosa.es/turismo/agenda-y-eventos/' },
];

// ── Secciones ───────────────────────────────────────────────────────────────
export const secciones = [
  { slug: 'actualidad', nombre: 'Actualidad', descripcion: 'Lo que ha pasado hoy en los cinco concejos.' },
  { slug: 'agenda', nombre: 'Agenda', descripcion: 'Todo lo que se puede ir a ver: conciertos, teatro, cine, ferias, mercadillos, almonedas, romerías y exposiciones, con su fecha, su hora y su sitio.' },
  { slug: 'deporte-y-cultura', nombre: 'Deporte y cultura', descripcion: 'Equipos, salas, patrimonio y tradición: lo que pasa alrededor de lo que se va a ver.' },
  { slug: 'trabajo', nombre: 'Trabajo', descripcion: 'Ofertas de empleo de los cinco concejos: quién busca gente, para qué y hasta cuándo. Publicar una oferta es gratis para los negocios de casa.' },
  { slug: 'avisos', nombre: 'Avisos y servicios', descripcion: 'Obras, cortes, guardias y lo práctico del día.' },
  { slug: 'cursos', nombre: 'Cursos', descripcion: 'Todo lo que se puede aprender por aquí: formación para el empleo, oficios, idiomas, informática, carnés y los talleres de las casas de cultura. Con el plazo para apuntarse, que es lo que se pasa.' },
  { slug: 'tablon', nombre: 'Tablón', descripcion: 'Los anuncios por palabras de la comarca: casas, coches, ganado, aperos y lo que haga falta. Publicar es gratis; los vecinos de los cinco concejos ponen y quitan.' },
];

// ── Cursos y formación ─────────────────────────────────────────────────────
//
// Lo que se puede aprender por aquí. Llega por tres vías a la vez: lo que
// detectamos en los medios y tablones que ya leemos, lo que añadimos a mano en
// content/data/cursos.json (la escuela de adultos, una academia, alguien que da
// clases) y los enlaces oficiales de abajo, que no caducan nunca.
export const categoriasCurso = [
  {
    slug: 'formacion-empleo',
    nombre: 'Formación para el empleo',
    icono: '📈',
    descripcion: 'Certificados de profesionalidad, cursos del SEPE y de Trabajastur, programas de empleo-formación.',
  },
  {
    slug: 'oficios-y-campo',
    nombre: 'Oficios y campo',
    icono: '🪵',
    descripcion: 'Poda, injerto, quesería, llagar, apicultura, madera, cantería, ganadería.',
  },
  {
    slug: 'carnes-y-certificados',
    nombre: 'Carnés y certificados',
    icono: '🪪',
    descripcion: 'Manipulador de alimentos, carné de aplicador de fitosanitarios, carretillero, socorrismo, primeros auxilios.',
  },
  {
    slug: 'idiomas',
    nombre: 'Idiomas',
    icono: '🗣️',
    descripcion: 'Inglés, francés, alemán, y español para quien llega de fuera.',
  },
  {
    slug: 'digital',
    nombre: 'Informática y digital',
    icono: '💻',
    descripcion: 'Ofimática, trámites por internet, móvil para mayores, Aula Mentor.',
  },
  {
    slug: 'cultura-y-ocio',
    nombre: 'Cultura y ocio',
    icono: '🎨',
    descripcion: 'Los talleres de las casas de cultura: cerámica, pintura, baile, teatro, cocina, música.',
  },
];

export const formacion = {
  // A dónde manda la gente un curso para que salga.
  // Es el MISMO correo que el del tablón y el del pie, a propósito: tres
  // direcciones distintas son tres buzones que vigilar y, sobre todo, tres
  // cosas que un vecino tiene que copiar bien en el móvil. Para separarlo por
  // dentro basta un filtro por asunto en el correo.
  correo: 'laprida.asturias@gmail.com',
  // Un curso sin fecha de cierre se retira a los 60 días de publicarse.
  diasPorDefecto: 60,
};

// Lo que hace que una pieza de prensa se reconozca como curso. Se puntúa igual
// que el empleo: en el titular vale 3, en el cuerpo 1, y hace falta llegar a 3.
export const clavesCurso = [
  'curso', 'cursos', 'cursillo', 'taller', 'talleres', 'obrador', 'monográfico', 'monografico',
  'formación', 'formacion', 'formativo', 'formativa', 'capacitación', 'capacitacion',
  'certificado de profesionalidad', 'aula mentor', 'escuela de adultos', 'educación de adultos',
  'educacion de adultos', 'cepa', 'epa', 'trabajastur', 'plan de formación', 'plan de formacion',
  'matrícula', 'matricula', 'matriculación', 'matriculacion', 'plazo de inscripción',
  'plazo de inscripcion', 'inscripciones abiertas', 'plazas limitadas', 'se abre el plazo',
  'carné de', 'carne de', 'manipulador de alimentos', 'fitosanitarios', 'carretillero',
  'socorrismo', 'primeros auxilios', 'escuela taller', 'taller de empleo', 'casa de oficios',
  'alfabetización digital', 'alfabetizacion digital', 'clases de', 'aprender a',
  'oferta formativa', 'universidad popular', 'extensión universitaria', 'extension universitaria',
];

// Dónde se publican los cursos, para quien quiera ir a la fuente. Comprobados
// el 23/9/2026. Las casas de cultura no tienen web propia: sus talleres se
// anuncian en la del ayuntamiento, que es la que va aquí.
export const enlacesFormacion = [
  {
    nombre: 'Trabajastur · Fórmate',
    url: 'https://trabajastur.asturias.es/formate',
    nota: 'Los cursos de formación para el empleo del Principado, para gente en paro y trabajando.',
  },
  {
    nombre: 'Trabajastur · Cursos para ocupados',
    url: 'https://trabajastur.asturias.es/cursos-de-formacion-de-ocupados',
    nota: 'Formación prioritaria para quien ya está trabajando.',
  },
  {
    nombre: 'Educastur · Educación de personas adultas',
    url: 'https://www.educastur.es/estudiantes/epa/oferta',
    nota: 'La oferta de las escuelas de adultos: graduado, acceso a ciclos, idiomas.',
  },
  {
    nombre: 'Educastur · Mapa de centros de adultos',
    url: 'https://www.educastur.es/mapa-personas-adultas/',
    nota: 'Para encontrar el centro que te pilla cerca.',
  },
  {
    nombre: 'Aula Mentor',
    url: 'https://aulamentor.es/aulas/',
    nota: 'Cursos en línea del Ministerio, con aula de apoyo en muchos ayuntamientos.',
  },
  {
    nombre: 'Juventud · Principado de Asturias',
    url: 'https://juventud.asturias.es',
    nota: 'Cursos, campos de trabajo y actividades para gente joven.',
  },
];

// ── El tablón de anuncios ───────────────────────────────────────────────────
//
// La versión sencilla, y a propósito: el vecino manda el anuncio, Emilio lo
// aprueba, y sale en la siguiente edición. Sin servidor, sin cuentas, sin
// subida de fotos y sin coste. La moderación va POR DELANTE de la publicación,
// que es lo que mantiene fuera las estafas en un sitio que vive de la confianza.
//
// Para publicar un anuncio: añádelo a content/data/anuncios.json y sube el
// fichero. Para retirarlo: bórralo de ahí, o pon "hasta" con una fecha pasada.
export const categoriasAnuncio = [
  {
    slug: 'inmuebles',
    nombre: 'Casas y fincas',
    icono: '🏠',
    descripcion: 'Venta y alquiler de casas, pisos, fincas, cuadras y terrenos.',
    // La ley española exige la etiqueta de eficiencia energética en los
    // anuncios de venta y alquiler de vivienda. Sin ella el anuncio no sale.
    exigeCertificadoEnergetico: true,
  },
  {
    slug: 'motor',
    nombre: 'Motor y maquinaria',
    icono: '🚜',
    descripcion: 'Coches, furgonetas, tractores y maquinaria agrícola.',
  },
  {
    slug: 'ganado-y-agro',
    nombre: 'Ganado y agro',
    icono: '🐄',
    descripcion: 'Reses, aperos, pienso, madera, manzana y todo lo del campo.',
  },
  {
    slug: 'varios',
    nombre: 'Varios y servicios',
    icono: '🧰',
    descripcion: 'Muebles, leña, clases, cuidados, arreglos y lo que no cabe en las otras.',
  },
];

export const tablon = {
  // A dónde manda la gente su anuncio. El mismo de siempre: ver la nota en
  // `formacion.correo` sobre por qué no hay tres direcciones distintas.
  correo: 'laprida.asturias@gmail.com',
  // Cuánto dura un anuncio si no trae fecha de caducidad.
  diasPorDefecto: 30,
  // Los anuncios de particulares no cuestan nada. Nunca.
  gratis: true,
};

// ── Tono de redacción ───────────────────────────────────────────────────────
// Esto es literalmente lo que se le pasa al modelo al reescribir. Tócalo sin miedo.
export const manualDeEstilo = `
Escribes para LA PRIDA, el diario de la mañana de Piloña, Nava, Cabranes, Cabrales y Villaviciosa (Asturias).
Quien te lee está desayunando: tiene cinco minutos, una taza en la mano y ganas de enterarse sin esfuerzo.

TONO
- Ni acartonado ni de barra de bar: el registro de alguien listo contándotelo bien, en la cocina.
- Frases cortas. Verbos concretos. Cero jerga administrativa: "el Ayuntamiento saca a concurso" mejor que
  "se procede a la licitación del expediente".
- Un guiño por pieza como mucho, y solo si sale solo. Nada de chistes forzados.
- Español de Asturias: los topónimos y las palabras de casa se dejan como son (llagar, espicha, güelu,
  prau, sidrina, esfoyaza). No traduzcas ni corrijas los nombres de lugar.
- Nunca condesciendas con el pueblo ni hagas costumbrismo de postal.

FORMA
- Titular de 8 palabras como mucho. Que se entienda solo, sin leer nada más.
- Entradilla de una frase que añada algo al titular, nunca que lo repita.
- Cuerpo de 3 a 5 párrafos cortos. El primero contesta qué ha pasado y a quién le afecta.
- Si hay fecha, hora, precio o lugar, van explícitos. Es lo que la gente busca.
- Cierra con lo útil: cuándo empieza, dónde se apunta uno, qué pasa ahora.

LÍMITES (importante)
- No inventes NADA: ni cifras, ni citas, ni nombres, ni fechas. Si el material de partida no lo dice, no existe.
- No copies frases literales de la fuente. Cuentas lo mismo con tus palabras.
- Reordenar la frase del otro NO es reescribir. Si compartes seis palabras seguidas con la
  fuente, vuelve a empezar esa frase desde la idea, no desde su redacción. Los nombres propios,
  los topónimos y los títulos oficiales sí se repiten: son los que son.
- Cuando lo único que tengas sea el titular y dos líneas de extracto, escribe DOS párrafos
  cortos y para. Estirar un extracto de dos líneas hasta cinco párrafos acaba siempre en calco
  o en invención, y las dos cosas están prohibidas.
- Si el material es demasiado escaso para tres párrafos, escribe dos. No rellenes.
- Si algo es una acusación, una denuncia o un asunto judicial, atribúyelo siempre a quien lo dice.
`.trim();

// ── Ingesta ─────────────────────────────────────────────────────────────────
// ── Qué se considera noticia hoy ───────────────────────────────────────────
//
// El archivo guarda 90 días, pero la PORTADA no es el archivo. Un diario que
// sale tres veces al día no puede abrir con algo de hace tres semanas: le está
// diciendo al lector que aquí no pasa nada.
//
// Si un día no hay material fresco, la portada sale CORTA. Es lo honesto: un
// periódico local un martes flojo es corto, y eso se entiende. Rellenar hacia
// atrás con noticias viejas, no.
export const frescura = {
  portada: 4,   // días: apertura, medianas y menores no pasan de aquí
  tira: 14,     // días: la tira de titulares admite algo más de recorrido
  despertador: 1, // días: «Las tres paradas» se esconde si es de ayer o más
};

export const ingesta = {
  maxPorConcejo: 12,
  // Días sin nada nuevo en origen tras los cuales la ingesta avisa de que la
  // fuente de un concejo se ha secado. Tres semanas: Cabranes publica del orden
  // de una pieza al mes y un umbral corto haría que el aviso saltara siempre.
  diasParaFuenteSeca: 21,       // piezas que se guardan por concejo en cada pasada
  diasDeVigencia: 90,      // en concejos pequeños hay semanas sin noticias: conviene ser generoso
  reescribir: true,        // false = solo agregador (titular + extracto + enlace)

  // Traducción automática al inglés, francés y alemán en la misma pasada.
  // Cuesta una llamada más por pieza. Sin clave de API se apaga sola y la web
  // sigue publicando las cuatro versiones, con las piezas en español y un aviso.
  traducir: true,
  // 3000 se quedó corto el 7/10/2026: la traducción de «Villar de Güergu» llegó
  // cortada y la pieza entró sin traducir. Las tres lenguas van en una sola respuesta.
  maxTokensTraduccion: 5000,

  // Las fotos que vienen en el feed son del medio que las publicó y NO son nuestras.
  // Enlazarlas desde aquí es usar su material sin permiso, así que por defecto se
  // guardan solo como referencia y la web usa una foto libre o una ilustración propia.
  // Ponlo a true únicamente para un medio que te haya dado permiso por escrito.
  usarImagenDeLaFuente: false,

  modelo: 'claude-sonnet-4-6',
  // 1200 se quedaba corto: una pieza completa (titular, entradilla, cuerpo,
  // «en veinte segundos», cifra, palabra, por qué) ronda los 900 tokens y las
  // largas pasan de 1200. La respuesta llegaba cortada, el JSON no parseaba y la
  // pieza salía SIN REESCRIBIR, con el titular del medio de origen. Se paga por
  // lo que el modelo escribe, no por el techo: subirlo no encarece nada.
  maxTokens: 3000,

  // Una pieza cuya reescritura falla NO se publica: se reintenta en la pasada
  // siguiente. A los N fallos se abandona y se avisa en rojo en Actions.
  maxIntentosReescritura: 3,

  // Dos piezas del mismo concejo con más de este parecido, publicadas con menos
  // de estas horas de diferencia, cuentan el mismo suceso: la segunda no entra.
  // Medido el 02/10/2026 sobre las 212 piezas del archivo: con 24 h no tira
  // ningún anuncio + crónica (Sella, biogás, Miércoles del Portal: todos a más
  // de 40 h), y caza Torrecerredo, Festival de la Manzana, Poreñu, Cordal…
  umbralDuplicado: 0.4,
  ventanaDuplicadoHoras: 24,
};
