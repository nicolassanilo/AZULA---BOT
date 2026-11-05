export const datos = {
  id: 'avatar_elementos',
  nombre: 'Adivina el elemento 🌊🔥',
  descripcionCorta: 'Adivina si la pista corresponde al agua o al fuego',
  tipo: 'Team Avatar',
  equipoExclusivo: 'avatar',
  rondas: 10,
  tiempoPorRonda: 50,
  mensajeInicio: '🌊🔥 ¡Adivina el elemento! Responde agua o fuego según cada pista.',
  preguntas: [
    { id: 'avatar_elemento_agua_1', pista: 'Katara controla este elemento y lo usa para sanar.', respuesta: 'agua' },
    { id: 'avatar_elemento_fuego_1', pista: 'Zuko y Azula dominan este elemento.', respuesta: 'fuego' },
    { id: 'avatar_elemento_agua_2', pista: 'La Tribu Agua del Norte protege su ciudad con este elemento.', respuesta: 'agua' },
    { id: 'avatar_elemento_fuego_2', pista: 'La Nación del Fuego inició la guerra usando este elemento.', respuesta: 'fuego' },
    { id: 'avatar_elemento_agua_3', pista: 'Hama aprendió a controlar este elemento en la Nación del Fuego.', respuesta: 'agua' },
    { id: 'avatar_elemento_fuego_3', pista: 'Iroh enseñó a Zuko a redirigir los rayos mediante la comprensión de este elemento.', respuesta: 'fuego' },
    { id: 'avatar_elemento_agua_4', pista: 'Es el elemento asociado a la luna y al empuje.', respuesta: 'agua' },
    { id: 'avatar_elemento_fuego_4', pista: 'Es el elemento asociado al sol y a la energía.', respuesta: 'fuego' },
    { id: 'avatar_elemento_agua_5', pista: 'La maestra Pakku enseña este arte de control en el Polo Norte.', respuesta: 'agua' },
    { id: 'avatar_elemento_fuego_5', pista: 'La maestra Jeong Jeong se apartó de este arte de control.', respuesta: 'fuego' }
  ],
  formatoPregunta: (pregunta) => `🌊 vs 🔥\n${pregunta.pista}\n¿Agua o fuego?`,
  validarRespuesta: (mensaje, pregunta) => mensaje.trim().toLocaleLowerCase().includes(pregunta.respuesta)
};