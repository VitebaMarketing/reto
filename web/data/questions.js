// Banco de preguntas de El Reto Viteba.
// Para editar: cambia el texto, la respuesta (true = VERDADERO) o la explicación (una sola frase).
// "image" es opcional: 'vitamina-c' o 'movimiento'.
// Las frases sobre vitamina C y vitamina D usan la redacción de las declaraciones autorizadas
// por el Reglamento (UE) 432/2012. No cambiar esas frases sin revisión regulatoria.

export const TOPICS = {
  colageno: 'Colágeno',
  'vitamina-c': 'Vitamina C',
  articulaciones: 'Articulaciones',
  huesos: 'Huesos',
  movimiento: 'Movimiento',
};

export const QUESTIONS = [
  {
    id: 'colageno-edad',
    topic: 'colageno',
    text: 'Con los años, nuestro cuerpo produce menos colágeno.',
    answer: true,
    explanation: 'La producción natural de colágeno disminuye poco a poco con la edad.',
  },
  {
    id: 'colageno-solo-piel',
    topic: 'colageno',
    text: 'El colágeno solo se encuentra en la piel.',
    answer: false,
    explanation: 'También está en huesos, cartílagos, tendones y ligamentos.',
  },
  {
    id: 'colageno-abundante',
    topic: 'colageno',
    text: 'El colágeno es la proteína más abundante de nuestro cuerpo.',
    answer: true,
    explanation: 'Supone cerca de un tercio de todas las proteínas del cuerpo.',
  },
  {
    id: 'colageno-tipos',
    topic: 'colageno',
    text: 'En el cuerpo humano solo existe un tipo de colágeno.',
    answer: false,
    explanation: 'Hay muchos tipos: el tipo II, por ejemplo, es el principal del cartílago.',
  },
  {
    id: 'vitc-cartilagos',
    topic: 'vitamina-c',
    image: 'vitamina-c',
    text: 'La vitamina C contribuye a la formación normal de colágeno para el funcionamiento normal de los cartílagos.',
    answer: true,
    explanation: 'Es una propiedad de la vitamina C reconocida por la normativa europea.',
  },
  {
    id: 'vitc-fabricar',
    topic: 'vitamina-c',
    image: 'vitamina-c',
    text: 'Nuestro cuerpo fabrica por sí mismo la vitamina C que necesita.',
    answer: false,
    explanation: 'No puede fabricarla: la obtenemos de alimentos como frutas y verduras.',
  },
  {
    id: 'vitc-naranja',
    topic: 'vitamina-c',
    image: 'vitamina-c',
    text: 'La naranja es el alimento con más vitamina C.',
    answer: false,
    explanation: 'El pimiento rojo y el kiwi tienen más vitamina C que la naranja.',
  },
  {
    id: 'cartilago-funcion',
    topic: 'articulaciones',
    text: 'El cartílago recubre los extremos de los huesos dentro de las articulaciones.',
    answer: true,
    explanation: 'Actúa como una almohadilla que facilita el movimiento.',
  },
  {
    id: 'tendones',
    topic: 'articulaciones',
    text: 'Los tendones unen un hueso con otro hueso.',
    answer: false,
    explanation: 'Los tendones unen el músculo con el hueso; los ligamentos unen hueso con hueso.',
  },
  {
    id: 'huesos-renovacion',
    topic: 'huesos',
    text: 'Los huesos dejan de renovarse cuando terminamos de crecer.',
    answer: false,
    explanation: 'El hueso es un tejido vivo que se renueva durante toda la vida.',
  },
  {
    id: 'huesos-colageno',
    topic: 'huesos',
    text: 'El colágeno forma parte de nuestros huesos.',
    answer: true,
    explanation: 'Forma la estructura flexible sobre la que se fijan minerales como el calcio.',
  },
  {
    id: 'huesos-vitamina-d',
    topic: 'huesos',
    text: 'La vitamina D contribuye al mantenimiento de los huesos en condiciones normales.',
    answer: true,
    explanation: 'Es una propiedad de la vitamina D reconocida por la normativa europea.',
  },
  {
    id: 'movimiento-ayuda',
    topic: 'movimiento',
    image: 'movimiento',
    text: 'Moverse con regularidad ayuda a cuidar las articulaciones.',
    answer: true,
    explanation: 'La actividad física adaptada a cada persona es una gran aliada de las articulaciones.',
  },
  {
    id: 'movimiento-reposo',
    topic: 'movimiento',
    image: 'movimiento',
    text: 'A partir de los 60 años, lo mejor para las articulaciones es moverse lo menos posible.',
    answer: false,
    explanation: 'Al contrario: mantenerse activo es importante a cualquier edad.',
  },
];
