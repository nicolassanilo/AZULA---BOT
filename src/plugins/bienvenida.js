import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeJsonFileSafe, readJsonFileSafe } from '../comunidad/archivos-seguros.js';

import {
  MENSAJE_POR_DEFECTO,
  cargarConfiguracionBienvenida,
  guardarConfiguracionBienvenida,
  procesarMensaje,
  agregarCanalOficial,
  esAdministrador,
  enviarMensajeBienvenidaActual
} from '../comunidad/bienvenida.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_CONFIG = path.join(__dirname, '../../data/bienvenida-config.json');

export const command = ['/bienvenida', '/bienvenida-ver', '/bienvenida-restablecer'];

function mensajeNoGrupo() {
  return '⚠️ Este comando solo puede usarse dentro de un grupo.';
}

function crearEstructuraConfig() {
  try {
    fs.mkdirSync(path.dirname(RUTA_CONFIG), { recursive: true });
    if (!fs.existsSync(RUTA_CONFIG)) {
      writeJsonFileSafe(RUTA_CONFIG, {});
    }
  } catch (error) {
    console.warn('⚠️ Error creando archivo de configuración de bienvenida:', error?.message || error);
  }
}

async function enviarHelpBienvenida(sock, msg) {
  const texto = `✨ *Sistema de bienvenida configurable*

Comandos disponibles:
• /bienvenida [mensaje] → Guarda la bienvenida personalizada para este grupo.
• /bienvenida-ver → Muestra la bienvenida actual del grupo.
• /bienvenida-restablecer → Vuelve a usar el mensaje por defecto.

Variables disponibles:
• {usuario} → Menciona al nuevo miembro.
• {grupo} → Nombre del grupo.

Ejemplo:
/bienvenida ¡Bienvenido {usuario}! Gracias por entrar a {grupo}.`;

  await sock.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg });
}

async function guardarBienvenida(sock, msg, texto) {
  const grupoId = msg.key.remoteJid;
  if (!grupoId || !grupoId.endsWith('@g.us')) {
    await sock.sendMessage(grupoId, { text: mensajeNoGrupo() }, { quoted: msg });
    return;
  }

  const remitente = msg.key.participant || msg.key.remoteJid;
  const esAdmin = await esAdministrador(sock, grupoId, remitente);

  if (!esAdmin) {
    await sock.sendMessage(grupoId, {
      text: '⛔ *Solo los administradores pueden cambiar la bienvenida del grupo.*'
    }, { quoted: msg });
    return;
  }

  const mensaje = texto.trim();
  if (!mensaje) {
    await sock.sendMessage(grupoId, {
      text: '⚠️ Escribí el texto después de /bienvenida.\nEjemplo: /bienvenida ¡Hola {usuario}! Bienvenido a {grupo}.'
    }, { quoted: msg });
    return;
  }

  const datos = cargarConfiguracionBienvenida();
  const metadata = await sock.groupMetadata(grupoId);
  const nombreGrupo = metadata?.subject || 'este grupo';

  datos[grupoId] = {
    mensaje,
    editadoPor: remitente,
    fecha: new Date().toISOString()
  };

  guardarConfiguracionBienvenida(datos);

  const vistaPrevia = agregarCanalOficial(
    procesarMensaje(mensaje, 'ejemplo', nombreGrupo)
  );

  await sock.sendMessage(grupoId, {
    text: `✅ *Mensaje de bienvenida actualizado*\n\n👁️ *Vista previa:*\n━━━━━━━━━━━━━━━━━━\n${vistaPrevia}\n━━━━━━━━━━━━━━━━━━\n\n💡 Variables disponibles: {usuario} {grupo}`
  }, { quoted: msg });
}

async function verBienvenida(sock, msg) {
  const grupoId = msg.key.remoteJid;
  if (!grupoId || !grupoId.endsWith('@g.us')) {
    await sock.sendMessage(grupoId, { text: mensajeNoGrupo() }, { quoted: msg });
    return;
  }

  await enviarMensajeBienvenidaActual(sock, grupoId, msg);
}

async function restablecerBienvenida(sock, msg) {
  const grupoId = msg.key.remoteJid;
  if (!grupoId || !grupoId.endsWith('@g.us')) {
    await sock.sendMessage(grupoId, { text: mensajeNoGrupo() }, { quoted: msg });
    return;
  }

  const remitente = msg.key.participant || msg.key.remoteJid;
  const esAdmin = await esAdministrador(sock, grupoId, remitente);

  if (!esAdmin) {
    await sock.sendMessage(grupoId, {
      text: '⛔ *Solo los administradores pueden restablecer la bienvenida del grupo.*'
    }, { quoted: msg });
    return;
  }

  const datos = cargarConfiguracionBienvenida();
  delete datos[grupoId];
  guardarConfiguracionBienvenida(datos);

  await sock.sendMessage(grupoId, {
    text: `🔄 *Bienvenida restablecida*\n\nAhora se usa el mensaje por defecto:\n\n${MENSAJE_POR_DEFECTO}`
  }, { quoted: msg });
}

export async function run(sock, msg, context) {
  crearEstructuraConfig();

  const texto = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();
  const textoNormalizado = texto.toLowerCase();

  if (textoNormalizado === '/bienvenida-ver' || textoNormalizado === '/bienvenida-ver@azula-bot') {
    await verBienvenida(sock, msg);
    return;
  }

  if (textoNormalizado === '/bienvenida-restablecer' || textoNormalizado === '/bienvenida-restablecer@azula-bot') {
    await restablecerBienvenida(sock, msg);
    return;
  }

  if (textoNormalizado === '/bienvenida' || textoNormalizado === '/bienvenida@azula-bot') {
    await enviarHelpBienvenida(sock, msg);
    return;
  }

  const match = texto.match(/^\/bienvenida\s+([\s\S]+)$/i);
  if (match) {
    await guardarBienvenida(sock, msg, match[1]);
    return;
  }

  await enviarHelpBienvenida(sock, msg);
}
