// ==========================================
// 📋 PLUGIN: MISIONES & RECOMPENSAS — SUPPORT
// ==========================================
// Actualizado: 2026-09-10
// Este plugin gestiona el listado de misiones, el registro de completadas,
// la validación de equipos exclusivos y el envío de recibos automáticos.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJsonFileSafe, writeJsonFileSafe } from '../comunidad/archivos-seguros.js';

import { cargarRanking, guardarRanking } from '../comunidad/sistema/ranking.js';
import { obtenerEquipoUsuario, obtenerPerfil } from '../comunidad/sistema/perfiles.js';
import { puedeAccederMisionesSupport, avisoRequisitos } from './misiones-requisitos.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const RUTA_MISIONES_COMPLETADAS = path.join(DATA_DIR, 'misiones-support.json');

const EQUIPOS_MAP = {
  naruto: '🍥',
  hunter: '🔰',
  jujutsu: '🩸'
};

export const LISTA_SUPPORT = [
  {
    id: 'sup_naruto',
    nombre: 'Misiones Shinobis',
    descripcion: 'Cumplir la misión',
    categoria: 'equipo',
    equipoAsignado: 'naruto',
    puntos: 1500000,
    emoji: '🍥',
    etiqueta: 'Equipo Naruto'
  },
  {
    id: 'sup_hunter',
    nombre: 'Misiones Cazadores',
    descripcion: 'Cumplir la misión',
    categoria: 'equipo',
    equipoAsignado: 'hunter',
    puntos: 1500000,
    emoji: '🔰',
    etiqueta: 'Equipo Hunter × Hunter'
  },
  {
    id: 'sup_jujutsu',
    nombre: 'Misiones de Exorcismo',
    descripcion: 'Cumplir la misión',
    categoria: 'equipo',
    equipoAsignado: 'jujutsu',
    puntos: 1500000,
    emoji: '🩸',
    etiqueta: 'Equipo Jujutsu Kaisen'
  },
  {
    id: 'sup_catastrofe',
    nombre: 'Catástrofes',
    descripcion: 'Resolver crisis y amenazas graves',
    categoria: 'catastrofe',
    equipoAsignado: null,
    puntos: 4000000,
    emoji: '🌋',
    etiqueta: 'Todos los equipos'
  },
  {
    id: 'sup_jefe_poderoso',
    nombre: 'Jefes Poderosos',
    descripcion: 'Derrotar enemigos formidables',
    categoria: 'jefe',
    equipoAsignado: null,
    puntos: 10000000,
    emoji: '👹',
    etiqueta: 'Todos los equipos'
  },
  {
    id: 'sup_jefe_diminuto',
    nombre: 'Jefes Diminutos / Menores',
    descripcion: 'Derrotar amenazas pequeñas pero numerosas',
    categoria: 'diminuto',
    equipoAsignado: null,
    puntos: 100000,
    emoji: '👾',
    etiqueta: 'Todos los equipos'
  },
  {
    id: 'sup_mazmorra',
    nombre: 'Mazmorras',
    descripcion: 'Explorar, limpiar y superar niveles',
    categoria: 'mazmorra',
    equipoAsignado: null,
    puntos: 50000,
    emoji: '🏗️',
    etiqueta: 'Todos los equipos'
  },
  {
    id: 'sup_taberna',
    nombre: 'Trabajo en Taberna',
    descripcion: 'Tareas, recados y misiones de apoyo',
    categoria: 'taberna',
    equipoAsignado: null,
    puntos: 30000,
    emoji: '🍺',
    etiqueta: 'Todos los equipos'
  },
  {
    id: 'sup_dios',
    nombre: 'DERROTAR A UN DIOS',
    descripcion: 'El desafío supremo',
    categoria: 'supremo',
    equipoAsignado: null,
    puntos: 100000000,
    emoji: '👑',
    etiqueta: 'Todos los equipos'
  }
];

function normalizarUsuarioId(usuarioId = '') {
  return String(usuarioId || '').trim().replace(/^@/, '');
}

function asegurarArchivoMisiones() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });

    if (!fs.existsSync(RUTA_MISIONES_COMPLETADAS)) {
      writeJsonFileSafe(RUTA_MISIONES_COMPLETADAS, {});
    }
  } catch (error) {
    console.warn('⚠️ Error asegurando archivo de misiones completadas:', error?.message || error);
  }
}

function cargarMisionesCompletadasData() {
  try {
    asegurarArchivoMisiones();
    const datos = readJsonFileSafe(RUTA_MISIONES_COMPLETADAS, {});
    return datos && typeof datos === 'object' ? datos : {};
  } catch (error) {
    console.warn('⚠️ Error cargando misiones completadas:', error?.message || error);
    return {};
  }
}

function guardarMisionesCompletadasData(datos) {
  try {
    asegurarArchivoMisiones();
    writeJsonFileSafe(RUTA_MISIONES_COMPLETADAS, datos && typeof datos === 'object' ? datos : {});
  } catch (error) {
    console.warn('⚠️ Error guardando misiones completadas:', error?.message || error);
  }
}

function formatearCategoria(categoria) {
  const mapa = {
    equipo: 'Equipo',
    catastrofe: 'Catástrofe',
    jefe: 'Jefe',
    diminuto: 'Diminuto',
    mazmorra: 'Mazmorra',
    taberna: 'Taberna',
    supremo: 'Desafío Supremo'
  };

  return mapa[categoria] || 'General';
}

function obtenerMiembroDisplay(usuarioId) {
  const limpio = normalizarUsuarioId(usuarioId).replace(/@s\.whatsapp\.net$/i, '');
  return limpio ? `@${limpio}` : '@Usuario';
}

function obtenerEquipoDelUsuario(usuarioId) {
  const equipo = obtenerEquipoUsuario(normalizarUsuarioId(usuarioId));
  return equipo || null;
}

function obtenerEmojisEquipoPorNombre(nombreEquipo) {
  const equipoNormalizado = String(nombreEquipo || '').trim().toLowerCase();
  return EQUIPOS_MAP[equipoNormalizado] || null;
}

function obtenerEstadoMision(mision, completadasIds, equipoUsuario) {
  if (completadasIds.includes(mision.id)) {
    return '✅ Ya completada';
  }

  if (mision.equipoAsignado) {
    const emojiPermitido = obtenerEmojisEquipoPorNombre(mision.equipoAsignado);

    if (equipoUsuario?.emoji === emojiPermitido) {
      return '⏳ Disponible';
    }

    return `🔒 Solo para ${mision.etiqueta}`;
  }

  return '⏳ Disponible';
}

export async function obtenerMisionesCompletadas(usuarioId) {
  const usuarioNormalizado = normalizarUsuarioId(usuarioId);
  const datos = cargarMisionesCompletadasData();
  const registros = datos[usuarioNormalizado];

  if (!Array.isArray(registros)) {
    return [];
  }

  return registros;
}

export async function yaCompletado(usuarioId, idMision) {
  const completadas = await obtenerMisionesCompletadas(usuarioId);
  return completadas.some((mision) => String(mision.idMision) === String(idMision));
}

export async function registrarMision(usuarioId, idMision) {
  const usuarioNormalizado = normalizarUsuarioId(usuarioId);
  const mision = LISTA_SUPPORT.find((item) => item.id === idMision);

  if (!mision) {
    return {
      exito: false,
      codigo: 'INVALIDA',
      mensaje: '⛔ ID de misión no válida. Revisá con /misiones-support.'
    };
  }

  const yaRegistrada = await yaCompletado(usuarioNormalizado, idMision);
  if (yaRegistrada) {
    return {
      exito: false,
      codigo: 'YA_COMPLETADA',
      mensaje: '✅ Ya registraste esta misión. Los puntos ya fueron acreditados.'
    };
  }

  const equipoUsuario = obtenerEquipoDelUsuario(usuarioNormalizado);

  if (mision.equipoAsignado) {
    const emojiPermitido = obtenerEmojisEquipoPorNombre(mision.equipoAsignado);

    if (!equipoUsuario || equipoUsuario.emoji !== emojiPermitido) {
      return {
        exito: false,
        codigo: 'EQUIPO_NO_PERMITIDO',
        mensaje: `🔒 Esta misión es exclusiva del equipo ${mision.etiqueta}. No puedes completarla.`
      };
    }
  }

  const datos = cargarMisionesCompletadasData();
  const listaActual = Array.isArray(datos[usuarioNormalizado]) ? datos[usuarioNormalizado] : [];

  const ranking = cargarRanking();
  const saldoAnterior = Number(ranking.usuarios?.[usuarioNormalizado]?.puntos || 0);
  const nuevoSaldo = saldoAnterior + Number(mision.puntos || 0);

  ranking.usuarios[usuarioNormalizado] = {
    ...(ranking.usuarios?.[usuarioNormalizado] || {}),
    puntos: nuevoSaldo,
    equipo: equipoUsuario?.emoji || ranking.usuarios?.[usuarioNormalizado]?.equipo || '❔'
  };

  guardarRanking(ranking);

  listaActual.push({
    idMision: mision.id,
    fecha: new Date().toISOString().slice(0, 10),
    puntosOtorgados: Number(mision.puntos || 0)
  });

  datos[usuarioNormalizado] = listaActual;
  guardarMisionesCompletadasData(datos);

  return {
    exito: true,
    codigo: 'OK',
    mision,
    saldoAnterior,
    saldoActual: nuevoSaldo,
    usuarioNormalizado
  };
}

async function enviarMensaje(sock, grupoId, texto, msg = null) {
  const opciones = msg ? { quoted: msg } : {};
  await sock.sendMessage(grupoId, { text: texto }, opciones);
}

async function manejarMisiones(sock, msg) {
  const grupoId = msg.key.remoteJid;
  const remitente = normalizarUsuarioId(msg.key.participant || msg.key.remoteJid);
  const completadas = await obtenerMisionesCompletadas(remitente);
  const idsCompletadas = completadas.map((mision) => mision.idMision);
  const equipoUsuario = obtenerEquipoDelUsuario(remitente);

  let mensaje = `📋 𝐌𝐈𝐒𝐈𝐎𝐍𝐄𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━ 📋 𝐌𝐈𝐒𝐈𝐎𝐍𝐄𝐒 𝐃𝐄 𝐄𝐐𝐔𝐈𝐏𝐎 (YA GRADUADOS) ━━━━━
`;

  for (const mision of LISTA_SUPPORT.filter((item) => item.categoria === 'equipo')) {
    const estado = obtenerEstadoMision(mision, idsCompletadas, equipoUsuario);
    mensaje += `
${estado.includes('✅') ? '✅' : estado.includes('🔒') ? '🔒' : '⏳'} ${mision.emoji} ${mision.nombre} → +${mision.puntos.toLocaleString('es-AR')} Puntos 🪙 ${estado === '✅ Ya completada' ? '✅' : ''}`;
  }

  mensaje += `

━━━━━ 🌋 𝐂𝐀𝐓𝐀́𝐒𝐓𝐑𝐎𝐅𝐄𝐒 𝐘 𝐃𝐄𝐒𝐀𝐅𝐈𝐎𝐒 𝐆𝐑𝐀𝐍𝐃𝐄𝐒 ━━━━━
`;

  for (const mision of LISTA_SUPPORT.filter((item) => item.categoria !== 'equipo')) {
    const estado = obtenerEstadoMision(mision, idsCompletadas, equipoUsuario);
    mensaje += `
${estado.includes('✅') ? '✅' : estado.includes('🔒') ? '🔒' : '⏳'} ${mision.emoji} ${mision.nombre} → +${mision.puntos.toLocaleString('es-AR')} Puntos ${mision.categoria === 'supremo' ? '👑🏆💎💥' : mision.emoji === '👹' ? '🏆👑' : mision.emoji === '🌋' ? '🪙🪙' : '🪙'}`;
  }

  await enviarMensaje(sock, grupoId, mensaje, msg);
}

async function manejarCompletar(sock, msg, args) {
  const grupoId = msg.key.remoteJid;
  const remitente = normalizarUsuarioId(msg.key.participant || msg.key.remoteJid);
  const idMision = String(args[0] || '').trim();

  if (!idMision) {
    await enviarMensaje(sock, grupoId, '📝 Uso correcto: /completar-support [ID]\nRevisá los IDs disponibles con /misiones-support.', msg);
    return;
  }

  const resultado = await registrarMision(remitente, idMision);

  if (!resultado.exito) {
    await enviarMensaje(sock, grupoId, resultado.mensaje, msg);
    return;
  }

  const fecha = new Date().toISOString().slice(0, 10);
  const miembro = obtenerMiembroDisplay(remitente);

  const recibo = `🧾 RECIBO · MISIÓN SUPPORT ✅
╭─────────────────────────────────────╮
📋 Tipo: ${resultado.mision.nombre}
🏷️ Categoría: ${formatearCategoria(resultado.mision.categoria)}
👤 Miembro: ${miembro}
📅 Fecha: ${fecha}
╰─────────────────────────────────────╯

💸 Puntos ganados: +${resultado.mision.puntos.toLocaleString('es-AR')} 🪙
📊 Saldo anterior: ${resultado.saldoAnterior.toLocaleString('es-AR')} pts
🟢 Saldo actual: ${resultado.saldoActual.toLocaleString('es-AR')} pts

╭─────────────────────────────────────╯
 💪 ¡Excelente trabajo! Seguí participando ✨
╰─────────────────────────────────────`;

  await enviarMensaje(sock, grupoId, recibo, msg);
}

export const command = ['/misiones-support', '/completar-support'];

export async function run(sock, msg, { command, args = [] }) {
  if (command === '/misiones-support') {
    const remitente = normalizarUsuarioId(msg.key.participant || msg.key.remoteJid);
    const perfil = obtenerPerfil(remitente) || {};

    if (!puedeAccederMisionesSupport(perfil)) {
      await avisoRequisitos(sock, msg);
      return;
    }

    await manejarMisiones(sock, msg);
    return;
  }

  if (command === '/completar-support') {
    const remitente = normalizarUsuarioId(msg.key.participant || msg.key.remoteJid);
    const perfil = obtenerPerfil(remitente) || {};

    if (!puedeAccederMisionesSupport(perfil)) {
      await avisoRequisitos(sock, msg);
      return;
    }

    await manejarCompletar(sock, msg, args);
  }
}
