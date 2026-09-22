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
    'El diario de la mañana de Piloña, Nava, Cabrales y Villaviciosa. Lo que pasa en casa, contado corto y con gracia, para leer con el café.',
  // La dirección del sitio. NO hace falta tocarla: al publicar desde GitHub, el
  // propio flujo la rellena con https://tu-usuario.github.io. Solo se cambia a
  // mano el día que haya dominio propio (sin barra final).
  url: process.env.SITIO_URL || 'https://laprida.example',
  idioma: 'es-ES',
  autor: 'Redacción de La Prida',
  email: 'hola@laprida.example',
  zonaHoraria: 'Europe/Madrid',
  // Las tres ediciones del día, hora de Asturias. El sello de portada dice
  // cuál de ellas estás leyendo, y el flujo de GitHub las dispara a esas horas.
  // Si añades o quitas una, cámbiala también en .github/workflows/publicar.yml.
  ediciones: ['07:00', '14:00', '20:00'],
};

// ── Monetización ────────────────────────────────────────────────────────────
// Todo lo de ganar dinero vive aquí. Nada de esto cuesta nada de entrada.
export const anuncios = {
  // AdSense: pon tu ca-pub-… en `cliente`, los IDs de bloque en `slots`, y activo: true.
  // Mientras esté apagado los huecos se ven como recuadros discretos, que sirven de
  // muestra para enseñárselos a un anunciante.
  activo: false,
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
    descripcion: 'En la portada y en los cuatro concejos. El sitio de más visibilidad que hay.',
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

// Verificación de Google Search Console (la etiqueta que te dan al dar de alta el sitio).
export const verificacion = {
  google: '',
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
    feeds: ['https://www.elfielato.es/rss/pilona/'],
    web: 'https://www.ayto-pilona.es/noticias',
    claves: [
      'piloña', 'pilona', 'infiesto', 'infiestu', 'sevares', 'villamayor', 'espinaredo', 'borines',
      // salas y espacios: una pieza puede nombrar la sala y no el concejo
      'la benéfica', 'la benefica', 'la benefílmica', 'la benefilmica',
      'bocanegra', 'amc bocanegra', 'valles de san román', 'valles de san roman',
      'casa de cultura de infiesto',
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
    letra: 'C',
    emoji: '⛰️',
    lema: 'Donde el mapa se pone vertical',
    feeds: ['https://www.elfielato.es/rss/cabrales/'],
    web: 'https://www.cabrales.es/noticias',
    claves: [
      'cabrales', 'carreña', 'carrena', 'arenas de cabrales', 'poncebos', 'bulnes', 'sotres',
      'tielve', 'naranjo de bulnes', 'picu urriellu',
      'certamen del queso', 'casa de cultura de carreña', 'casa de cultura de carrena',
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
    ],
  },
];

// Fuentes regionales: se leen enteras y se filtran por las palabras clave de cada concejo.
export const fuentesRegionales = [
  { nombre: 'El Fielato', url: 'https://www.elfielato.es/rss/', tipo: 'rss' },
  { nombre: 'El Fielato · Cultura', url: 'https://www.elfielato.es/rss/cultura/', tipo: 'rss' },
  { nombre: 'El Fielato · Deportes', url: 'https://www.elfielato.es/rss/deportes/', tipo: 'rss' },
  { nombre: 'RTPA', url: 'http://www.rtpa.es/rss', tipo: 'rss' },
  { nombre: 'AsturiasMundial', url: 'https://www.asturiasmundial.com/rss', tipo: 'rss' },
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
  { concejo: 'cabrales', nombre: 'Ayuntamiento de Cabrales', url: 'https://www.cabrales.es/' },
  { concejo: 'villaviciosa', nombre: 'Teatro Riera y cultura de Villaviciosa', url: 'https://www.culturavillaviciosa.es/agenda/' },
  { concejo: 'villaviciosa', nombre: 'Turismo de Villaviciosa', url: 'https://www.turismovillaviciosa.es/turismo/agenda-y-eventos/' },
];

// ── Secciones ───────────────────────────────────────────────────────────────
export const secciones = [
  { slug: 'actualidad', nombre: 'Actualidad', descripcion: 'Lo que ha pasado hoy en los cuatro concejos.' },
  { slug: 'agenda', nombre: 'Agenda', descripcion: 'Todo lo que se puede ir a ver: conciertos, teatro, cine, ferias, mercadillos, almonedas, romerías y exposiciones, con su fecha, su hora y su sitio.' },
  { slug: 'deporte-y-cultura', nombre: 'Deporte y cultura', descripcion: 'Equipos, salas, patrimonio y tradición: lo que pasa alrededor de lo que se va a ver.' },
  { slug: 'trabajo', nombre: 'Trabajo', descripcion: 'Ofertas de empleo de los cuatro concejos: quién busca gente, para qué y hasta cuándo. Publicar una oferta es gratis para los negocios de casa.' },
  { slug: 'avisos', nombre: 'Avisos y servicios', descripcion: 'Obras, cortes, guardias y lo práctico del día.' },
];

// ── Tono de redacción ───────────────────────────────────────────────────────
// Esto es literalmente lo que se le pasa al modelo al reescribir. Tócalo sin miedo.
export const manualDeEstilo = `
Escribes para LA PRIDA, el diario de la mañana de Piloña, Nava, Cabrales y Villaviciosa (Asturias).
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
export const ingesta = {
  maxPorConcejo: 12,       // piezas que se guardan por concejo en cada pasada
  diasDeVigencia: 90,      // en concejos pequeños hay semanas sin noticias: conviene ser generoso
  reescribir: true,        // false = solo agregador (titular + extracto + enlace)

  // Traducción automática al inglés, francés y alemán en la misma pasada.
  // Cuesta una llamada más por pieza. Sin clave de API se apaga sola y la web
  // sigue publicando las cuatro versiones, con las piezas en español y un aviso.
  traducir: true,
  maxTokensTraduccion: 3000,

  // Las fotos que vienen en el feed son del medio que las publicó y NO son nuestras.
  // Enlazarlas desde aquí es usar su material sin permiso, así que por defecto se
  // guardan solo como referencia y la web usa una foto libre o una ilustración propia.
  // Ponlo a true únicamente para un medio que te haya dado permiso por escrito.
  usarImagenDeLaFuente: false,

  modelo: 'claude-sonnet-4-6',
  maxTokens: 1200,
};
