import { db } from '../../db.js';
import { obtenerPerfilEquipo, prepararTablasEquipos } from './equipos.js';
import { cargarTodasLasDinamicas } from './dinamicas/index.js';
import { iniciarDinámicaComun, finalizarDinámica } from './dinamicas/base.js';

async function ejecutar(sock, msg, { command, args = [] }) {
  const grupoId = msg?.key?.remoteJid;
  const usuarioId = msg?.key?.participant || grupoId;
  if (!String(grupoId || '').endsWith('@g.us')) {
    await sock.sendMessage(grupoId, { text: 'Las dinámicas solo están disponibles en grupos.' }, { quoted: msg });
    return;
  }

  if (command === '/dinamica-fin') {
    await finalizarDinámica(sock, grupoId, usuarioId);
    return;
  }

  await prepararTablasEquipos();
  const perfil = await obtenerPerfilEquipo(usuarioId);
  if (!perfil || perfil.grupo_id !== grupoId) {
    await sock.sendMessage(grupoId, { text: 'Necesitas un perfil: /crearperfil' }, { quoted: msg });
    return;
  }
  const activas = await db.all(
    'SELECT tipo FROM dinamicas WHERE team_id = ? AND grupo_id = ? AND activo = 1',
    [perfil.team_id, grupoId]
  );
  if (!activas.length) {
    await sock.sendMessage(grupoId, { text: `No hay dinámicas activas para ${perfil.nombre_con_emoji}.` }, { quoted: msg });
    return;
  }

  const dinamicas = await cargarTodasLasDinamicas();
  const configuradas = activas
    .map(({ tipo }) => dinamicas.find((item) =>
      item.id.toLowerCase() === String(tipo).toLowerCase() ||
      item.nombre.toLowerCase() === String(tipo).toLowerCase()
    ))
    .filter(Boolean);
  if (!configuradas.length) {
    await sock.sendMessage(
      grupoId,
      { text: `Las dinámicas activas de ${perfil.nombre_con_emoji} no coinciden con ningún tipo disponible. Consulta /dinamicas lista ${perfil.team_id}.` },
      { quoted: msg }
    );
    return;
  }

  const solicitado = args.join(' ').trim().toLowerCase();
  const seleccionada = solicitado
    ? configuradas.find((item) => item.id.toLowerCase() === solicitado || item.nombre.toLowerCase() === solicitado)
    : configuradas[Math.floor(Math.random() * configuradas.length)];
  if (!seleccionada) {
    await sock.sendMessage(grupoId, { text: 'Ese tipo de dinámica no está activo para tu Team.' }, { quoted: msg });
    return;
  }
  await iniciarDinámicaComun(sock, grupoId, seleccionada, perfil.team_id);
}

const plugin = {
  nombre: 'Dinámicas',
  descripcion: 'Inicia las dinámicas activas para tu Team o detén una dinámica.',
  comandos: ['/dinamica', '/dinamica-fin'],
  command: ['/dinamica', '/dinamica-fin'],
  ejecutar,
  run: ejecutar
};

export default plugin;
export const command = plugin.comandos;
