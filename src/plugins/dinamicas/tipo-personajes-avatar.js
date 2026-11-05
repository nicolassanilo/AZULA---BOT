export const datos = {
  id: 'avatar_personajes',
  nombre: '¿Quién es? Personajes del Avatar 👤',
  descripcionCorta: 'Adivina el personaje por su descripción',
  tipo: 'Team Avatar',
  equipoExclusivo: 'avatar',
  rondas: 10,
  tiempoPorRonda: 50,
  mensajeInicio: '👤 ¿Quién es? Reconoce a los personajes del Avatar por sus pistas.',
  preguntas: [
    { id: 'avatar_personaje_1', pista: 'Un joven nómada del aire con tatuajes azules y la misión de restaurar el equilibrio.', respuesta: 'Aang' },
    { id: 'avatar_personaje_2', pista: 'Una maestra agua del Polo Sur que acompaña al Avatar y protege a sus amigos.', respuesta: 'Katara' },
    { id: 'avatar_personaje_3', pista: 'Un guerrero ingenioso del Polo Sur que prefiere planificar antes que usar control elemental.', respuesta: 'Sokka' },
    { id: 'avatar_personaje_4', pista: 'Una princesa de la Nación del Fuego, prodigio del fuego control y rival de Zuko.', respuesta: 'Azula' },
    { id: 'avatar_personaje_5', pista: 'Una maestra tierra ciega que descubre vibraciones bajo sus pies.', respuesta: 'Toph' },
    { id: 'avatar_personaje_6', pista: 'Un príncipe desterrado que busca capturar al Avatar antes de encontrar su propio honor.', respuesta: 'Zuko' },
    { id: 'avatar_personaje_7', pista: 'El sabio tío de Zuko, amante del té y antiguo general de la Nación del Fuego.', respuesta: 'Iroh' },
    { id: 'avatar_personaje_8', pista: 'Una guerrera Kyoshi que lucha con abanicos y entrena a Sokka.', respuesta: 'Suki' },
    { id: 'avatar_personaje_9', pista: 'El líder de la Tribu Agua del Norte y hermano de Yue.', respuesta: 'Arnook' },
    { id: 'avatar_personaje_10', pista: 'Una joven de la Tribu Agua del Norte que se convierte en la Luna.', respuesta: 'Yue' }
  ],
  formatoPregunta: (pregunta) => `👤 ¿Quién es?\n${pregunta.pista}`,
  validarRespuesta: (mensaje, pregunta) => mensaje.toLocaleLowerCase().includes(pregunta.respuesta.toLocaleLowerCase())
};