import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import ytdl from 'ytdl-core';

const AVISO_DERECHOS =
  '⚠️ Solo usar con contenido de tu propiedad o con licencia libre, está prohibido descargar música protegida por derechos de autor';
const MAX_AUDIO_BYTES = Math.floor(7.5 * 1024 * 1024);
const MAX_DURATION_SECONDS = 8 * 60;
const BITRATE = '96k';

class ArchivoMuyGrandeError extends Error {}
class ConversionError extends Error {}

function validarUrl(valor) {
  let url;
  try {
    url = new URL(valor);
  } catch {
    return false;
  }

  const dominiosPermitidos = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtu.be'
  ]);
  return (
    ['http:', 'https:'].includes(url.protocol) &&
    !url.username &&
    !url.password &&
    dominiosPermitidos.has(url.hostname.toLowerCase()) &&
    ytdl.validateURL(url.href)
  );
}

function esperarFfmpeg(proceso) {
  return new Promise((resolve, reject) => {
    let stderr = '';
    proceso.stderr.setEncoding('utf8');
    proceso.stderr.on('data', (fragmento) => {
      if (stderr.length < 8192) stderr += fragmento.slice(0, 8192 - stderr.length);
    });
    proceso.once('error', reject);
    proceso.once('close', (codigo, senal) => {
      if (codigo === 0) {
        resolve();
      } else {
        reject(
          new ConversionError(
            stderr.trim() || `ffmpeg terminó con código ${codigo ?? 'desconocido'}${senal ? ` (${senal})` : ''}.`
          )
        );
      }
    });
  });
}

async function convertirAudio(info, archivo) {
  const fuente = ytdl.downloadFromInfo(info, {
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 20
  });
  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
      '-vn',
      '-t',
      String(MAX_DURATION_SECONDS),
      '-codec:a',
      'libmp3lame',
      '-b:a',
      BITRATE,
      '-f',
      'mp3',
      'pipe:1'
    ],
    { stdio: ['pipe', 'pipe', 'pipe'] }
  );
  const salidaFfmpeg = esperarFfmpeg(ffmpeg);
  let bytesEscritos = 0;
  const limitarTamano = new Transform({
    transform(fragmento, _codificacion, callback) {
      if (bytesEscritos + fragmento.length > MAX_AUDIO_BYTES) {
        callback(new ArchivoMuyGrandeError('El audio convertido supera 7,5 MiB.'));
        return;
      }
      bytesEscritos += fragmento.length;
      callback(null, fragmento);
    }
  });

  try {
    await Promise.all([
      pipeline(fuente, ffmpeg.stdin),
      pipeline(ffmpeg.stdout, limitarTamano, createWriteStream(archivo, { flags: 'wx' })),
      salidaFfmpeg
    ]);
  } catch (error) {
    fuente.destroy();
    ffmpeg.stdin.destroy();
    ffmpeg.stdout.destroy();
    if (ffmpeg.exitCode === null) ffmpeg.kill();
    throw error;
  }
}

async function enviarTexto(sock, chatId, msg, texto) {
  await sock.sendMessage(chatId, { text: texto }, { quoted: msg });
}

const plugin = {
  nombre: 'Música',
  descripcion: 'Descarga audio de un enlace de YouTube para contenido propio o con licencia libre.',
  comandos: ['/musica'],
  activo: true,

  async ejecutar(sock, msg, context = {}) {
    const chatId = msg.key?.remoteJid;
    if (!chatId) {
      console.error('❌ No se puede ejecutar /musica: falta mensaje.key.remoteJid.');
      return;
    }

    const entrada = String(context.text || '').trim();
    if (/^ayuda$/i.test(entrada)) {
      await enviarTexto(
        sock,
        chatId,
        msg,
        `🎵 Uso: /musica [URL de YouTube]\nEjemplo: /musica https://www.youtube.com/watch?v=...\nDuración máxima: ${MAX_DURATION_SECONDS / 60} minutos. Tamaño máximo: 7,5 MiB.\n\n${AVISO_DERECHOS}`
      );
      return;
    }

    if (!validarUrl(entrada)) {
      await enviarTexto(
        sock,
        chatId,
        msg,
        `❌ URL inválida. Envía un enlace válido de YouTube.\nUsa /musica ayuda para ver las instrucciones.\n\n${AVISO_DERECHOS}`
      );
      return;
    }

    let directorioTemporal;
    try {
      const info = await ytdl.getInfo(entrada);
      const duracion = Number(info.videoDetails.lengthSeconds);
      if (!Number.isFinite(duracion) || duracion <= 0) {
        await enviarTexto(sock, chatId, msg, '❌ No se pudo determinar la duración del audio.');
        return;
      }
      if (duracion > MAX_DURATION_SECONDS) {
        await enviarTexto(
          sock,
          chatId,
          msg,
          `❌ El audio dura más de ${MAX_DURATION_SECONDS / 60} minutos. Elige un enlace más corto.\n\n${AVISO_DERECHOS}`
        );
        return;
      }

      await enviarTexto(sock, chatId, msg, `${AVISO_DERECHOS}\n\n⏳ Descargando audio…`);
      console.log('Descargando audio…');

      directorioTemporal = await mkdtemp(path.join(os.tmpdir(), 'azula-musica-'));
      const archivoAudio = path.join(directorioTemporal, 'audio.mp3');
      await convertirAudio(info, archivoAudio);

      const detallesArchivo = await stat(archivoAudio);
      if (detallesArchivo.size === 0) {
        throw new ConversionError('ffmpeg generó un archivo vacío.');
      }
      if (detallesArchivo.size > MAX_AUDIO_BYTES) {
        throw new ArchivoMuyGrandeError('El audio convertido supera 7,5 MiB.');
      }

      const audio = await readFile(archivoAudio);
      await sock.sendMessage(
        chatId,
        {
          audio,
          mimetype: 'audio/mpeg',
          fileName: 'musica.mp3',
          ptt: false
        },
        { quoted: msg }
      );
      console.log('Audio enviado');
    } catch (error) {
      console.error(`❌ Error en /musica para ${chatId}:`, error);
      if (error instanceof ArchivoMuyGrandeError) {
        await enviarTexto(sock, chatId, msg, `❌ El audio supera el límite de 7,5 MiB. Prueba con uno más corto.\n\n${AVISO_DERECHOS}`);
      } else if (error instanceof ConversionError) {
        await enviarTexto(sock, chatId, msg, '❌ Falló la conversión del audio. Verifica que ffmpeg esté instalado y disponible en PATH.');
      } else if (error?.code === 'ENOENT' && error?.syscall?.includes('spawn')) {
        await enviarTexto(sock, chatId, msg, '❌ No se encontró ffmpeg. Instálalo en el hosting y asegúrate de que esté disponible en PATH.');
      } else {
        await enviarTexto(sock, chatId, msg, '❌ No se pudo descargar el audio. Comprueba que el enlace sea válido, público y vuelve a intentarlo.');
      }
    } finally {
      if (directorioTemporal) {
        try {
          await rm(directorioTemporal, { recursive: true, force: true });
          console.log('Archivo temporal eliminado');
        } catch (error) {
          console.error(`❌ No se pudo eliminar el archivo temporal de ${chatId}:`, error);
          throw error;
        }
      }
    }
  }
};

export default plugin;
