import { getRanking, getPlayerStats } from '../sistema/state.js';

export const command = ['/ranking', '/rank'];

export async function run(sock, msg, { args }) {
  const ranking = getRanking();
  const targetUser = args.join(' ') || msg.key.remoteJid;

  if (ranking.length === 0) {
    await sock.sendMessage(msg.key.remoteJid, { text: '📊 Aún no hay participantes en el ranking.' }, { quoted: msg });
    return;
  }

  const top = ranking.slice(0, 5);
  const rankingText = top
    .map((player) => `#${player.position} ${player.displayName} — ${player.points} pts • Nivel ${player.level}`)
    .join('\n');

  const stats = getPlayerStats(targetUser, 'Jugador');

  await sock.sendMessage(msg.key.remoteJid, {
    text: `🏆 *Ranking de la comunidad*\n\n${rankingText}\n\n📌 Tu estado:\nUsuario: ${stats.displayName}\nPuntos: ${stats.points}\nNivel: ${stats.level}\nRacha: ${stats.streak}\nMedallas: ${stats.medals.join(' ') || 'Sin medallas aún'}`
  }, { quoted: msg });
}
