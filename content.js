// =====================================================================
//  RePrograma · contenido
//  Todo el texto de la app vive aquí: puedes editarlo sin tocar el código.
//  Las "ideas del libro" están PARAFRASEADAS con palabras propias (no son
//  citas textuales). Cada una indica el capítulo donde está la idea original.
// =====================================================================

export const MODES = {
  programa: {
    label: 'RePrograma',
    short: 'Programa',
    slogan: 'Desinstala tu pasado. Instala tu futuro.',
    logo: 'logo-reprograma-192.png'
  },
  vacio: {
    label: 'Vacío',
    short: 'Vacío',
    slogan: 'Donde no eres nadie, puedes ser todo.',
    logo: 'logo-vacio-192.png'
  },
  gratitud: {
    label: 'Gratitud',
    short: 'Gratitud',
    slogan: 'No esperes a sentirte bien. Siente bien para que llegue.',
    logo: 'logo-gratitud-192.png'
  }
};

// ---------- Programa de 4 semanas (acumulativo) ----------
export const STEPS = [
  { n: 1, w: 1, name: 'Inducción', d: 'Relaja el cuerpo y lleva la atención hacia adentro para entrar en un estado sereno y receptivo.' },
  { n: 2, w: 2, name: 'Reconoce', d: 'Define la emoción y la actitud limitante que quieres soltar.' },
  { n: 3, w: 2, name: 'Admite y declara', d: 'Admite en silencio quién has estado siendo y declara en voz alta la emoción que dejas atrás.' },
  { n: 4, w: 2, name: 'Entrégate', d: 'Entrega ese estado a una mente superior y confía en que se resuelva de la mejor manera.' },
  { n: 5, w: 3, name: 'Observa y recuerda', d: 'Observa los pensamientos y las acciones automáticas de tu antiguo yo hasta conocer sus programas.' },
  { n: 6, w: 3, name: 'Redirige', d: 'Ante un pensamiento limitante, di ¡Cambia! y lleva la atención a otra parte.' },
  { n: 7, w: 4, name: 'Crea y repasa', d: 'Crea a tu nuevo yo y repásalo mentalmente cada día.' }
];

// ---------- Semáforo del día ----------
export const SEMAFORO = [
  { v: 'pasado', color: '#E5484D', title: 'Rojo: desde el pasado', sub: 'Reacciono con hábitos y emociones de siempre.' },
  { v: 'observando', color: '#F5B301', title: 'Amarillo: observando', sub: 'Noto mi piloto automático sin pelear con él.' },
  { v: 'futuro', color: '#30C48D', title: 'Verde: desde el futuro', sub: 'Elijo desde la persona que estoy creando.' }
];

// ---------- Fases de la bitácora por modo ----------
export const PHASES = {
  programa: [
    { id: 'observar', label: 'Observar', q: '¿Qué pensamiento, emoción o reacción automática del yo de siempre noté hoy? ¿Qué la disparó?' },
    { id: 'redirigir', label: 'Redirigir', q: '¿En qué momento del día dije ¡Cambia! y hacia dónde llevé mi atención?' },
    { id: 'crear', label: 'Crear', q: 'Describe con detalle a la persona en la que me estoy convirtiendo: cómo piensa, cómo se siente y qué hace.' },
    { id: 'despues', label: 'Tras meditar', q: '¿Qué sentí y qué noté durante la meditación? Escríbelo antes de que la mente analítica lo ordene.' }
  ],
  vacio: [
    { id: 'vacio-despues', label: 'Tras el vacío', q: '¿Qué quedó cuando solté mi nombre, mi historia y la hora?' },
    { id: 'vacio-tiempo', label: 'Sobre el tiempo', q: '¿Cuántas veces me fui al pasado o al futuro hoy y cómo volví al presente?' },
    { id: 'vacio-identidad', label: 'Identidad', q: '¿Qué parte de quién soy depende de lo que hay afuera: personas, lugares, ocupaciones?' }
  ],
  gratitud: [
    { id: 'gracias', label: 'Gracias por hoy', q: 'Escribe tres cosas por las que sientes gratitud ahora y cómo se siente cada una en tu cuerpo.' },
    { id: 'hecho', label: 'Hecho está', q: 'Escribe algo que deseas como si ya hubiera ocurrido, empezando por "Gracias porque ya…". ¿Qué sientes al agradecerlo?' },
    { id: 'corazon', label: 'Tras el corazón', q: '¿Qué sentí en el pecho durante la meditación y qué imagen o pensamiento apareció?' }
  ]
};

export function phaseById(id) {
  for (const m of Object.keys(PHASES)) {
    const p = PHASES[m].find(x => x.id === id);
    if (p) return p;
  }
  return null;
}

// ---------- Ideas del libro (recordatorios inteligentes) ----------
//  m: modos donde puede aparecer
//  w: semanas del programa (vacío = idea general, sirve en cualquier semana)
//  t: situaciones que la hacen más relevante:
//     start, gap, pasado, observando, futuro, low, high, redirect, stopped,
//     streak, pattern, after-session, after-entry
//  src: 'libro' (idea del libro, parafraseada) o 'practica' (sugerencia propia)
const P = ['programa'];
const ALL = ['programa', 'vacio', 'gratitud'];

export const IDEAS = [
  // ----- Semana 1 -----
  { id: 's1-a', m: P, w: [1], t: ['start'], src: 'libro', r: 'Cap. 9',
    x: 'Empieza con una sola sesión al día. Antes de sentarte, relee lo que escribiste: tus notas son el mapa del viaje.' },
  { id: 's1-b', m: P, w: [1], t: ['after-session', 'high'], src: 'libro', r: 'Cap. 9',
    x: 'Cada vez que llevas el cuerpo al momento presente, en lugar de dejar que corra tras el pasado o el futuro, lo entrenas para una nueva mente.' },
  { id: 's1-c', m: P, w: [1], t: ['stopped', 'gap'], src: 'libro', r: 'Cap. 9',
    x: 'Si te descubres pensando en la hora, todavía no saliste del tiempo. Reserva margen de sobra para no estar pendiente del reloj.' },
  { id: 's1-d', m: P, w: [1], t: ['low', 'pasado'], src: 'libro', r: 'Cap. 9',
    x: 'Casi siempre la mente recuerda el pasado o anticipa lo previsible. Son asociaciones, no creación. Vuelve al momento presente.' },
  { id: 's1-e', m: P, w: [1], t: ['gap', 'start'], src: 'libro', r: 'Cap. 9',
    x: 'Elige un lugar tranquilo y vuelve siempre al mismo. Si te duermes al meditar en la cama, es la asociación cama y sueño: cambia de lugar.' },
  { id: 's1-f', m: P, w: [1], t: ['after-session', 'observando'], src: 'libro', r: 'Caps. 9 y 10',
    x: 'Mientras aprendes, dedica la sesión a la inducción sin prisa. Aprender a calmar el cuerpo es la base de todo lo que viene después.' },

  // ----- Semana 2 -----
  { id: 's2-a', m: P, w: [2], t: ['start', 'pasado'], src: 'libro', r: 'Cap. 11',
    x: 'Reconoce: ponle nombre a la emoción concreta que quieres soltar y mira a qué actitud te lleva cuando la sientes.' },
  { id: 's2-b', m: P, w: [2], t: ['pattern', 'low', 'pasado'], src: 'libro', r: 'Cap. 11',
    x: 'Admitir es decirte la verdad sobre quién has estado siendo. Declarar en voz alta la emoción ayuda a soltar el vínculo con lo que la dispara.' },
  { id: 's2-c', m: P, w: [2], t: ['after-session', 'stopped'], src: 'libro', r: 'Cap. 11',
    x: 'Entregarte es dejar de controlar: pon ese estado en manos de una mente superior y confía en que se resuelva de la mejor manera para ti.' },
  { id: 's2-d', m: P, w: [2], t: ['streak', 'after-entry'], src: 'libro', r: 'Cap. 11',
    x: 'Practica los pasos 1 a 4 cada día hasta que se fundan en uno solo. Entonces estarás listo para sumar el siguiente.' },

  // ----- Semana 3 -----
  { id: 's3-a', m: P, w: [3], t: ['start', 'observando'], src: 'libro', r: 'Cap. 12',
    x: 'Cuando notas que estás siendo tu antiguo yo, dejas de serlo en ese instante: observar te saca del piloto automático.' },
  { id: 's3-b', m: P, w: [3], t: ['pasado', 'low', 'pattern'], src: 'libro', r: 'Cap. 12',
    x: 'Tu identidad neurológica es la suma de lo que piensas y haces momento a momento. Cambia esos momentos y cambia quién eres.' },
  { id: 's3-c', m: P, w: [3], t: ['redirect', 'pasado'], src: 'libro', r: 'Cap. 12',
    x: 'Cuando aparezca un pensamiento o un sentimiento limitante, di ¡Cambia! en voz alta o en tu mente, como la voz con más autoridad.' },
  { id: 's3-d', m: P, w: [3], t: ['after-entry', 'after-session'], src: 'libro', r: 'Cap. 12',
    x: 'Repasa lo que escribiste sobre los pasos 5 y 6 antes de meditar. Lo escrito prepara la sesión.' },

  // ----- Semana 4 -----
  { id: 's4-a', m: P, w: [4], t: ['start', 'after-session'], src: 'libro', r: 'Cap. 13',
    x: 'Ya soltaste conexiones antiguas; ahora toca generar otras nuevas. La mente que crees hoy será la plataforma de la persona que serás.' },
  { id: 's4-b', m: P, w: [4], t: ['futuro', 'high', 'after-entry'], src: 'libro', r: 'Cap. 13',
    x: 'Define con detalle quién serás: cómo piensas, cómo te sientes y qué haces. Repásalo mentalmente cada día hasta que te resulte familiar.' },
  { id: 's4-c', m: P, w: [4], t: ['low', 'pattern', 'observando'], src: 'libro', r: 'Cap. 13',
    x: 'La metacognición te permite observar tu propia mente y separarte de los programas automáticos. Solo observa, sin juzgar.' },
  { id: 's4-d', m: P, w: [4], t: ['after-session'], src: 'libro', r: 'Cap. 14',
    x: 'Al levantarte de la meditación pasas de pensar a ser. Actúa el resto del día desde ese estado.' },
  { id: 's4-e', m: P, w: [4], t: ['high', 'streak', 'futuro'], src: 'libro', r: 'Cap. 14',
    x: 'Demostrarlo es conservar durante el día el estado con el que creaste tu nuevo yo: en casa, en el trabajo, con tu familia.' },
  { id: 's4-f', m: P, w: [4], t: ['low', 'gap'], src: 'libro', r: 'Cap. 14',
    x: 'No puedes crear una personalidad nueva en la meditación y vivir el resto del día como la antigua. La prueba es la coherencia entre lo que piensas, sientes y haces.' },
  { id: 's4-g', m: P, w: [4], t: ['streak', 'high'], src: 'libro', r: 'Cap. 14',
    x: 'Cuando dejas de gastar energía en tu antiguo estado, esa energía queda libre. La consecuencia indirecta de esa libertad es la felicidad.' },

  // ----- Generales (cualquier semana y modo) -----
  { id: 'g-1', m: P, w: [], t: ['pasado', 'pattern'], src: 'libro', r: 'Cap. 6',
    x: 'Las emociones del pasado son un vestigio que te esclaviza. Con emociones elevadas empiezas a usar tu energía para crear el futuro.' },
  { id: 'g-2', m: ALL, w: [], t: ['low', 'observando'], src: 'libro', r: 'Caps. 2 a 4',
    x: 'Los tres grandes: entorno, cuerpo y tiempo. Si te sientes disperso, pregúntate cuál de los tres te está gobernando ahora.' },
  { id: 'g-3', m: ALL, w: [], t: ['gap'], src: 'libro', r: 'Caps. 8 y 9',
    x: 'La práctica se construye con repetición. Empezar de nuevo hoy también cuenta: cada repetición refuerza la red que estás formando.' },
  { id: 'g-4', m: ALL, w: [], t: ['streak', 'after-session'], src: 'libro', r: 'Cap. 9',
    x: 'Atención, instrucciones y práctica repetidas forman una red neuronal que refleja tu intención. Por eso cada día suma.' },
  { id: 'g-5', m: P, w: [], t: ['futuro', 'start'], src: 'libro', r: 'Cap. 1',
    x: 'Elegir desde el futuro es sentir hoy la emoción de esa realidad, no esperar a que ocurra para recién sentirla.' },

  // ----- Modo Vacío -----
  { id: 'v-1', m: ['vacio'], w: [], t: ['start', 'low'], src: 'libro', r: 'Cap. 7',
    x: 'Si cada vez que estás en silencio y a solas sientes que algo falta, quizá tu identidad dependa de lo de afuera. Ahí empieza el trabajo.' },
  { id: 'v-2', m: ['vacio'], w: [], t: ['after-session', 'high'], src: 'libro', r: 'Cap. 7',
    x: 'Entre quien aparentas ser y quien eres por dentro hay un espacio. Aprender a permanecer ahí, sin llenarlo, es el vacío.' },
  { id: 'v-3', m: ['vacio'], w: [], t: ['stopped', 'low'], src: 'libro', r: 'Cap. 9',
    x: 'Si la mente se llena de pensamientos sobre la hora o lo pendiente, no la pelees: nota, suelta y vuelve al cuerpo.' },
  { id: 'v-4', m: ['vacio'], w: [], t: ['gap', 'start'], src: 'practica', r: 'Sugerencia de práctica',
    x: 'Volver a sentarte hoy también cuenta. Cinco minutos sin nombre, sin historia y sin reloj bastan para empezar.' },
  { id: 'v-5', m: ['vacio'], w: [], t: ['pattern', 'pasado'], src: 'practica', r: 'Sugerencia de práctica',
    x: 'Un pensamiento repetido no eres tú: es un programa. Míralo pasar como se mira cruzar una estrella en un cielo oscuro.' },
  { id: 'v-6', m: ['vacio'], w: [], t: ['streak', 'after-entry'], src: 'practica', r: 'Sugerencia de práctica',
    x: 'Nota qué quedó cuando soltaste el nombre y la historia. Escribirlo lo hace real y te permite volver a ello.' },

  // ----- Modo Gratitud -----
  { id: 'gr-1', m: ['gratitud'], w: [], t: ['start', 'futuro'], src: 'libro', r: 'Cap. 1',
    x: 'Agradecer algo que aún no ocurre, pero existe como posibilidad, te lleva de esperar que algo externo te cambie a cambiar primero tu interior.' },
  { id: 'gr-2', m: ['gratitud'], w: [], t: ['after-entry', 'after-session'], src: 'libro', r: 'Cap. 1',
    x: 'La gratitud no es solo un pensamiento. El cuerpo solo entiende sentimientos, así que necesita sentir como si lo deseado ya existiera.' },
  { id: 'gr-3', m: ['gratitud'], w: [], t: ['low', 'pasado', 'stopped'], src: 'libro', r: 'Cap. 6',
    x: 'Si te cuesta agradecer antes de que llegue lo deseado, no te juzgues: eso es justo lo que se entrena. Empieza por algo pequeño y real.' },
  { id: 'gr-4', m: ['gratitud'], w: [], t: ['high', 'streak'], src: 'libro', r: 'Cap. 6',
    x: 'Emociones elevadas como la gratitud y el amor te ayudan a entrar en un estado en que sientes como si lo deseado ya hubiera ocurrido.' },
  { id: 'gr-5', m: ['gratitud'], w: [], t: ['gap'], src: 'practica', r: 'Sugerencia de práctica',
    x: 'No esperes a sentirte bien para agradecer: elige la emoción primero. Un minuto de gratitud real ya es un ensayo de tu nuevo estado.' },
  { id: 'gr-6', m: ['gratitud'], w: [], t: ['pasado', 'pattern', 'observando'], src: 'practica', r: 'Sugerencia de práctica',
    x: 'Cambiar el foco hacia una emoción elevada, aunque sea por un minuto, es un ensayo de quién estás decidiendo ser.' }
];

// ---------- Modo Vacío: ejercicios anti-tiempo lineal ----------
export const EXERCISES = [
  { id: 'sinreloj', name: 'Sin reloj', min: 3,
    steps: ['Deja el reloj y el celular fuera de tu vista.', 'Siéntate y cierra los ojos.', 'Cuando notes un pensamiento sobre la hora o lo pendiente, dilo por dentro: "tiempo". Vuelve a la respiración.'] },
  { id: 'instante', name: 'El instante', min: 2,
    steps: ['Nota tres sonidos que están ocurriendo ahora.', 'Nota el peso de tu cuerpo sobre el asiento.', 'Nota la temperatura de tu piel. Nada de comparar con antes ni con después.'] },
  { id: 'etiqueta', name: 'Pasado o futuro', min: 3,
    steps: ['Cierra los ojos y respira lento.', 'Cada vez que aparezca un recuerdo o un plan, ponle la etiqueta "pasado" o "futuro".', 'Vuelve al cuerpo y, al terminar, cuenta cuántas veces ocurrió.'] },
  { id: 'sinnombre', name: 'Cuerpo sin nombre', min: 4,
    steps: ['Recorre el cuerpo de los pies a la cabeza.', 'Registra solo sensaciones: calor, peso, pulso. Sin decir quién eres ni qué te pasó.', 'Termina sintiendo el cuerpo entero a la vez.'] }
];

// ---------- Modo Vacío: plan de 21 días ----------
export const PLAN21_BLOCKS = [
  { name: 'Soltar', from: 1, to: 7 },
  { name: 'Observar', from: 8, to: 14 },
  { name: 'Ensayar', from: 15, to: 21 }
];
export const PLAN21 = [
  'Medita 5 minutos y cuenta cuántas veces la mente se va al pasado o al futuro.',
  'Pasa 10 minutos en silencio, sin pantallas y sin música.',
  'Al despertar, espera 15 minutos antes de mirar el celular.',
  'Haz el ejercicio "Sin reloj": 3 minutos sin mirar la hora.',
  'Escribe qué emoción de siempre te visitó hoy, sin juzgarla.',
  'Camina 10 minutos atento solo a lo que ves y oyes.',
  'Medita 10 minutos y anota qué quedó cuando soltaste tu historia.',
  'Observa un hábito automático de hoy (café, celular, quejarte) y solo nótalo.',
  'Cada vez que digas "siempre soy así", detente y di ¡Cambia!',
  'Elige una situación que te dispara y obsérvala antes de reaccionar: tres respiraciones.',
  'Medita 10 minutos y observa cómo aparece tu antiguo yo, sin pelear con él.',
  'Escribe tres pensamientos repetidos de hoy y de dónde crees que vienen.',
  'Haz una comida completa sin estímulos externos, sintiendo cada bocado.',
  'Medita 15 minutos y al terminar escribe quién no quieres seguir siendo.',
  'Escribe cómo piensa, siente y actúa tu nuevo yo en un día normal.',
  'Repasa mentalmente ese día durante 10 minutos, con todos los detalles.',
  'Actúa hoy en una sola cosa como lo haría tu nuevo yo.',
  'Medita 15 minutos y ensaya esa escena: siente la emoción antes de que ocurra.',
  'Agradece algo que aún no ha ocurrido, como si ya existiera.',
  'Mantén tu estado interior durante una conversación difícil.',
  'Medita 20 minutos y escribe qué cambió en estos 21 días.'
];

// ---------- Herramientas rápidas ----------
export const ANCHORS = [
  { n: 5, t: 'Nombra 5 cosas que puedes ver.' },
  { n: 4, t: 'Nombra 4 cosas que puedes tocar.' },
  { n: 3, t: 'Nombra 3 sonidos que puedes oír.' },
  { n: 2, t: 'Nombra 2 olores que puedes percibir.' },
  { n: 1, t: 'Nombra 1 sabor que sientes ahora.' }
];

// ---------- Hitos de aprendizaje (por días con entradas en la bitácora) ----------
export const MILESTONES = [
  { days: 3, t: 'Los tres grandes: entorno, cuerpo y tiempo', ref: 'Capítulos 2 a 4',
    b: 'El libro plantea que el yo de siempre se sostiene en tres anclas: lo que te rodea, tu cuerpo y tu sentido del tiempo. Meditar es entrenar la atención para no depender de ninguna de las tres. Por eso conviene tener un lugar y una hora fijos para practicar.' },
  { days: 7, t: 'Supervivencia frente a creación', ref: 'Capítulo 5',
    b: 'En modo supervivencia la atención y la energía se van hacia el pasado y hacia lo que amenaza. Crear exige llevarlas hacia un futuro que eliges. Tu semáforo diario es este mismo ejercicio hecho consciente.' },
  { days: 14, t: 'Pensar, actuar y ser', ref: 'Capítulo 6',
    b: 'Lo que piensas y sientes una y otra vez se vuelve hábito, y el hábito se vuelve tu forma de ser. Cambiar de identidad es cambiar lo que repites con atención, no solo lo que deseas.' },
  { days: 21, t: 'La repetición construye la red', ref: 'Capítulos 8 y 9',
    b: 'Cuando atención, instrucciones y práctica se repiten, se forma una red neuronal que refleja tu intención: las neuronas que se activan juntas se conectan. Por eso se recomienda repetir los pasos hasta que se fundan en uno solo.' },
  { days: 30, t: 'Vive tu nueva realidad', ref: 'Capítulo 14',
    b: 'La meta no es solo meditar sino demostrarlo: que tus decisiones, actitudes y relaciones reflejen a la persona que estás creando. Elige hoy una situación concreta donde puedas hacerlo.' }
];

// ---------- Patrones de palabras en la bitácora ----------
export const KEYWORDS = [
  ['ansied|ansios', 'ansiedad'], ['frustr', 'frustración'], ['bloque', 'bloqueo'], ['miedo|temor', 'miedo'],
  ['culpa', 'culpa'], ['estres', 'estrés'], ['rabia|enojo|ira\\b', 'rabia'], ['preocup', 'preocupación'],
  ['angusti', 'angustia'], ['resentim', 'resentimiento'], ['verguenza', 'vergüenza'],
  ['tristeza|triste', 'tristeza'], ['insegur', 'inseguridad']
];

export const OFFICIAL_URL = 'https://drjoedispenza.com/';
export const LIVE_URL = 'https://drjoedispenza.com/dr-joe-live';
