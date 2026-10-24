// ==========================================================
// PLUGIN DE BIENVENIDA PERSONALIZABLE POR GRUPO
// ==========================================================
// Este módulo escucha `group-participants.update` y envía un
// mensaje de bienvenida con foto de perfil del usuario cuando
// esté disponible. Además soporta comandos para editar y ver
// la bienvenida personalizada del grupo.
// ==========================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJsonFileSafe, writeJsonFileSafe } from './archivos-seguros.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_DATOS = path.join(__dirname, '../../data/bienvenida-config.json');
const RUTA_DATOS_LEGACY = path.join(__dirname, '../../data/bienvenida-personalizada.json');

// Mensaje por defecto del bot.
export const MENSAJE_POR_DEFECTO = `✨ ¡BIENVENIDO! ✨

🌸 Azula Bot te da una bienvenida cálida corazón 🌸

Es un placer tenerte aquí. Estoy lista para ayudarte en lo que necesites. ¡Que tengas una experiencia maravillosa en el grupo! 💖`;

const MENSAJE_CANAL_OFICIAL = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📢 *CANAL OFICIAL DEL BOT*
🔗 https://whatsapp.com/channel/0029VbCPO6nKAwEnIfOShY3T
¡Seguí para todas las novedades!`;

/**
 * Carga la configuración persistida de bienvenida.
 * Si no existe el archivo, lo crea con estructura vacía.
 */
export function cargarConfiguracionBienvenida() {
  try {
    fs.mkdirSync(path.dirname(RUTA_DATOS), { recursive: true });

    if (!fs.existsSync(RUTA_DATOS)) {
      if (fs.existsSync(RUTA_DATOS_LEGACY)) {
        try {
          const contenidoLegacy = fs.readFileSync(RUTA_DATOS_LEGACY, 'utf8');
          const datosLegacy = JSON.parse(contenidoLegacy || '{}');
          writeJsonFileSafe(RUTA_DATOS, datosLegacy && typeof datosLegacy === 'object' ? datosLegacy : {});
          return datosLegacy && typeof datosLegacy === 'object' ? datosLegacy : {};
        } catch (error) {
          writeJsonFileSafe(RUTA_DATOS, {});
          return {};
        }
      }

      writeJsonFileSafe(RUTA_DATOS, {});
      return {};
    }

    return readJsonFileSafe(RUTA_DATOS, {});
  } catch (error) {
    console.warn('⚠️ Error cargando configuraciones de bienvenida:', error?.message || error);
    return {};
  }
}

/**
 * Guarda la configuración persistida de bienvenida.
 */
export function guardarConfiguracionBienvenida(datos) {
  try {
    fs.mkdirSync(path.dirname(RUTA_DATOS), { recursive: true });
    writeJsonFileSafe(RUTA_DATOS, datos && typeof datos === 'object' ? datos : {});
  } catch (error) {
    console.warn('⚠️ Error guardando configuraciones de bienvenida:', error?.message || error);
  }
}

/**
 * Obtiene la foto de perfil de un usuario.
 * Si el usuario no tiene foto o falla la consulta, devuelve null.
 */
export async function obtenerFotoPerfil(sock, usuarioId) {
  try {
    const url = await sock.profilePictureUrl(usuarioId, 'image');
    return url || null;
  } catch (error) {
    return null;
  }
}

/**
 * Determina si un usuario es administrador del grupo.
 */
export async function esAdministrador(sock, grupoId, usuarioId) {
  try {
    const metadata = await sock.groupMetadata(grupoId);
    const participante = metadata?.participants?.find((p) => p.id === usuarioId);
    const admin = participante?.admin || '';
    return admin === 'admin' || admin === 'superadmin';
  } catch (error) {
    return false;
  }
}

/**
 * Reemplaza variables del mensaje personalizado.
 */
export function procesarMensaje(plantilla, numeroUsuario, nombreGrupo) {
  return plantilla
    .replace(/\{usuario\}/gi, `@${numeroUsuario}`)
    .replace(/\{grupo\}/gi, nombreGrupo || 'este grupo');
}

/**
 * Agrega automáticamente el canal oficial al final de cualquier
 * mensaje de bienvenida, sin guardarlo en el JSON personalizado.
 */
export function agregarCanalOficial(mensaje) {
  if (!mensaje || mensaje.includes('https://whatsapp.com/channel/0029VbCPO6nKAwEnIfOShY3T')) {
    return mensaje || '';
  }

  const textoLimpio = mensaje.trim();
  return `${textoLimpio}\n\n${MENSAJE_CANAL_OFICIAL}`;
}

/**
 * Muestra el mensaje actual del grupo y si está usando el
 * mensaje por defecto o uno personalizado.
 */
export async function enviarMensajeBienvenidaActual(sock, grupoId, msg) {
  const datos = cargarConfiguracionBienvenida();
  const configuracion = datos[grupoId];
  const metadata = await sock.groupMetadata(grupoId);
  const nombreGrupo = metadata?.subject || 'este grupo';

  let mensaje = `📋 *MENSAJE DE BIENVENIDA ACTUAL*\n\n`;

  if (configuracion?.mensaje) {
    mensaje += `🎨 *Personalizado para este grupo:*\n\n${agregarCanalOficial(configuracion.mensaje)}\n\n━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `💡 Variables disponibles: {usuario} {grupo}`;
  } else {
    mensaje += `⚙️ *Usando mensaje por defecto del bot:*\n\n${agregarCanalOficial(MENSAJE_POR_DEFECTO)}\n\n━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `✏️ Los administradores pueden personalizarlo con: /bienvenida [mensaje]`;
  }

  await sock.sendMessage(grupoId, { text: mensaje }, { quoted: msg });
}

/**
 * Activa el plugin de bienvenida para cualquier grupo donde esté el bot.
 * Escucha el evento `group-participants.update` de Baileys.
 *
 * @param {object} sock - Socket de Baileys
 */
export function activarBienvenida(sock) {
  if (!sock || typeof sock.ev?.on !== 'function') {
    console.error('❌ No se pudo activar bienvenida: sock inválido');
    return;
  }

  // ----------------------------------------------------------
  // 1) Evento: detectar usuarios que entran al grupo
  // ----------------------------------------------------------
  sock.ev.on('group-participants.update', async (actualizacion) => {
    try {
      if (actualizacion.action !== 'add') return;

      const { id, participants = [] } = actualizacion;
      if (!participants.length) return;

      const datos = cargarConfiguracionBienvenida();
      const metadata = await sock.groupMetadata(id);
      const nombreGrupo = metadata?.subject || 'este grupo';
      const plantilla = datos[id]?.mensaje || MENSAJE_POR_DEFECTO;

      for (const usuarioId of participants) {
        const numeroUsuario = usuarioId.replace(/@.+$/, '');
        const mensajeBase = procesarMensaje(plantilla, numeroUsuario, nombreGrupo);
        const mensajeFinal = agregarCanalOficial(mensajeBase);
        const fotoPerfil = await obtenerFotoPerfil(sock, usuarioId);

        if (fotoPerfil) {
          await sock.sendMessage(id, {
            image: { url: fotoPerfil },
            caption: mensajeFinal,
            mentions: [usuarioId]
          });

          console.log(`👋 Bienvenida CON FOTO enviada para ${numeroUsuario} en "${nombreGrupo}"`);
          continue;
        }

        await sock.sendMessage(id, {
          text: mensajeFinal,
          mentions: [usuarioId]
        });

        console.log(`👋 Bienvenida SIN FOTO enviada para ${numeroUsuario} en "${nombreGrupo}" (foto no disponible)`);
      }
    } catch (error) {
      console.error('❌ Error en plugin de bienvenida:', error);
    }
  });

  console.log('✅ Sistema de bienvenida personalizable activado.');
}
