import { getRandomItem, recordInteraction, triviaPool } from '../sistema/state.js';

export const command = ['/trivia'];

export async function run(sock, msg, { text, args }) {
  const player = getRandomItem(triviaPool);
  const options = player.options.map((option) => `${option}`).join(' • ');

  const questionText = `🎯 *TRIVIA de la comunidad*\n\n${player.question}\n\nOpciones: ${options}\n\nResponde con una de las opciones para sumar puntos.`;

  await sock.sendMessage(msg.key.remoteJid, { text: questionText }, { quoted: msg });

  const respuesta = args.join(' ') || '';
  if (!respuesta) return;

  const esCorrecta = respuesta.toLowerCase() === player.answer.toLowerCase();

  if (esCorrecta) {
    recordInteraction(msg.key.remoteJid, 'Jugador', {
      points: 30,
      event: 'Trivia correcta',
      medals: ['🏆']
    });

    await sock.sendMessage(msg.key.remoteJid, { text: '✅ Correcto! Ganaste 30 puntos y una medalla 🏆' }, { quoted: msg });
    return;
  }

  await sock.sendMessage(msg.key.remoteJid, { text: `❌ Incorrecto. La respuesta correcta era: *${player.answer}*` }, { quoted: msg });
}
