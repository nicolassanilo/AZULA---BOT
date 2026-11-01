import { db } from '../../db.js';
import { obtenerEquipo, obtenerPerfilEquipo, prepararTablasEquipos } from './equipos.js';

const COMANDOS = ['/crearperfil', '/registrar', '/miperfil', '/perfil'];

async function responder(sock, msg, texto) {
  await sock.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg });
}

function textoMensaje(msg) {
  return (
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    ''
  ).trim();
}

async function ejecutar(sock, msg, context = {}) {
  const grupoId = msg?.key?.remoteJid;
  const usuarioId = msg?.key?.participant || grupoId;
  if (!String(grupoId || '').endsWith('@g.us')) {
    await responder(sock, msg, 'Este comando solo está disponible dentro de un grupo.');
    return;
  }

  await prepararTablasEquipos();
  const texto = textoMensaje(msg);
  const comando = context.command || texto.split(/\s+/, 1)[0].toLowerCase();
  const argumento = texto.replace(/^\/\S+\s*/i, '').trim();

  if (comando === '/crearperfil' || comando === '/registrar') {
    const perfil = await obtenerPerfilEquipo(usuarioId);
    if (perfil) {
      await responder(sock, msg, `Ya tienes un perfil vinculado a ${perfil.nombre_con_emoji}. Usa /miperfil para consultarlo.`);
      return;
    }

    if (!argumento) {
      const equipos = await db.all(
        'SELECT id, nombre_con_emoji FROM equipos WHERE grupo_id = ? AND activo = 1 ORDER BY id',
        [grupoId]
      );
      if (!equipos.length) {
        await responder(sock, msg, 'Primero crea un equipo con /equipos crear...');
        return;
      }
      await responder(
        sock,
        msg,
        `👤 Elige tu Team y ejecuta /crearperfil [id]:\n${equipos.map((team) => `ID ${team.id} · ${team.nombre_con_emoji}`).join('\n')}`
      );
      return;
    }

    if (!/^\d+$/.test(argumento)) {
      await responder(sock, msg, 'Indica el ID numérico del Team. Usa /crearperfil para ver los equipos disponibles.');
      return;
    }
    const team = await obtenerEquipo(argumento, grupoId);
    if (!team) {
      await responder(sock, msg, 'Ese equipo no existe.');
      return;
    }
    await db.run(
      'INSERT INTO perfiles (id_usuario, team_id) VALUES (?, ?)',
      [usuarioId, team.id]
    );
    console.log(`Perfil vinculado a Team ${team.id}`);
    await responder(sock, msg, `✅ Perfil creado y vinculado a ${team.nombre_con_emoji}. Usa /miperfil para ver tus datos.`);
    return;
  }

  const perfil = await obtenerPerfilEquipo(usuarioId);
  if (!perfil) {
    await responder(sock, msg, 'Necesitas un perfil: /crearperfil');
    return;
  }
  const rango = await db.get(
    'SELECT COUNT(*) + 1 AS rango FROM perfiles WHERE puntos_totales > ?',
    [Number(perfil.puntos_totales || 0)]
  );
  const inventario = (() => {
    try {
      const datos = JSON.parse(perfil.inventario || '[]');
      return Array.isArray(datos) ? datos.length : 0;
    } catch (error) {
      console.error(`Inventario inválido del usuario ${usuarioId}:`, error?.message || error);
      return 0;
    }
  })();
  await responder(
    sock,
    msg,
    `👤 Mi perfil\n\n🆔 Usuario: ${msg.pushName || usuarioId}\n👥 Team: ${perfil.nombre_con_emoji}\n🏆 Puntos: ${Number(perfil.puntos_totales || 0).toLocaleString('es-ES')}\n📊 Rango: #${rango.rango}\n🎒 Objetos: ${inventario}\n📅 Creado: ${perfil.creado_en}`
  );
}

export default {
  nombre: 'Perfil',
  descripcion: 'Crea tu perfil vinculado a un Team y consulta puntos y rango.',
  comandos: COMANDOS,
  ejecutar,
  run: ejecutar
};
