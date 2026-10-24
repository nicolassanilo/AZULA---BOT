const playerStore = new Map();
const defaultMedals = ['🥇', '🥈', '🥉', '✨'];

export const triviaPool = [
  {
    question: '¿Cuál es el lenguaje que se usa para crear páginas web con estilo visual?',
    options: ['HTML', 'CSS', 'JavaScript', 'SQL'],
    answer: 'CSS'
  },
  {
    question: '¿Qué palabra se usa para describir una comunidad que juega juntos?',
    options: ['Clan', 'Mochila', 'Cámara', 'Archivo'],
    answer: 'Clan'
  },
  {
    question: '¿Qué número es el siguiente en esta secuencia: 2, 4, 8, 16, ?',
    options: ['18', '24', '32', '64'],
    answer: '32'
  },
  {
    question: '¿Cuál de estas opciones es un símbolo de desafío en un grupo?',
    options: ['🏆', '📁', '🚗', '🧺'],
    answer: '🏆'
  }
];

export const adivinanzaPool = [
  {
    title: 'Adivinanza 1',
    clue: 'Pienso en un número entre 1 y 10. Si lo duplicas y le sumas 2, obtienes 12. ¿Cuál es?',
    answer: '5'
  },
  {
    title: 'Adivinanza 2',
    clue: 'Es un número entre 1 y 20. Si restás 3, queda 7. ¿Cuál es?',
    answer: '10'
  },
  {
    title: 'Adivinanza 3',
    clue: 'Tengo un valor secreto del 1 al 6. ¿Cuánto vale si juegas a los dados?',
    answer: '1-6'
  }
];

export const retoPool = [
  'Haz una foto con tu mejor sonrisa y comparte el reto del día.',
  'Invita a tu grupo a una partida rápida de trivia en menos de 5 minutos.',
  'Escribe un mensaje motivador para tu comunidad en el chat del grupo.',
  'Responde una pregunta grupal y reta a dos personas a hacer lo mismo.'
];

export const encuestaPool = [
  '¿Cuál es tu juego favorito del grupo hoy?',
  '¿Qué tipo de reto quieres ver esta semana?',
  '¿Qué prefieres: trivia, dados o misiones?',
  '¿Qué recompensa te motiva más en la comunidad?'
];

export const misionPool = [
  { title: 'Misión diaria', description: 'Participa en un reto grupal y escribe tu resultado.', reward: 50 },
  { title: 'Misión semanal', description: 'Completa una trivia y comparte tu puntuación.', reward: 100 },
  { title: 'Misión de equipo', description: 'Ayuda a dos miembros a completar una misión.', reward: 80 },
  { title: 'Cadena de mensajes', description: 'Envía un mensaje de ánimo a la comunidad.', reward: 60 }
];

function normalizeUser(userId) {
  return String(userId || 'anonimo');
}

function levelFromPoints(points) {
  if (points >= 400) return 5;
  if (points >= 300) return 4;
  if (points >= 200) return 3;
  if (points >= 100) return 2;
  return 1;
}

export function getPlayer(userId, displayName = 'Jugador') {
  const id = normalizeUser(userId);

  if (!playerStore.has(id)) {
    playerStore.set(id, {
      userId: id,
      displayName,
      points: 0,
      level: 1,
      streak: 0,
      medals: [],
      totalParticipaciones: 0,
      ultimoEvento: 'Sin actividad aún'
    });
  }

  const player = playerStore.get(id);
  player.displayName = displayName || player.displayName || 'Jugador';
  player.level = levelFromPoints(player.points);
  return player;
}

export function recordInteraction(userId, displayName, { points = 0, event = 'actividad', medals = [] } = {}) {
  const player = getPlayer(userId, displayName);

  player.points += points;
  player.totalParticipaciones += 1;
  player.level = levelFromPoints(player.points);
  player.streak += 1;
  player.ultimoEvento = event;

  for (const medal of medals) {
    if (!player.medals.includes(medal)) {
      player.medals.push(medal);
    }
  }

  if (player.medals.length === 0) {
    player.medals.push(defaultMedals[0]);
  }

  return player;
}

export function getRanking() {
  return [...playerStore.values()]
    .sort((a, b) => b.points - a.points || b.totalParticipaciones - a.totalParticipaciones)
    .map((player, index) => ({ ...player, position: index + 1 }));
}

export function getPlayerStats(userId, displayName = 'Jugador') {
  const player = getPlayer(userId, displayName);
  return {
    ...player,
    level: levelFromPoints(player.points)
  };
}

export function getRandomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}
