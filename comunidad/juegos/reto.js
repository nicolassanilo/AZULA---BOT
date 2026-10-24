import { getRandomItem, recordInteraction, retoPool } from '../sistema/state.js';

export const command = ['/reto'];

export async function run(sock, msg) {
  const reto = getRandomItem(retoPool);
  recordInteraction(msg.key.remoteJid, 'Jugador', {
    points: 15,
    event: 'Reto completado',
    medals: ['🚀']
  });

  await sock.sendMessage(msg.key.remoteJid, { text: `🎮 *Reto del día*\n\n${reto}\n\nCompleta el reto y suma 15 puntos.` }, { quoted: msg });
}
