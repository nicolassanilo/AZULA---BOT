import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
const MAX_STICKER_BYTES = 1024 * 1024;

class FormatoNoSoportadoError extends Error {}

function desenvolverMensaje(message) {
  let actual = message;

  while (actual) {
    const anidado =
      actual.ephemeralMessage?.message ||
      actual.viewOnceMessage?.message ||
      actual.viewOnceMessageV2?.message ||
      actual.documentWithCaptionMessage?.message;

    if (!anidado) break;
    actual = anidado;
  }

  return actual || {};
}

function detectarMedia(message) {
  const contenido = desenvolverMensaje(message);

  if (contenido.imageMessage) {
    return { tipo: 'image' };
  }

  if (contenido.videoMessage) {
    const media = contenido.videoMessage;
    if (media.gifPlayback || /(?:image|video)\/gif/i.test(media.mimetype || '')) {
      return { tipo: 'gif' };
    }
    return { tipo: 'unsupported' };
  }

  if (
    contenido.documentMessage ||
    contenido.audioMessage ||
    contenido.stickerMessage
  ) {
    return { tipo: 'unsupported' };
  }

  return null;
}

function obtenerContextInfo(message) {
  const contenido = desenvolverMensaje(message);
  return Object.values(contenido).find((valor) => valor?.contextInfo)?.contextInfo;
}

function obtenerMensajeMedia(msg, contextInfo) {
  if (!contextInfo?.quotedMessage) {
    return msg;
  }

  return {
    key: {
      remoteJid: msg.key.remoteJid,
      participant: contextInfo.participant || msg.key.participant,
      id: contextInfo.stanzaId
    },
    message: contextInfo.quotedMessage
  };
}

function obtenerDatosMedia(message) {
  const contenido = desenvolverMensaje(message);
  if (contenido.imageMessage) {
    return { media: contenido.imageMessage, tipo: 'image' };
  }
  if (contenido.videoMessage) {
    return { media: contenido.videoMessage, tipo: 'video' };
  }
  return null;
}

async function descargarMedia(message) {
  const buffer = await downloadMediaMessage(message, 'buffer');
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new FormatoNoSoportadoError('El archivo multimedia está vacío.');
  }
  if (buffer.length > MAX_MEDIA_BYTES) {
    throw new FormatoNoSoportadoError('La imagen supera el límite de 20 MB.');
  }
  return buffer;
}

async function extraerFotogramaGif(buffer, mimetype) {
  const carpetaTemporal = await mkdtemp(path.join(os.tmpdir(), 'azula-sticker-'));
  const extension = /gif/i.test(mimetype || '') ? 'gif' : 'mp4';
  const entrada = path.join(carpetaTemporal, `entrada.${extension}`);
  const salida = path.join(carpetaTemporal, 'fotograma.png');

  try {
    await writeFile(entrada, buffer);
    await execFileAsync(
      process.env.FFMPEG_PATH || 'ffmpeg',
      [
        '-hide_banner',
        '-loglevel', 'error',
        '-y',
        '-i', entrada,
        '-frames:v', '1',
        salida
      ],
      { timeout: 30000, maxBuffer: 1024 * 1024 }
    );
    return await readFile(salida);
  } finally {
    await rm(carpetaTemporal, { recursive: true, force: true });
  }
}

async function quitarFondo(buffer) {
  let modulo;
  try {
    modulo = await import('@imgly/background-removal-node');
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        'La opción eliminar-fondo requiere instalar @imgly/background-removal-node.'
      );
    }
    throw error;
  }

  const imagen = await modulo.removeBackground(buffer);
  return Buffer.from(await imagen.arrayBuffer());
}

async function procesarImagen(buffer, estilo) {
  const imagenBase = estilo === 'eliminar-fondo'
    ? await quitarFondo(buffer)
    : buffer;
  const imagen = sharp(imagenBase).rotate();
  let procesada;

  if (estilo === 'círculo') {
    const mascara = Buffer.from(
      '<svg width="512" height="512" viewBox="0 0 512 512"><circle cx="256" cy="256" r="256" fill="white"/></svg>'
    );
    procesada = imagen
      .resize(512, 512, { fit: 'cover' })
      .composite([{ input: mascara, blend: 'dest-in' }]);
  } else if (estilo === 'cuadrado') {
    procesada = imagen.resize(512, 512, { fit: 'cover' });
  } else {
    procesada = imagen.resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    });
  }

  for (const quality of [80, 65, 50]) {
    const sticker = await procesada.clone().webp({ quality }).toBuffer();
    if (sticker.length <= MAX_STICKER_BYTES) return sticker;
  }

  throw new FormatoNoSoportadoError(
    'La imagen no se puede reducir al tamaño máximo de un sticker.'
  );
}

function obtenerTextoComando(msg, context) {
  return (
    context?.args?.join(' ') ||
    context?.text ||
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  ).trim();
}

function detectarEstilo(texto) {
  const opcion = texto
    .replace(/^\/(?:sticker|s)\b/i, '')
    .trim()
    .toLowerCase()
    .normalize('NFC');

  if (!opcion) return 'normal';
  if (['círculo', 'circulo'].includes(opcion)) return 'círculo';
  if (opcion === 'cuadrado') return 'cuadrado';
  if (['eliminar-fondo', 'eliminar fondo'].includes(opcion)) {
    return 'eliminar-fondo';
  }
  throw new FormatoNoSoportadoError(
    'Opción no válida. Usa círculo, cuadrado o eliminar-fondo.'
  );
}

async function enviarTexto(sock, msg, texto) {
  const chatId = msg.key?.remoteJid;
  if (!chatId) {
    throw new Error('El mensaje no contiene remoteJid.');
  }
  await sock.sendMessage(chatId, { text: texto }, { quoted: msg });
}

const plugin = {
  nombre: 'Stickers',
  descripcion: 'Crea stickers desde imágenes y GIFs.',
  comandos: ['/sticker', '/s'],
  activo: true,

  async ejecutar(sock, msg, context = {}) {
    const chatId = msg.key?.remoteJid;

    try {
      if (!chatId) {
        throw new Error('El mensaje no contiene remoteJid.');
      }

      const estilo = detectarEstilo(obtenerTextoComando(msg, context));
      const mediaActual = detectarMedia(msg.message);
      const contextInfo = obtenerContextInfo(msg.message);
      const mediaRespondida = contextInfo?.quotedMessage
        ? detectarMedia(contextInfo.quotedMessage)
        : null;
      const esMediaActual = Boolean(mediaActual);
      const mediaDetectada = mediaActual || mediaRespondida;

      if (!mediaDetectada) {
        await enviarTexto(
          sock,
          msg,
          '⚠️ No detecté ninguna imagen.\nResponde a una imagen con /sticker o /s, o envía una imagen con el texto /sticker.'
        );
        return;
      }

      if (mediaDetectada.tipo === 'unsupported') {
        await enviarTexto(sock, msg, '❌ Formato no soportado. Envía una imagen o un GIF.');
        return;
      }

      const mensajeMedia = esMediaActual
        ? msg
        : obtenerMensajeMedia(msg, contextInfo);
      const datosMedia = obtenerDatosMedia(mensajeMedia.message);
      if (!datosMedia) {
        await enviarTexto(sock, msg, '❌ Formato no soportado. Envía una imagen o un GIF.');
        return;
      }

      let buffer = await descargarMedia(mensajeMedia);
      let esGif = mediaDetectada.tipo === 'gif' ||
        /image\/gif/i.test(datosMedia.media.mimetype || '');

      if (esGif && datosMedia.tipo === 'video') {
        buffer = await extraerFotogramaGif(buffer, datosMedia.media.mimetype);
      }

      const mimetype = datosMedia.media.mimetype || '';
      if (
        datosMedia.tipo !== 'video' &&
        mimetype &&
        !/^image\/(?:jpeg|png|webp|gif|avif|tiff|heic|heif)$/i.test(mimetype)
      ) {
        throw new FormatoNoSoportadoError(`Formato de imagen no soportado: ${mimetype}`);
      }

      const sticker = await procesarImagen(buffer, estilo);
      await sock.sendMessage(chatId, { sticker }, { quoted: msg });
      console.log(
        `✅ Sticker creado | chat=${chatId} | estilo=${estilo} | gif=${esGif} | bytes=${sticker.length}`
      );

      if (esGif) {
        await enviarTexto(
          sock,
          msg,
          '✅ Sticker creado\n⚠️ El GIF se convirtió a un sticker estático (primer fotograma).'
        );
      } else {
        await enviarTexto(sock, msg, '✅ Sticker creado');
      }
    } catch (error) {
      if (error instanceof FormatoNoSoportadoError) {
        console.warn(`⚠️ No se pudo crear el sticker en ${chatId || 'chat desconocido'}: ${error.message}`);
        await enviarTexto(sock, msg, `❌ Formato no soportado. ${error.message}`);
        return;
      }

      console.error(`❌ Error creando sticker en ${chatId || 'chat desconocido'}:`, error);
      const mensaje = error?.message?.includes('ffmpeg')
        ? '❌ No se pudo procesar el GIF. Instala ffmpeg y verifica que esté en PATH.'
        : error?.message?.includes('@imgly/background-removal-node')
          ? `❌ ${error.message}`
          : '❌ No se pudo crear el sticker. Revisa los logs del bot e inténtalo de nuevo.';
      await enviarTexto(sock, msg, mensaje);
    }
  }
};

export default plugin;
