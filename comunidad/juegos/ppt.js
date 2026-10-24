export const command = ['/ppt', '/piedrapapeltijera'];

export async function run(sock, msg, { text, args }) {
  const opciones = ['piedra', 'papel', 'tijera'];
  const eleccionBot = opciones[Math.floor(Math.random() * opciones.length)];
  const eleccionUsuario = (args.join(' ') || '').toLowerCase().trim();

  if (!opciones.includes(eleccionUsuario)) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: `✊📄✂️ *Piedra, Papel o Tijera*\n\nUsá: /ppt piedra | papel | tijera`
    }, { quoted: msg });
    return;
  }

  let resultado = 'Empate';
  if (
    (eleccionUsuario === 'piedra' && eleccionBot === 'tijera') ||
    (eleccionUsuario === 'papel' && eleccionBot === 'piedra') ||
    (eleccionUsuario === 'tijera' && eleccionBot === 'papel')
  ) {
    resultado = '¡Ganaste!';
  } else if (eleccionUsuario !== eleccionBot) {
    resultado = 'Perdiste';
  }

  await sock.sendMessage(msg.key.remoteJid, {
    text: `✊📄✂️ *Piedra, Papel o Tijera*\n\nTu elección: *${eleccionUsuario}*\nBot: *${eleccionBot}*\nResultado: *${resultado}*`
  }, { quoted: msg });
}
