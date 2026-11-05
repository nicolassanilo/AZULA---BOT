export const datos = {
  id: 'avatar_frases',
  nombre: 'Frases del Avatar 💬',
  descripcionCorta: 'Reconoce al personaje por una frase inspirada en la serie',
  tipo: 'Team Avatar',
  equipoExclusivo: 'avatar',
  rondas: 10,
  tiempoPorRonda: 50,
  mensajeInicio: '💬 Frases del Avatar: identifica quién podría decir cada frase.',
  preguntas: [
    { id: 'avatar_frase_1', pista: '«Incluso en los días difíciles, siempre hay una razón para seguir adelante.»', respuesta: 'Aang' },
    { id: 'avatar_frase_2', pista: '«La paciencia puede abrir caminos que la fuerza no encuentra.»', respuesta: 'Iroh' },
    { id: 'avatar_frase_3', pista: '«No dejaré que mi pasado decida en quién me convierto.»', respuesta: 'Zuko' },
    { id: 'avatar_frase_4', pista: '«Mi familia y mi tribu son la razón por la que sigo luchando.»', respuesta: 'Katara' },
    { id: 'avatar_frase_5', pista: '«Tengo un plan. Bueno, casi siempre tengo un plan.»', respuesta: 'Sokka' },
    { id: 'avatar_frase_6', pista: '«Puedo ver que hay algo bueno en ti, aunque todavía no lo veas.»', respuesta: 'Toph' },
    { id: 'avatar_frase_7', pista: '«Ser fuerte también significa saber escuchar a quienes te quieren.»', respuesta: 'Iroh' },
    { id: 'avatar_frase_8', pista: '«Mi destino no es una orden: puedo elegir mi propio camino.»', respuesta: 'Zuko' },
    { id: 'avatar_frase_9', pista: '«No necesito ver para saber dónde está mi oponente.»', respuesta: 'Toph' },
    { id: 'avatar_frase_10', pista: '«El equilibrio se construye cuidando de todos, no solo de uno mismo.»', respuesta: 'Aang' }
  ],
  formatoPregunta: (pregunta) => `💬 ${pregunta.pista}\n¿Quién podría decirlo?`,
  validarRespuesta: (mensaje, pregunta) => mensaje.toLocaleLowerCase().includes(pregunta.respuesta.toLocaleLowerCase())
};