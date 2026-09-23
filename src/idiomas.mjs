// La Prida en cuatro idiomas.
//
// El español vive en la raíz (/) y los demás cuelgan de su prefijo (/en/, /fr/,
// /de/). Los slugs de los concejos y de las piezas NO se traducen: son nombres
// propios y así la correspondencia entre versiones es exacta, que es lo que
// necesita hreflang. Los de las secciones sí, porque ahí sí busca la gente.
//
// Para añadir un idioma: métele una entrada a `idiomas`, otra a `textos` y otra
// a `slugsSeccion`. El generador recorre la lista sola, no hay nada más que tocar.

export const idiomas = [
  { codigo: 'es', etiqueta: 'ES', nombre: 'Español', htmlLang: 'es-ES', prefijo: '' },
  { codigo: 'en', etiqueta: 'EN', nombre: 'English', htmlLang: 'en-GB', prefijo: '/en' },
  { codigo: 'fr', etiqueta: 'FR', nombre: 'Français', htmlLang: 'fr-FR', prefijo: '/fr' },
  { codigo: 'de', etiqueta: 'DE', nombre: 'Deutsch', htmlLang: 'de-DE', prefijo: '/de' },
];

export const IDIOMA_BASE = 'es';
export const codigos = idiomas.map((i) => i.codigo);
export const idiomaDe = (codigo) => idiomas.find((i) => i.codigo === codigo) ?? idiomas[0];

/** Slug de sección por idioma. Si falta, se usa el español. */
export const slugsSeccion = {
  actualidad: { en: 'news', fr: 'actualites', de: 'aktuelles' },
  agenda: { en: 'whats-on', fr: 'agenda', de: 'termine' },
  'deporte-y-cultura': { en: 'sport-and-culture', fr: 'sport-et-culture', de: 'sport-und-kultur' },
  trabajo: { en: 'jobs', fr: 'emploi', de: 'stellen' },
  avisos: { en: 'notices', fr: 'infos-pratiques', de: 'hinweise' },
  tablon: { en: 'noticeboard', fr: 'petites-annonces', de: 'schwarzes-brett' },
};

/** Slug de las páginas fijas por idioma. */
export const slugsPagina = {
  'quienes-somos': { en: 'about', fr: 'a-propos', de: 'ueber-uns' },
  'aviso-legal': { en: 'legal', fr: 'mentions-legales', de: 'impressum' },
  accesibilidad: { en: 'accessibility', fr: 'accessibilite', de: 'barrierefreiheit' },
  anunciate: { en: 'advertise', fr: 'annoncer', de: 'werben' },
};

export function slugSeccion(slug, idioma) {
  if (idioma === IDIOMA_BASE) return slug;
  return slugsSeccion[slug]?.[idioma] ?? slugsPagina[slug]?.[idioma] ?? slug;
}

/** Construye una ruta absoluta en el idioma pedido. `camino` siempre en español. */
export function ruta(idioma, camino = '/') {
  const pre = idiomaDe(idioma).prefijo;
  if (camino === '/') return pre === '' ? '/' : `${pre}/`;
  // los ficheros sueltos (404.html, feed.xml) no llevan barra final
  if (/\.[a-z0-9]+$/i.test(camino)) return `${pre}${camino.startsWith('/') ? '' : '/'}${camino}`;
  const partes = camino.replace(/^\/|\/$/g, '').split('/');
  // el primer tramo puede ser una sección traducible; los demás son nombres propios
  partes[0] = slugSeccion(partes[0], idioma);
  return `${pre}/${partes.join('/')}/`;
}

// ── Textos de la interfaz ───────────────────────────────────────────────────
// Traducidos a mano, no a máquina. Si añades una clave, ponla en los cuatro.
/**
 * El nombre de cada tipo de plan, en los cuatro idiomas. El icono no basta:
 * un emoji no lo lee un lector de pantalla ni lo entiende todo el mundo igual,
 * así que el sello siempre lleva el nombre escrito, y escrito en su idioma.
 */
export const nombresTipo = {
  concierto: { en: 'Live music', fr: 'Concert', de: 'Konzert' },
  escena: { en: 'Theatre and dance', fr: 'Théâtre et danse', de: 'Theater und Tanz' },
  cine: { en: 'Cinema', fr: 'Cinéma', de: 'Kino' },
  expo: { en: 'Exhibition', fr: 'Exposition', de: 'Ausstellung' },
  feria: { en: 'Fair and contest', fr: 'Foire et concours', de: 'Messe und Wettbewerb' },
  mercado: { en: 'Market and brocante', fr: 'Marché et brocante', de: 'Markt und Trödel' },
  fiesta: { en: 'Village festival', fr: 'Fête et pèlerinage', de: 'Dorffest und Wallfahrt' },
  gastro: { en: 'Food and drink', fr: 'Gastronomie', de: 'Essen und Trinken' },
  letras: { en: 'Talks and books', fr: 'Rencontres et livres', de: 'Vorträge und Bücher' },
  taller: { en: 'Workshops and courses', fr: 'Ateliers et cours', de: 'Workshops und Kurse' },
};

/** El nombre del tipo en el idioma pedido, con el español de reserva. */
export function nombreTipoEn(slug, nombreEs, idioma = IDIOMA_BASE) {
  if (idioma === IDIOMA_BASE) return nombreEs;
  return nombresTipo[slug]?.[idioma] ?? nombreEs;
}

export const textos = {
  es: {
    elTablon: 'El tablón',
    filtrarTablon: 'Filtrar el tablón',
    precio: 'Precio',
    quienAnuncia: 'Quién anuncia',
    particular: 'Particular',
    profesional: 'Profesional',
    certificadoEnergetico: 'Certificado energético',
    contactar: 'Contactar con quien anuncia →',
    anuncioCaducado: 'Anuncio caducado',
    vendesAlgo: '¿Vendes algo?',
    comoPublicar: 'Poner un anuncio aquí es gratis para cualquier vecino de los cinco concejos. Mándanos qué vendes, dónde está y un precio, y sale a la mañana siguiente.',
    escribirA: 'Escribir a',
    antesDeCerrarTrato: 'Antes de cerrar un trato',
    avisoTablon: 'La Prida publica los anuncios, pero no los verifica ni interviene en la venta: no somos parte del trato ni cobramos comisión. Comprueba lo que compras y a quién se lo compras, desconfía de quien te meta prisa o te pida dinero por adelantado, y no pagues nada sin ver la cosa. Si un anuncio te parece falso, avísanos y lo retiramos.',
    sinAnuncios: 'Hoy no hay anuncios en el tablón. Manda el tuyo y sé el primero.',
    lema: 'Diario de la mañana · cinco concejos, una línea',
    edicion: 'Edición de las',
    saltar: 'Ir al contenido',
    modoNoche: 'Modo noche',
    modoDia: 'Modo día',
    idioma: 'Idioma',
    portada: 'Portada',
    quienesSomos: 'Quiénes somos',
    anunciate: 'Anúnciate',
    avisoLegal: 'Aviso legal y privacidad',
    accesibilidad: 'Accesibilidad',
    rss: 'Canal RSS',
    concejosPie: 'Concejos',
    laLinea: 'La línea',
    tresParadas: 'Las tres paradas',
    tresParadasPie: 'Lo que no te puedes perder hoy',
    sigueLinea: 'Sigue la línea',
    laAgenda: 'La agenda',
    verAgenda: 'Ver la agenda entera →',
    avisos: 'Avisos',
    planoTitulo: 'Dónde cae cada uno',
    planoNota: 'Esquema, no escala · el mar arriba',
    planoAlt:
      'Esquema de la posición relativa de los cinco concejos, de oeste a este: Nava, Villaviciosa, Cabranes, Piloña y Cabrales, con el mar Cantábrico al norte.',
    pieza: 'pieza',
    piezas: 'piezas',
    parada: 'Parada',
    volverParada: 'Volver a la parada',
    capitalEs: 'La capital es',
    hoyHace: 'y hoy hace',
    deDondeSale: 'De dónde sale esto',
    deDondeSaleTexto:
      'Leemos cada mañana los medios de la comarca y el tablón del ayuntamiento, y lo contamos con nuestras palabras citando siempre el origen.',
    ayuntamientoDe: 'Ayuntamiento de',
    en20: 'En 20 segundos',
    laCifra: 'La cifra',
    laPalabra: 'Palabra de aquí',
    porQueImporta: 'Por qué importa',
    seDice: 'se dice',
    apunteFirma: 'Visto dende la collada',
    fuenteTitulo: 'De dónde viene esto.',
    fuenteTexto: 'Redactado en La Prida a partir de la información publicada por',
    fuenteError: 'Si detectas un error, escríbenos a',
    boletinTitulo: 'A las siete, en tu correo',
    boletinTexto: 'Las tres paradas del día y poco más. Un correo, cinco minutos de lectura, y a lo tuyo.',
    boletinBoton: 'Quiero recibirlo',
    boletinCorreo: 'Tu correo',
    boletinNota: 'Formulario en pruebas: todavía no recoge correos.',
    publicidad: 'Publicidad',
    espacioLibre: 'Espacio disponible',
    sitioLibre: 'Este sitio está libre',
    sitioLibreTexto: 'Aquí puede ir tu negocio, delante de la gente de los cinco concejos, cada mañana.',
    sitioLibreEnlace: 'Ver cómo anunciarse →',
    conApoyo: 'Con el apoyo de',
    patrocinado: 'Patrocinado',
    cookiesTexto:
      'Usamos cookies propias y de terceros para medir visitas y mostrar publicidad. Puedes leer los detalles en el',
    cookiesLegal: 'aviso legal',
    cookiesSolo: 'Solo lo necesario',
    cookiesSi: 'Aceptar',
    loQueViene: 'Lo que viene',
    loQueSeHizo: 'Lo que se ha hecho',
    ultimasSemanas: 'últimas semanas',
    plan: 'plan',
    planes: 'planes',
    agendaVacia:
      'Ahora mismo no hay nada anunciado con fecha. En cuanto los ayuntamientos y las salas publiquen el programa, aparece aquí solo.',
    filtroTodo: 'Todo',
    filtrarPor: 'Filtrar la cartelera',
    programaEntero: 'El programa entero',
    programaEnteroTexto:
      'Aquí sale lo que se publica. Para el programa completo de cada sitio, mejor la fuente:',
    cuando: 'Cuándo',
    donde: 'Dónde',
    cuanto: 'Cuánto',
    aLas: 'a las',
    yaPaso: 'Esto ya pasó. Se queda aquí como memoria de lo que se hace por aquí.',
    datosDelPlan: 'Datos del plan',
    ofertasDeAqui: 'Ofertas de aquí',
    empleoPrensa: 'Empleo en la prensa de la comarca',
    empleoVacio:
      'Todavía no hay ninguna oferta publicada. Si buscas gente para tu negocio, publicarla aquí no cuesta nada.',
    buscasAlguien: '¿Buscas a alguien?',
    buscasAlguienTexto:
      'Publicar una oferta aquí es <strong>gratis</strong> para cualquier negocio de los cinco concejos. Mándanos el puesto, la jornada y cómo apuntarse, y sale a la mañana siguiente.',
    escribirA: 'Escribir a',
    dondeMirarAdemas: 'Dónde mirar además',
    dondeMirarTexto: 'Aquí sale lo que llega. Lo oficial y lo grande está en estos sitios:',
    quien: 'Quién',
    jornada: 'Jornada',
    contrato: 'Contrato',
    hasta: 'Hasta',
    comoApuntarse: 'Cómo apuntarse →',
    destacada: 'Destacada',
    ejemplo: 'Ejemplo',
    plazoCerrado: 'Plazo cerrado',
    nadaPorAqui: 'Nada por aquí de momento.',
    sinTraducir: 'El texto completo de esta pieza está de momento solo en español.',
    leerEnEspanol: 'Leerla en español →',
    traduccionAuto: 'Traducción automática, revisada por el sistema. El original es el español.',
    ilustracionDe: 'Ilustración de La Prida.',
    imagenDe: 'Imagen de',
    foto: 'Foto',
    hechoEn: 'Fuentes: medios locales, ayuntamientos, BOPA y Open-Meteo',
    correcciones:
      'Las piezas se redactan a partir de fuentes públicas y de medios locales, siempre citados y enlazados. Si algo está mal, se corrige:',
    noHayNada: 'Todavía no hay nada.',
    finDelCamino: 'Aquí se acaba el camino',
  },

  en: {
    elTablon: 'The noticeboard',
    filtrarTablon: 'Filter the noticeboard',
    precio: 'Price',
    quienAnuncia: 'Advertiser',
    particular: 'Private seller',
    profesional: 'Business',
    certificadoEnergetico: 'Energy rating',
    contactar: 'Contact the advertiser →',
    anuncioCaducado: 'Expired listing',
    vendesAlgo: 'Got something to sell?',
    comoPublicar: 'Placing an ad here is free for anyone in the five councils. Send us what you are selling, where it is and a price, and it goes up the next morning.',
    escribirA: 'Write to',
    antesDeCerrarTrato: 'Before you close a deal',
    avisoTablon: 'La Prida publishes these listings but does not verify them and takes no part in the sale: we are not a party to the deal and we take no commission. Check what you are buying and who from, be wary of anyone rushing you or asking for money up front, and pay nothing before seeing the goods. If a listing looks fake, tell us and we will take it down.',
    sinAnuncios: 'No listings today. Send yours and be the first.',
    lema: 'Morning paper · five councils, one line',
    edicion: 'Edition of',
    saltar: 'Skip to content',
    modoNoche: 'Night mode',
    modoDia: 'Day mode',
    idioma: 'Language',
    portada: 'Front page',
    quienesSomos: 'About us',
    anunciate: 'Advertise',
    avisoLegal: 'Legal notice and privacy',
    accesibilidad: 'Accessibility',
    rss: 'RSS feed',
    concejosPie: 'Councils',
    laLinea: 'The line',
    tresParadas: 'Three stops',
    tresParadasPie: 'What you should not miss today',
    sigueLinea: 'Follow the line',
    laAgenda: "What's on",
    verAgenda: "See everything that's on →",
    avisos: 'Notices',
    planoTitulo: 'Where each one is',
    planoNota: 'Diagram, not to scale · the sea is at the top',
    planoAlt:
      'Diagram of the relative positions of the five councils, west to east: Nava, Villaviciosa, Cabranes, Piloña and Cabrales, with the Cantabrian Sea to the north.',
    pieza: 'story',
    piezas: 'stories',
    parada: 'Stop',
    volverParada: 'Back to stop',
    capitalEs: 'The main town is',
    hoyHace: 'and today it is',
    deDondeSale: 'Where this comes from',
    deDondeSaleTexto:
      'Every morning we read the local press and the council noticeboards, and we retell it in our own words, always citing the source.',
    ayuntamientoDe: 'Council of',
    en20: 'In 20 seconds',
    laCifra: 'The number',
    laPalabra: 'A word from here',
    porQueImporta: 'Why it matters',
    seDice: 'pronounced',
    apunteFirma: 'Seen from the pass',
    fuenteTitulo: 'Where this comes from.',
    fuenteTexto: 'Written at La Prida from information published by',
    fuenteError: 'Spotted a mistake? Write to us at',
    boletinTitulo: 'In your inbox at seven',
    boletinTexto: "The day's three stops and little else. One email, five minutes, and on with your day.",
    boletinBoton: 'Sign me up',
    boletinCorreo: 'Your email',
    boletinNota: 'Form still being tested: it does not collect addresses yet.',
    publicidad: 'Advertisement',
    espacioLibre: 'Space available',
    sitioLibre: 'This spot is free',
    sitioLibreTexto: 'Your business could be here, in front of the five councils, every morning.',
    sitioLibreEnlace: 'See how to advertise →',
    conApoyo: 'Supported by',
    patrocinado: 'Sponsored',
    cookiesTexto:
      'We use our own and third-party cookies to measure visits and show advertising. The details are in the',
    cookiesLegal: 'legal notice',
    cookiesSolo: 'Essential only',
    cookiesSi: 'Accept',
    loQueViene: 'Coming up',
    loQueSeHizo: 'What has been on',
    ultimasSemanas: 'recent weeks',
    plan: 'event',
    planes: 'events',
    agendaVacia:
      'Nothing is scheduled with a date right now. As soon as the councils and the venues publish their programmes, it will appear here on its own.',
    filtroTodo: 'All',
    filtrarPor: "Filter what's on",
    programaEntero: 'The full programme',
    programaEnteroTexto: 'What gets published shows up here. For each venue’s full programme, go to the source:',
    cuando: 'When',
    donde: 'Where',
    cuanto: 'How much',
    aLas: 'at',
    yaPaso: 'This has already happened. It stays here as a record of what goes on around here.',
    datosDelPlan: 'Event details',
    ofertasDeAqui: 'Jobs from here',
    empleoPrensa: 'Employment in the local press',
    empleoVacio:
      'No vacancies posted yet. If you are looking for someone for your business, posting here costs nothing.',
    buscasAlguien: 'Looking for someone?',
    buscasAlguienTexto:
      'Posting a vacancy here is <strong>free</strong> for any business in the five councils. Send us the job, the hours and how to apply, and it goes up the next morning.',
    escribirA: 'Write to',
    dondeMirarAdemas: 'Where else to look',
    dondeMirarTexto: 'What reaches us shows up here. The official and the large-scale is on these sites:',
    quien: 'Who',
    jornada: 'Hours',
    contrato: 'Contract',
    hasta: 'Until',
    comoApuntarse: 'How to apply →',
    destacada: 'Featured',
    ejemplo: 'Example',
    plazoCerrado: 'Closed',
    nadaPorAqui: 'Nothing here for now.',
    sinTraducir: 'The full text of this story is only in Spanish for now.',
    leerEnEspanol: 'Read it in Spanish →',
    traduccionAuto: 'Machine translation, checked by the system. The Spanish version is the original.',
    ilustracionDe: 'Illustration by La Prida.',
    imagenDe: 'Image from',
    foto: 'Photo',
    hechoEn: 'Sources: local media, councils, the regional gazette and Open-Meteo',
    correcciones:
      'Stories are written from public sources and local media, always cited and linked. If something is wrong, we fix it:',
    noHayNada: 'Nothing here yet.',
    finDelCamino: 'The path ends here',
  },

  fr: {
    elTablon: 'Les petites annonces',
    filtrarTablon: 'Filtrer les annonces',
    precio: 'Prix',
    quienAnuncia: 'Annonceur',
    particular: 'Particulier',
    profesional: 'Professionnel',
    certificadoEnergetico: 'Diagnostic énergétique',
    contactar: 'Contacter l\'annonceur →',
    anuncioCaducado: 'Annonce expirée',
    vendesAlgo: 'Quelque chose à vendre ?',
    comoPublicar: 'Publier une annonce est gratuit pour tout habitant des cinq communes. Envoyez-nous ce que vous vendez, où cela se trouve et un prix, et elle paraît le lendemain matin.',
    escribirA: 'Écrire à',
    antesDeCerrarTrato: 'Avant de conclure',
    avisoTablon: 'La Prida publie les annonces mais ne les vérifie pas et n\'intervient pas dans la vente : nous ne sommes pas partie au contrat et ne prenons aucune commission. Vérifiez ce que vous achetez et à qui, méfiez-vous de qui vous presse ou demande de l\'argent d\'avance, et ne payez rien sans avoir vu la chose. Si une annonce vous paraît fausse, signalez-la et nous la retirerons.',
    sinAnuncios: 'Aucune annonce aujourd\'hui. Envoyez la vôtre et soyez le premier.',
    lema: 'Le quotidien du matin · cinq communes, une ligne',
    edicion: 'Édition de',
    saltar: 'Aller au contenu',
    modoNoche: 'Mode nuit',
    modoDia: 'Mode jour',
    idioma: 'Langue',
    portada: 'À la une',
    quienesSomos: 'Qui sommes-nous',
    anunciate: 'Annoncer',
    avisoLegal: 'Mentions légales et confidentialité',
    accesibilidad: 'Accessibilité',
    rss: 'Flux RSS',
    concejosPie: 'Communes',
    laLinea: 'La ligne',
    tresParadas: 'Les trois arrêts',
    tresParadasPie: 'À ne pas manquer aujourd’hui',
    sigueLinea: 'Suivre la ligne',
    laAgenda: 'L’agenda',
    verAgenda: 'Voir tout l’agenda →',
    avisos: 'Infos pratiques',
    planoTitulo: 'Où se trouve chacune',
    planoNota: 'Schéma, pas à l’échelle · la mer en haut',
    planoAlt:
      'Schéma de la position relative des cinq communes, d’ouest en est : Nava, Villaviciosa, Cabranes, Piloña et Cabrales, avec la mer Cantabrique au nord.',
    pieza: 'article',
    piezas: 'articles',
    parada: 'Arrêt',
    volverParada: 'Retour à l’arrêt',
    capitalEs: 'Le chef-lieu est',
    hoyHace: 'et il fait aujourd’hui',
    deDondeSale: 'D’où vient tout ça',
    deDondeSaleTexto:
      'Chaque matin nous lisons la presse locale et les panneaux d’affichage des mairies, et nous le racontons avec nos mots, en citant toujours la source.',
    ayuntamientoDe: 'Mairie de',
    en20: 'En 20 secondes',
    laCifra: 'Le chiffre',
    laPalabra: 'Un mot d’ici',
    porQueImporta: 'Pourquoi c’est important',
    seDice: 'se prononce',
    apunteFirma: 'Vu depuis le col',
    fuenteTitulo: 'D’où vient cet article.',
    fuenteTexto: 'Rédigé à La Prida à partir des informations publiées par',
    fuenteError: 'Une erreur ? Écrivez-nous à',
    boletinTitulo: 'À sept heures, dans votre boîte',
    boletinTexto: 'Les trois arrêts du jour et rien de plus. Un courriel, cinq minutes, et bonne journée.',
    boletinBoton: 'Je m’abonne',
    boletinCorreo: 'Votre courriel',
    boletinNota: 'Formulaire en test : il ne collecte pas encore d’adresses.',
    publicidad: 'Publicité',
    espacioLibre: 'Espace disponible',
    sitioLibre: 'Cette place est libre',
    sitioLibreTexto: 'Votre commerce peut être ici, devant les cinq communes, chaque matin.',
    sitioLibreEnlace: 'Voir comment annoncer →',
    conApoyo: 'Avec le soutien de',
    patrocinado: 'Sponsorisé',
    cookiesTexto:
      'Nous utilisons des cookies propres et tiers pour mesurer les visites et afficher de la publicité. Les détails sont dans les',
    cookiesLegal: 'mentions légales',
    cookiesSolo: 'Strict nécessaire',
    cookiesSi: 'Accepter',
    loQueViene: 'À venir',
    loQueSeHizo: 'Ce qui s’est passé',
    ultimasSemanas: 'dernières semaines',
    plan: 'événement',
    planes: 'événements',
    agendaVacia:
      'Rien n’est annoncé avec une date pour l’instant. Dès que les mairies et les salles publieront leur programme, cela apparaîtra ici tout seul.',
    filtroTodo: 'Tout',
    filtrarPor: 'Filtrer l’agenda',
    programaEntero: 'Le programme complet',
    programaEnteroTexto:
      'Ici figure ce qui est publié. Pour le programme complet de chaque lieu, mieux vaut aller à la source :',
    cuando: 'Quand',
    donde: 'Où',
    cuanto: 'Combien',
    aLas: 'à',
    yaPaso: 'C’est déjà passé. Cela reste ici comme mémoire de ce qui se fait dans le coin.',
    datosDelPlan: 'Détails de l’événement',
    ofertasDeAqui: 'Offres d’ici',
    empleoPrensa: 'L’emploi dans la presse locale',
    empleoVacio:
      'Aucune offre publiée pour le moment. Si vous cherchez quelqu’un pour votre commerce, la publier ici ne coûte rien.',
    buscasAlguien: 'Vous cherchez quelqu’un ?',
    buscasAlguienTexto:
      'Publier une offre ici est <strong>gratuit</strong> pour tout commerce des cinq communes. Envoyez-nous le poste, les horaires et comment postuler, et elle paraît le lendemain matin.',
    escribirA: 'Écrire à',
    dondeMirarAdemas: 'Où chercher aussi',
    dondeMirarTexto: 'Ici paraît ce qui nous arrive. L’officiel et le grand se trouve sur ces sites :',
    quien: 'Qui',
    jornada: 'Horaires',
    contrato: 'Contrat',
    hasta: 'Jusqu’au',
    comoApuntarse: 'Comment postuler →',
    destacada: 'À la une',
    ejemplo: 'Exemple',
    plazoCerrado: 'Délai clos',
    nadaPorAqui: 'Rien par ici pour l’instant.',
    sinTraducir: 'Le texte complet de cet article n’existe pour l’instant qu’en espagnol.',
    leerEnEspanol: 'Le lire en espagnol →',
    traduccionAuto: 'Traduction automatique, vérifiée par le système. L’original est en espagnol.',
    ilustracionDe: 'Illustration de La Prida.',
    imagenDe: 'Image de',
    foto: 'Photo',
    hechoEn: 'Sources : médias locaux, mairies, journal officiel des Asturies et Open-Meteo',
    correcciones:
      'Les articles sont rédigés à partir de sources publiques et de médias locaux, toujours cités et liés. Si quelque chose est faux, on le corrige :',
    noHayNada: 'Il n’y a encore rien.',
    finDelCamino: 'Ici s’arrête le chemin',
  },

  de: {
    elTablon: 'Das schwarze Brett',
    filtrarTablon: 'Anzeigen filtern',
    precio: 'Preis',
    quienAnuncia: 'Anbieter',
    particular: 'Privat',
    profesional: 'Gewerblich',
    certificadoEnergetico: 'Energieausweis',
    contactar: 'Anbieter kontaktieren →',
    anuncioCaducado: 'Abgelaufene Anzeige',
    vendesAlgo: 'Etwas zu verkaufen?',
    comoPublicar: 'Eine Anzeige aufzugeben ist für alle aus den fünf Gemeinden kostenlos. Schicken Sie uns, was Sie verkaufen, wo es steht und einen Preis — am nächsten Morgen steht es hier.',
    escribirA: 'Schreiben an',
    antesDeCerrarTrato: 'Bevor Sie zuschlagen',
    avisoTablon: 'La Prida veröffentlicht die Anzeigen, prüft sie aber nicht und ist am Geschäft nicht beteiligt: Wir sind nicht Vertragspartei und nehmen keine Provision. Prüfen Sie, was Sie kaufen und von wem, misstrauen Sie jedem, der Sie drängt oder Vorkasse verlangt, und zahlen Sie nichts, bevor Sie die Sache gesehen haben. Wirkt eine Anzeige falsch, sagen Sie uns Bescheid — wir nehmen sie herunter.',
    sinAnuncios: 'Heute keine Anzeigen. Schicken Sie Ihre und seien Sie die Erste.',
    lema: 'Die Morgenzeitung · fünf Gemeinden, eine Linie',
    edicion: 'Ausgabe von',
    saltar: 'Zum Inhalt springen',
    modoNoche: 'Nachtmodus',
    modoDia: 'Tagmodus',
    idioma: 'Sprache',
    portada: 'Titelseite',
    quienesSomos: 'Über uns',
    anunciate: 'Werben',
    avisoLegal: 'Impressum und Datenschutz',
    accesibilidad: 'Barrierefreiheit',
    rss: 'RSS-Feed',
    concejosPie: 'Gemeinden',
    laLinea: 'Die Linie',
    tresParadas: 'Die drei Haltestellen',
    tresParadasPie: 'Was Sie heute nicht verpassen sollten',
    sigueLinea: 'Der Linie folgen',
    laAgenda: 'Was ansteht',
    verAgenda: 'Den ganzen Kalender ansehen →',
    avisos: 'Hinweise',
    planoTitulo: 'Wo welche liegt',
    planoNota: 'Schema, nicht maßstabsgetreu · das Meer oben',
    planoAlt:
      'Schema der Lage der fünf Gemeinden von West nach Ost: Nava, Villaviciosa, Cabranes, Piloña und Cabrales, mit dem Kantabrischen Meer im Norden.',
    pieza: 'Beitrag',
    piezas: 'Beiträge',
    parada: 'Haltestelle',
    volverParada: 'Zurück zur Haltestelle',
    capitalEs: 'Hauptort ist',
    hoyHace: 'und heute sind es',
    deDondeSale: 'Woher das kommt',
    deDondeSaleTexto:
      'Jeden Morgen lesen wir die Presse der Gegend und die Aushänge der Rathäuser und erzählen es mit eigenen Worten, immer mit Quellenangabe.',
    ayuntamientoDe: 'Rathaus von',
    en20: 'In 20 Sekunden',
    laCifra: 'Die Zahl',
    laPalabra: 'Ein Wort von hier',
    porQueImporta: 'Warum das zählt',
    seDice: 'ausgesprochen',
    apunteFirma: 'Vom Pass aus gesehen',
    fuenteTitulo: 'Woher dieser Beitrag stammt.',
    fuenteTexto: 'Bei La Prida verfasst nach Informationen von',
    fuenteError: 'Fehler entdeckt? Schreiben Sie uns an',
    boletinTitulo: 'Um sieben in Ihrem Postfach',
    boletinTexto: 'Die drei Haltestellen des Tages und kaum mehr. Eine Mail, fünf Minuten, und weiter geht’s.',
    boletinBoton: 'Abonnieren',
    boletinCorreo: 'Ihre E-Mail',
    boletinNota: 'Formular im Test: es sammelt noch keine Adressen.',
    publicidad: 'Anzeige',
    espacioLibre: 'Platz frei',
    sitioLibre: 'Dieser Platz ist frei',
    sitioLibreTexto: 'Hier könnte Ihr Betrieb stehen, jeden Morgen vor den Leuten der fünf Gemeinden.',
    sitioLibreEnlace: 'So wird geworben →',
    conApoyo: 'Unterstützt von',
    patrocinado: 'Gesponsert',
    cookiesTexto:
      'Wir verwenden eigene und fremde Cookies, um Besuche zu messen und Werbung anzuzeigen. Die Einzelheiten stehen im',
    cookiesLegal: 'Impressum',
    cookiesSolo: 'Nur das Nötige',
    cookiesSi: 'Annehmen',
    loQueViene: 'Was ansteht',
    loQueSeHizo: 'Was gelaufen ist',
    ultimasSemanas: 'letzte Wochen',
    plan: 'Termin',
    planes: 'Termine',
    agendaVacia:
      'Im Moment ist nichts mit Datum angekündigt. Sobald die Rathäuser und die Säle ihr Programm veröffentlichen, erscheint es hier von allein.',
    filtroTodo: 'Alles',
    filtrarPor: 'Termine filtern',
    programaEntero: 'Das ganze Programm',
    programaEnteroTexto:
      'Hier steht, was veröffentlicht wird. Für das vollständige Programm jedes Hauses besser direkt zur Quelle:',
    cuando: 'Wann',
    donde: 'Wo',
    cuanto: 'Wie viel',
    aLas: 'um',
    yaPaso: 'Das ist schon vorbei. Es bleibt hier als Erinnerung daran, was hier so läuft.',
    datosDelPlan: 'Angaben zum Termin',
    ofertasDeAqui: 'Stellen von hier',
    empleoPrensa: 'Arbeit in der Presse der Gegend',
    empleoVacio:
      'Noch keine Stelle veröffentlicht. Wenn Sie jemanden für Ihren Betrieb suchen, kostet die Anzeige hier nichts.',
    buscasAlguien: 'Suchen Sie jemanden?',
    buscasAlguienTexto:
      'Eine Stellenanzeige hier ist für jeden Betrieb der fünf Gemeinden <strong>kostenlos</strong>. Schicken Sie uns die Stelle, die Arbeitszeit und den Weg zur Bewerbung, und sie erscheint am nächsten Morgen.',
    escribirA: 'Schreiben an',
    dondeMirarAdemas: 'Wo Sie außerdem suchen können',
    dondeMirarTexto: 'Hier steht, was uns erreicht. Das Amtliche und das Große steht auf diesen Seiten:',
    quien: 'Wer',
    jornada: 'Arbeitszeit',
    contrato: 'Vertrag',
    hasta: 'Bis',
    comoApuntarse: 'So bewerben Sie sich →',
    destacada: 'Hervorgehoben',
    ejemplo: 'Beispiel',
    plazoCerrado: 'Frist abgelaufen',
    nadaPorAqui: 'Hier ist gerade nichts.',
    sinTraducir: 'Der vollständige Text dieses Beitrags liegt vorerst nur auf Spanisch vor.',
    leerEnEspanol: 'Auf Spanisch lesen →',
    traduccionAuto: 'Maschinelle Übersetzung, vom System geprüft. Maßgeblich ist die spanische Fassung.',
    ilustracionDe: 'Illustration von La Prida.',
    imagenDe: 'Bild von',
    foto: 'Foto',
    hechoEn: 'Quellen: lokale Medien, Rathäuser, Amtsblatt und Open-Meteo',
    correcciones:
      'Die Beiträge entstehen aus öffentlichen Quellen und lokalen Medien, stets zitiert und verlinkt. Wenn etwas falsch ist, wird es korrigiert:',
    noHayNada: 'Hier ist noch nichts.',
    finDelCamino: 'Hier endet der Weg',
  },
};

export const t = (idioma, clave) => textos[idioma]?.[clave] ?? textos[IDIOMA_BASE][clave] ?? '';

// ── Fechas ──────────────────────────────────────────────────────────────────
const MESES = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
};
const DIAS = {
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
};

export function fechaLargaEn(iso, idioma = IDIOMA_BASE) {
  const d = new Date(iso);
  const dia = DIAS[idioma]?.[d.getDay()] ?? DIAS.es[d.getDay()];
  const mes = MESES[idioma]?.[d.getMonth()] ?? MESES.es[d.getMonth()];
  if (idioma === 'en') return `${dia}, ${d.getDate()} ${mes} ${d.getFullYear()}`;
  if (idioma === 'de') return `${dia}, ${d.getDate()}. ${mes} ${d.getFullYear()}`;
  if (idioma === 'fr') return `${dia} ${d.getDate()} ${mes} ${d.getFullYear()}`;
  return `${dia}, ${d.getDate()} de ${mes} de ${d.getFullYear()}`;
}

export function mesCortoEn(fecha, idioma = IDIOMA_BASE) {
  const m = MESES[idioma]?.[fecha.getMonth()] ?? MESES.es[fecha.getMonth()];
  return m.slice(0, 3);
}

/** «hace 3 días» en cada idioma, sin cargar ninguna librería. */
export function haceCuantoEn(iso, idioma = IDIOMA_BASE) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const plantillas = {
    es: { min: (n) => `hace ${n} min`, h: (n) => `hace ${n} h`, ayer: 'ayer', d: (n) => `hace ${n} días`, el: (d, m) => `el ${d} de ${m}` },
    en: { min: (n) => `${n} min ago`, h: (n) => `${n} h ago`, ayer: 'yesterday', d: (n) => `${n} days ago`, el: (d, m) => `on ${d} ${m}` },
    fr: { min: (n) => `il y a ${n} min`, h: (n) => `il y a ${n} h`, ayer: 'hier', d: (n) => `il y a ${n} jours`, el: (d, m) => `le ${d} ${m}` },
    de: { min: (n) => `vor ${n} Min.`, h: (n) => `vor ${n} Std.`, ayer: 'gestern', d: (n) => `vor ${n} Tagen`, el: (d, m) => `am ${d}. ${m}` },
  };
  const p = plantillas[idioma] ?? plantillas.es;
  if (min < -60) {
    const d = new Date(iso);
    return p.el(d.getDate(), MESES[idioma]?.[d.getMonth()] ?? MESES.es[d.getMonth()]);
  }
  if (min < 60) return p.min(Math.max(1, min));
  const h = Math.round(min / 60);
  if (h < 24) return p.h(h);
  const d = Math.round(h / 24);
  return d === 1 ? p.ayer : p.d(d);
}
