// Todos los textos que ve el participante. Editar aquí, no en el HTML.
// Los textos legales (LEGAL) fueron aprobados por Viteba el 13/10/2026.

export const COPY = {
  welcome: {
    kicker: 'El Reto Viteba',
    eyebrow: '¿Cuánto sabes sobre tu cuerpo?',
    title: '¿Verdadero o falso?',
    claim: '¡Juega y llévate tu muestra de colágeno!',
    facts: ['3 preguntas', '1 minuto', 'Premio seguro'],
    cta: '¡Quiero jugar!',
  },
  register: {
    title: '¿Dónde podemos contactar contigo?',
    subtitle: 'Elige la opción que te resulte más cómoda.',
    email: 'Correo electrónico',
    phone: 'Teléfono móvil',
    anonymous: 'Prefiero jugar sin dejar mis datos',
    back: 'Volver',
    emailLabel: 'Escribe tu correo electrónico',
    phoneLabel: 'Escribe tu teléfono móvil',
    emailPlaceholder: 'nombre@correo.com',
    phonePlaceholder: '600 000 000',
    prefixLabel: 'Prefijo del país',
    submit: 'Continuar',
    saving: 'Guardando…',
    ok: '¡Perfecto! Vamos a jugar.',
    privacyNote: 'Responsable: WTG Doribac S.L.U. (Viteba). Usamos tu contacto para gestionar tu participación y la entrega de la muestra.',
    privacyMore: 'Más información',
  },
  errors: {
    emailEmpty: 'Escribe tu correo para continuar.',
    emailNoAt: 'Al correo le falta la arroba (@).',
    emailSpaces: 'El correo no puede llevar espacios.',
    emailBad: 'Revisa el correo: parece que falta algo.',
    phoneEmpty: 'Escribe tu móvil para continuar.',
    phoneLength: 'El móvil debe tener 9 números.',
    phoneNotMobile: 'Tiene que ser un móvil: empieza por 6 o 7.',
    phoneBad: 'Revisa el número: parece que falta algo.',
    saveTitle: 'No hemos podido guardar tu registro',
    saveText: 'Tu contacto todavía no está guardado. Avisa al Staff de Viteba o vuelve a intentarlo.',
    busyText: 'Espera unos segundos y vuelve a intentarlo.',
    retry: 'Reintentar',
    cancel: 'Cancelar',
  },
  ready: {
    title: '¡Es muy fácil!',
    text: 'Lee cada frase y pulsa VERDADERO o FALSO.',
    cta: '¡Empezar!',
  },
  game: {
    progress: (n, total) => `Pregunta ${n} de ${total}`,
    trueLabel: 'Verdadero',
    falseLabel: 'Falso',
    correct: '¡Correcto!',
    wrong: '¡Casi!',
    truth: (isTrue) => (isTrue ? 'Es verdadero' : 'Es falso'),
    next: 'Siguiente',
    finish: 'Ver mi premio',
  },
  reward: {
    kicker: '¡Has completado el Reto Viteba!',
    title: '¡Enhorabuena!',
    claim: '¡Tu muestra de colágeno te espera!',
    instruction: 'Muestra esta pantalla al Staff de Viteba para recoger tu regalo.',
    score: (n, total) => `Aciertos: ${n} de ${total}`,
    code: 'Participación',
    deliver: 'Entregar muestra y finalizar',
    deliverHint: 'Staff de Viteba: mantén pulsado',
    delivering: 'Registrando entrega…',
    delivered: 'Muestra entregada',
    deliverErrorTitle: 'No se ha registrado la entrega',
    deliverErrorText: 'Revisa la conexión. Si finalizas sin registrar, anota el código en la hoja del stand.',
    deliverRetry: 'Reintentar',
    deliverSkip: 'Finalizar sin registrar',
    productAlt: 'Sticks de Colágeno Essential, Beauty y Puro de Viteba',
  },
  idle: {
    title: '¿Sigues ahí?',
    cta: 'Sí, seguir jugando',
    seconds: (n) => `La partida se cerrará en ${n} segundos`,
  },
  controls: {
    soundOn: 'Sonido activado. Pulsa para silenciar',
    soundOff: 'Sonido silenciado. Pulsa para activar',
    textBigger: 'Hacer la letra más grande',
    textNormal: 'Volver a la letra normal',
  },
  demoBadge: 'Demostración · no se guardan datos',
};

// ---------- Textos legales (aprobados por Viteba el 13/10/2026) ----------

export const LEGAL = {
  // Cambiar la versión cada vez que se modifique cualquiera de estos textos: se guarda con cada registro.
  privacyVersion: 'privacidad-oafi2026-v1',
  consentVersion: 'consentimiento-oafi2026-v1',

  // El consentimiento nombra el canal concreto. Ajustar "SMS o WhatsApp" a los canales que se usen de verdad.
  consent: {
    email: 'Sí, quiero recibir consejos de bienestar, novedades y promociones de Viteba por correo electrónico.',
    phone: 'Sí, quiero recibir consejos de bienestar, novedades y promociones de Viteba por SMS o WhatsApp.',
  },

  privacyTitle: 'Información sobre tus datos',
  privacyClose: 'Cerrar',
  privacy: [
    ['Responsable', 'WTG Doribac S.L.U. (Viteba) · CIF B66284308 · C/ Tarragona 151, Pl. 8, Of. 2, 08014 Barcelona · info@viteba.com'],
    ['Para qué usamos tu contacto', 'Para gestionar tu participación en El Reto Viteba y la entrega de tu muestra. Solo si marcas la casilla, también para enviarte consejos, novedades y promociones de Viteba.'],
    ['Base jurídica', 'Tu participación voluntaria en la actividad. Para las comunicaciones comerciales, tu consentimiento, que puedes retirar cuando quieras.'],
    ['La casilla es opcional', 'Recibirás tu muestra igualmente, marques o no la casilla.'],
    ['Cuánto tiempo', 'Si no aceptas comunicaciones, borraremos tu contacto en un máximo de 30 días tras el evento. Si las aceptas, lo conservaremos hasta que te des de baja.'],
    ['Quién accede', 'Viteba y sus proveedores tecnológicos, que actúan como encargados del tratamiento. No cedemos tus datos a terceros.'],
    ['Tus derechos', 'Puedes acceder, rectificar, suprimir, oponerte, limitar el tratamiento y solicitar la portabilidad escribiendo a info@viteba.com. También puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).'],
    ['Más detalle', 'Política de privacidad completa en viteba.com/pages/politica-de-privacidad'],
  ],
};
