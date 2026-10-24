export const command = ['/dados'];

export async function run(sock, msg) {
  const valor = Math.floor(Math.random() * 6) + 1;
  await sock.sendMessage(msg.key.remoteJid, {
    text: `🎲 *Resultado de los dados*\n\nSaliste con: *${valor}*`
  }, { quoted: msg });
}
