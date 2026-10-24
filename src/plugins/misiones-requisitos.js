// ==========================================
// 📋 SISTEMA DE REQUISITOS — MISIONES SUPPORT
// ==========================================
// Actualizado: 2026-09-10
// Este plugin gestiona los requisitos para acceder a misiones Support,
// la graduación de Genin y la licencia de cazador.

import { obtenerPerfil, guardarPerfil } from '../comunidad/sistema/perfiles.js';
import { agregarPuntos, cargarRanking } from '../comunidad/sistema/ranking.js';

const COSTO_GRADUACION_GENIN = 100000;
const COSTO_LICENCIA_CAZADOR = 100000;

export const command = ['/requisitos', '/graduar-genin', '/obtener-licencia'];

function normalizarUsuarioId(usuarioId = '') {
  return String(usuarioId || '').trim().replace(/^@/, '');
}

function obtenerPuntosUsuario(usuarioId) {
  const ranking = cargarRanking();
  return Number(ranking.usuarios?.[usuarioId]?.puntos || 0);
}

function restarPuntos(usuarioId, nombreUsuario, costo) {
  const perfil = obtenerPerfil(usuarioId) || {};
  const nombreVisible = nombreUsuario || perfil.nombre || usuarioId;

  const resultado = agregarPuntos(usuarioId, nombreVisible, -costo);

  if (!resultado.exito) {
    return {
      exito: false,
      mensaje: resultado.mensaje || '❌ No se pudo actualizar los puntos.'
    };
  }

  return { exito: true };
}

export function puedeAccederMisionesSupport(usuario = {}) {
  const equipo = usuario.equipo || null;
  const rangoNaruto = usuario.rangoEquipoNaruto || 'ninguno';
  const licenciaHunter = Boolean(usuario.licenciaHunter);

  if (equipo === '🍥' && rangoNaruto === 'genin') return true;
  if (equipo === '🔰' && licenciaHunter) return true;

  return false;
}

export async function cmdRequisitos(sock, msg) {
  const grupoId = msg.key.remoteJid;
  const texto = `🥷 𝐄𝐐𝐔𝐈𝐏𝐎 𝐍𝐀𝐑𝐔𝐓𝐎 🍥
🔰 Para hacer misiones → Debes ser GENIN
💰 Costo de Graduación Genin → 100.000 Puntos 🪙
✅ Una vez graduado → ¡Ya puedes aceptar misiones! ⚔️

🗺️ 𝐄𝐐𝐔𝐈𝐏𝐎 𝐇𝐔𝐍𝐓𝐄𝐑 × 𝐇𝐔𝐍𝐓𝐄𝐑 🔰
📜 Para hacer misiones → Debes obtener la LICENCIA DE CAZADOR
💰 Costo de Examen y Licencia → 100.000 Puntos 🪙
✅ Una vez certificado → ¡Ya puedes aceptar misiones! 🎯`;

  await sock.sendMessage(grupoId, { text: texto }, { quoted: msg });
}

export async function cmdGraduarGenin(sock, msg) {
  const grupoId = msg.key.remoteJid;
  const usuarioId = normalizarUsuarioId(msg.key.participant || msg.key.remoteJid);
  const perfil = obtenerPerfil(usuarioId) || {};

  if (perfil.equipo !== '🍥') {
    const equipoActual = perfil.equipo || 'Sin equipo';
    await sock.sendMessage(grupoId, {
      text: `⛔ Solo miembros del 🍥 Equipo Naruto pueden graduarse como Genin.\nTu equipo: ${equipoActual}`
    }, { quoted: msg });
    return;
  }

  if ((perfil.rangoEquipoNaruto || 'ninguno') === 'genin') {
    await sock.sendMessage(grupoId, {
      text: '✅ ¡Ya eres GENIN! Tienes acceso completo a misiones Support ⚔️'
    }, { quoted: msg });
    return;
  }

  const puntosActuales = obtenerPuntosUsuario(usuarioId);

  if (puntosActuales < COSTO_GRADUACION_GENIN) {
    const faltante = COSTO_GRADUACION_GENIN - puntosActuales;
    await sock.sendMessage(grupoId, {
      text: `❌ Puntos insuficientes\n\n💰 Necesitas: ${COSTO_GRADUACION_GENIN.toLocaleString()} pts\n💳 Tienes: ${puntosActuales.toLocaleString()} pts\n📉 Te faltan: ${faltante.toLocaleString()} pts\n\n¡Seguí participando y vuelve pronto! 💪`
    }, { quoted: msg });
    return;
  }

  const resultado = restarPuntos(usuarioId, perfil.nombre || usuarioId, COSTO_GRADUACION_GENIN);
  if (!resultado.exito) {
    await sock.sendMessage(grupoId, { text: resultado.mensaje }, { quoted: msg });
    return;
  }

  guardarPerfil(usuarioId, { rangoEquipoNaruto: 'genin' });

  await sock.sendMessage(grupoId, {
    text: `🎉 ¡GRADUACIÓN COMPLETADA! 🍥⚔️\n\n🔰 Ahora eres oficialmente GENIN 🥷\n💰 Se descontaron: ${COSTO_GRADUACION_GENIN.toLocaleString()} Puntos 🪙\n\n✅ ¡Ya puedes aceptar Misiones Support!\nEscribe /misiones-support para ver las disponibles ✨`
  }, { quoted: msg });
}

export async function cmdObtenerLicencia(sock, msg) {
  const grupoId = msg.key.remoteJid;
  const usuarioId = normalizarUsuarioId(msg.key.participant || msg.key.remoteJid);
  const perfil = obtenerPerfil(usuarioId) || {};

  if (perfil.equipo !== '🔰') {
    const equipoActual = perfil.equipo || 'Sin equipo';
    await sock.sendMessage(grupoId, {
      text: `⛔ Solo miembros del 🔰 Equipo Hunter × Hunter pueden obtener la Licencia de Cazador.\nTu equipo: ${equipoActual}`
    }, { quoted: msg });
    return;
  }

  if (perfil.licenciaHunter === true) {
    await sock.sendMessage(grupoId, {
      text: '✅ ¡Ya tienes tu LICENCIA DE CAZADOR! 🎯\nTienes acceso completo a misiones Support ✨'
    }, { quoted: msg });
    return;
  }

  const puntosActuales = obtenerPuntosUsuario(usuarioId);

  if (puntosActuales < COSTO_LICENCIA_CAZADOR) {
    const faltante = COSTO_LICENCIA_CAZADOR - puntosActuales;
    await sock.sendMessage(grupoId, {
      text: `❌ Puntos insuficientes\n\n💰 Necesitas: ${COSTO_LICENCIA_CAZADOR.toLocaleString()} pts\n💳 Tienes: ${puntosActuales.toLocaleString()} pts\n📉 Te faltan: ${faltante.toLocaleString()} pts\n\n¡Seguí participando y vuelve pronto! 💪`
    }, { quoted: msg });
    return;
  }

  const resultado = restarPuntos(usuarioId, perfil.nombre || usuarioId, COSTO_LICENCIA_CAZADOR);
  if (!resultado.exito) {
    await sock.sendMessage(grupoId, { text: resultado.mensaje }, { quoted: msg });
    return;
  }

  guardarPerfil(usuarioId, { licenciaHunter: true });

  await sock.sendMessage(grupoId, {
    text: `🎉 ¡LICENCIA OBTENIDA! 🔰🎯\n\n📜 Licencia de Cazador certificada ✅\n💰 Se descontaron: ${COSTO_LICENCIA_CAZADOR.toLocaleString()} Puntos 🪙\n\n✅ ¡Ya puedes aceptar Misiones Support!\nEscribe /misiones-support para ver las disponibles ✨`
  }, { quoted: msg });
}

export async function avisoRequisitos(sock, msg) {
  const grupoId = msg.key.remoteJid;

  await sock.sendMessage(grupoId, {
    text: `⚠️ Necesitas cumplir requisitos primero:\n\nEscribe /requisitos para ver lo que necesitas ✨`
  }, { quoted: msg });
}

export async function run(sock, msg, { command, args = [] }) {
  if (command === '/requisitos') {
    await cmdRequisitos(sock, msg);
    return;
  }

  if (command === '/graduar-genin') {
    await cmdGraduarGenin(sock, msg);
    return;
  }

  if (command === '/obtener-licencia') {
    await cmdObtenerLicencia(sock, msg);
  }
}
