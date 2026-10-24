import { getRandomItem, misionPool, recordInteraction } from '../sistema/state.js';

export const command = ['/mision', '/misiones'];

export async function run(sock, msg) {
  const mision = getRandomItem(misionPool);
  recordInteraction(msg.key.remoteJid, 'Jugador', {
    points: mision.reward,
    event: `Misión: ${mision.title}`,
    medals: ['🎖️']
  });

  await sock.sendMessage(msg.key.remoteJid, {
    text: `🚀 *Misión de la comunidad*\n\n${mision.title}\n${mision.description}\n\nRecompensa: ${mision.reward} puntos`
  }, { quoted: msg });
}
