// ==========================================================
// SISTEMA DE RANKING CON EQUIPOS
// ==========================================================
// Este módulo gestiona:
// - detección de equipo por emoji en el nombre/apodo
// - puntos individuales por usuario
// - puntos globales por equipo
// - comandos !ranking, !miequipo y !limpiar-ranking
// - persistencia en data/ranking.json
// ==========================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJsonFileSafe, writeJsonFileSafe } from '../archivos-seguros.js';
import { obtenerEquipoUsuario } from './perfiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../../data');
const RUTA_DATOS = path.join(DATA_DIR, 'ranking.json');

const EQUIPOS = {
  '🍥': { nombre: 'Team Naruto', emoji: '🍥', color: '🟧' },
  '🩸': { nombre: 'Team Jujutsu Kaisen', emoji: '🩸', color: '🟥' },
  '🔰': { nombre: 'Team Hunter × Hunter', emoji: '🔰', color: '🟩' }
};

const EQUIPO_KEYS = Object.keys(EQUIPOS);

/**
 * Crea la estructura inicial del archivo JSON si aún no existe.
 */
function crearEstructuraInicial() {
  return {
    usuarios: {},
    equipos: {
      '🍥': 0,
      '🩸': 0,
      '🔰': 0
    },
    ultimaLimpieza: null
  };
}

/**
 * Carga el ranking desde data/ranking.json.
 * Si no existe, crea el archivo automáticamente.
 */
export function cargarRanking() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });

    if (!fs.existsSync(RUTA_DATOS)) {
      const inicial = crearEstructuraInicial();
      writeJsonFileSafe(RUTA_DATOS, inicial);
      return inicial;
    }

    const datos = readJsonFileSafe(RUTA_DATOS, crearEstructuraInicial());

    datos.usuarios = datos.usuarios || {};
    datos.equipos = {
      '🍥': Number(datos.equipos?.['🍥'] || 0),
      '🩸': Number(datos.equipos?.['🩸'] || 0),
      '🔰': Number(datos.equipos?.['🔰'] || 0)
    };
    datos.ultimaLimpieza = datos.ultimaLimpieza || null;

    return datos;
  } catch (error) {
    console.warn('⚠️ Error cargando ranking:', error?.message || error);
    return crearEstructuraInicial();
  }
}

/**
 * Guarda el ranking en disco.
 */
export function guardarRanking(datos) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    writeJsonFileSafe(RUTA_DATOS, datos && typeof datos === 'object' ? datos : crearEstructuraInicial());
  } catch (error) {
    console.warn('⚠️ Error guardando ranking:', error?.message || error);
  }
}

/**
 * Detecta el equipo por emoji en el nombre/apodo del usuario.
 *
 * @param {string} nombreUsuario
 * @returns {{ emoji, nombre, color } | null}
 */
export function detectarEquipo(nombreUsuario) {
  if (!nombreUsuario) return null;

  for (const emoji of EQUIPO_KEYS) {
    if (nombreUsuario.includes(emoji)) {
      return { ...EQUIPOS[emoji] };
    }
  }

  return null;
}

export function obtenerEquipoUsuarioPorPerfil(usuarioId, nombreUsuario = '') {
  return obtenerEquipoUsuario(usuarioId, nombreUsuario);
}

/**
 * Agrega puntos a un usuario y a su equipo global.
 *
 * @param {string} usuarioId
 * @param {string} nombreUsuario
 * @param {number} puntos
 * @returns {{ exito: boolean, mensaje?: string, equipo?: string, emoji?: string, puntosAgregados?: number, totalUsuario?: number, totalEquipo?: number }}
 */
export function agregarPuntos(usuarioId, nombreUsuario, puntos = 900000) {
  try {
    const datos = cargarRanking();
    const equipo = obtenerEquipoUsuarioPorPerfil(usuarioId, nombreUsuario) || detectarEquipo(nombreUsuario);

    if (!equipo) {
      return {
        exito: false,
        mensaje: 'El usuario no tiene perfil registrado ni emoji de equipo en su nombre. Debe usar 🍥, 🩸 o 🔰 o registrarse con /registrar.'
      };
    }

    if (!datos.usuarios[usuarioId]) {
      datos.usuarios[usuarioId] = {
        nombre: nombreUsuario,
        puntos: 0,
        equipo: equipo.emoji
      };
    }

    datos.usuarios[usuarioId].nombre = nombreUsuario;
    datos.usuarios[usuarioId].puntos += puntos;
    datos.usuarios[usuarioId].equipo = equipo.emoji;

    datos.equipos[equipo.emoji] = Number(datos.equipos[equipo.emoji] || 0) + puntos;

    guardarRanking(datos);

    return {
      exito: true,
      equipo: equipo.nombre,
      emoji: equipo.emoji,
      puntosAgregados: puntos,
      totalUsuario: datos.usuarios[usuarioId].puntos,
      totalEquipo: datos.equipos[equipo.emoji]
    };
  } catch (error) {
    console.error('❌ Error agregando puntos:', error);
    return {
      exito: false,
      mensaje: 'Ocurrió un error al guardar los puntos.'
    };
  }
}

/**
 * Formatea números grandes para mostrar en mensajes.
 */
function formatearPuntos(num) {
  return Number(num || 0).toLocaleString('es-AR');
}

/**
 * Obtiene el nombre visible de un usuario dentro del grupo.
 */
async function obtenerNombreVisible(sock, grupoId, usuarioId) {
  try {
    const metadata = await sock.groupMetadata(grupoId);
    const participante = metadata?.participants?.find((p) => p.id === usuarioId);
    return participante?.displayName || participante?.id || usuarioId;
  } catch (error) {
    return usuarioId;
  }
}

/**
 * Devuelve el texto visual del ranking individual y por equipos.
 */
function construirMensajeRanking(datos) {
  const usuarios = Object.entries(datos.usuarios)
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 10);

  const equipos = Object.entries(datos.equipos)
    .map(([emoji, puntos]) => ({
      emoji,
      ...EQUIPOS[emoji],
      puntos
    }))
    .sort((a, b) => b.puntos - a.puntos);

  let mensaje = '🏆 *RANKING GENERAL* 🏆\n\n';

  mensaje += '📊 *Ranking por equipos:*\n';
  equipos.forEach((equipo, index) => {
    const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    mensaje += `${medalla} ${equipo.emoji} *${equipo.nombre}* → ${formatearPuntos(equipo.puntos)} pts\n`;
  });

  mensaje += '\n👤 *Top 10 individual:*\n';

  if (usuarios.length === 0) {
    mensaje += '⚠️ Aún no hay puntuaciones. ¡Hacé misiones para aparecer!\n';
  } else {
    usuarios.forEach((usuario, index) => {
      const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const nombreLimpio = usuario.nombre.replace(/[🍥🩸🔰]/g, '').trim() || 'Usuario';
      mensaje += `${medalla} ${usuario.equipo || '❔'} ${nombreLimpio} → ${formatearPuntos(usuario.puntos)} pts\n`;
    });
  }

  return mensaje;
}

/**
 * Muestra información del equipo del usuario actual.
 */
async function construirMensajeMiEquipo(sock, grupoId, remitente, datos) {
  const nombreVisible = await obtenerNombreVisible(sock, grupoId, remitente);
  const equipo = obtenerEquipoUsuario(remitente, nombreVisible) || detectarEquipo(nombreVisible) || detectarEquipo(datos.usuarios[remitente]?.nombre);

  if (!equipo) {
    return `⚠️ *No tenés equipo asignado*\n\nAgregá uno de estos emoji en tu nombre o apodo del grupo:\n\n🍥 → Team Naruto\n🩸 → Team Jujutsu Kaisen\n🔰 → Team Hunter × Hunter\n\nDespués escribí /miequipo nuevamente.`;
  }

  const puntosUsuario = datos.usuarios[remitente]?.puntos || 0;
  const puntosEquipo = datos.equipos[equipo.emoji] || 0;

  return `${equipo.emoji} *TU EQUIPO:* ${equipo.nombre}\n\n👤 *Tus puntos:* ${formatearPuntos(puntosUsuario)}\n🏅 *Puntos totales del equipo:* ${formatearPuntos(puntosEquipo)}\n\n¡Seguí participando para sumar más! 🚀`;
}

/**
 * Borra todos los puntos del ranking.
 */
function limpiarRanking() {
  const datos = crearEstructuraInicial();
  datos.ultimaLimpieza = new Date().toISOString();
  guardarRanking(datos);
  return datos;
}

/**
 * Activa el sistema de ranking con comandos /ranking, /miequipo y /limpiar-ranking.
 */
export function activarRanking(sock) {
  if (!sock || typeof sock.ev?.on !== 'function') {
    console.error('❌ No se pudo activar el ranking: sock inválido');
    return;
  }

  if (sock.__rankingActivado) {
    return;
  }

  sock.__rankingActivado = true;

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg?.message) return;

      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const textoNormalizado = texto.trim();
      const comando = textoNormalizado.toLowerCase();
      const grupoId = msg.key.remoteJid;
      const remitente = msg.key.participant || msg.key.remoteJid;

      // Comando: /equipos
      if (comando === '/equipos') {
        const payload = `🏆 *EQUIPOS DE LA COMUNIDAD* 🏆\n\n🍥 *Team Naruto*\n- Emoji: 🍥\n- Ideal para quienes buscan aventura, esfuerzo y liderazgo.\n\n🩸 *Team Jujutsu Kaisen*\n- Emoji: 🩸\n- Ideal para quienes destacan por estrategia, presión y energía.\n\n🔰 *Team Hunter × Hunter*\n- Emoji: 🔰\n- Ideal para quienes se distinguen por exploración, constancia y valor.\n\n👉 Para unirte a un equipo, agregá el emoji correspondiente en tu nombre o apodo del grupo.`;

        await sock.sendMessage(grupoId, { text: payload }, { quoted: msg });
        return;
      }

      // Comando: /ranking
      if (comando === '/ranking') {
        const datos = cargarRanking();
        const payload = construirMensajeRanking(datos);

        await sock.sendMessage(grupoId, { text: payload }, { quoted: msg });
        console.log(`🏆 Ranking solicitado por ${remitente} en ${grupoId}`);
        return;
      }

      // Comando: /miequipo
      if (comando === '/miequipo') {
        const datos = cargarRanking();
        const payload = await construirMensajeMiEquipo(sock, grupoId, remitente, datos);

        await sock.sendMessage(grupoId, { text: payload }, { quoted: msg });
        return;
      }

      // Comando: /limpiar-ranking
      if (comando === '/limpiar-ranking') {
        const metadata = await sock.groupMetadata(grupoId);
        const participante = metadata?.participants?.find((p) => p.id === remitente);

        if (!participante || !['admin', 'superadmin'].includes(participante.admin || '')) {
          await sock.sendMessage(grupoId, {
            text: '⛔ Solo los administradores pueden limpiar el ranking.'
          }, { quoted: msg });
          return;
        }

        await sock.sendMessage(grupoId, {
          text: '⚠️ *¿ESTÁS SEGURO?*\n\nEsto borrará todos los puntos individuales y por equipo para empezar una nueva semana.\n\nEscribí *CONFIRMAR* para continuar o cualquier otra cosa para cancelar.'
        }, { quoted: msg });

        // Registrar una respuesta de confirmación temporal.
        const manejadorConfirmacion = async ({ messages: mensajesSeguidas }) => {
          try {
            const respuesta = mensajesSeguidas[0];
            if (!respuesta?.message || respuesta.key.remoteJid !== grupoId) return;

            const textoRespuesta = respuesta.message.conversation || respuesta.message.extendedTextMessage?.text || '';
            const remitenteRespuesta = respuesta.key.participant || respuesta.key.remoteJid;

            if (remitenteRespuesta !== remitente) return;

            if (textoRespuesta.trim().toUpperCase() === 'CONFIRMAR') {
              const datosLimpios = limpiarRanking();
              await sock.sendMessage(grupoId, {
                text: '🧹 *RANKING REINICIADO* 🧹\n\n¡Comenzó una nueva semana de competencia!\n\nTodos los puntos volvieron a 0.\n\n🍥 Team Naruto: 0 pts\n🩸 Team Jujutsu Kaisen: 0 pts\n🔰 Team Hunter × Hunter: 0 pts\n\n¡Que gane el mejor equipo! 🏆'
              }, { quoted: respuesta });
              console.log(`🧹 Ranking limpiado en ${grupoId}`);
            } else {
              await sock.sendMessage(grupoId, {
                text: '✅ Limpieza cancelada. El ranking se mantiene.'
              }, { quoted: respuesta });
            }

            sock.ev.off('messages.upsert', manejadorConfirmacion);
          } catch (error) {
            console.error('❌ Error en confirmación de limpieza de ranking:', error);
          }
        };

        sock.ev.on('messages.upsert', manejadorConfirmacion);

        setTimeout(() => {
          try {
            sock.ev.off('messages.upsert', manejadorConfirmacion);
          } catch (error) {
            console.error('❌ Error limpiando listener temporal:', error);
          }
        }, 30000);

        return;
      }
    } catch (error) {
      console.error('❌ Error manejando comandos del ranking:', error);
    }
  });

  console.log('✅ Sistema de ranking con equipos activado.');
}
