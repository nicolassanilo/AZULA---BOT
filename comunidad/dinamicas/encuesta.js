import { encuestaPool, getRandomItem, recordInteraction } from '../sistema/state.js';

export const command = ['/encuesta', '/encuesta-grupo'];

export async function run(sock, msg) {
  const pregunta = getRandomItem(encuestaPool);
  recordInteraction(msg.key.remoteJid, 'Jugador', {
    points: 10,
    event: 'Encuesta respondida',
    medals: ['📊']
  });

  await sock.sendMessage(msg.key.remoteJid, {
    text: `📊 *Encuesta de la comunidad*\n\n${pregunta}\n\nResponde con tu opinión y suma 10 puntos.`
  }, { quoted: msg });
}
