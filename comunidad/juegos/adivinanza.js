import { adivinanzaPool, recordInteraction } from '../sistema/state.js';

export const command = ['/adivinanza', '/adivina'];

export async function run(sock, msg, { text, args }) {
  const adivinanza = adivinanzaPool[Math.floor(Math.random() * adivinanzaPool.length)];
  const respuesta = (args.join(' ') || '').trim();

  if (!respuesta) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: `🧠 *Adivinanza*\n\n${adivinanza.title}\n${adivinanza.clue}\n\nEscribe tu respuesta.`
    }, { quoted: msg });
    return;
  }

  const correcta = respuesta.toLowerCase() === adivinanza.answer.toLowerCase();

  if (correcta) {
    recordInteraction(msg.key.remoteJid, 'Jugador', {
      points: 20,
      event: 'Adivinanza correcta',
      medals: ['🎯']
    });

    await sock.sendMessage(msg.key.remoteJid, { text: '✅ ¡Correcto! Ganaste 20 puntos 🎯' }, { quoted: msg });
    return;
  }

  await sock.sendMessage(msg.key.remoteJid, { text: `❌ No es esa. La respuesta correcta era: *${adivinanza.answer}*` }, { quoted: msg });
}
