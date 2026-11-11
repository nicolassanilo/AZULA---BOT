import axios from 'axios';

const API_NEKOS_BEST = 'https://api.nekos.best/api/v2/search';
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const TIMEOUT_MS = 20000;
const INSTRUCCIONES = `🎌 Buscador de Imágenes de Anime
───────────────────────
Uso: /anime-buscar [etiqueta]

Ejemplos:
/anime-buscar neko
/anime-buscar kawaii
/anime-buscar maid

💡 Usa etiquetas sencillas en inglés para mejores resultados`;

async function enviarTexto(sock, msg, texto) {
  await sock.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg });
}

function obtenerUrlImagen(resultado) {
  if (typeof resultado === 'string') return resultado;
  return resultado?.url || resultado?.image_url || resultado?.src || '';
}

const plugin = {
  nombre: 'Buscador de Anime',
  descripcion: 'Busca imágenes de anime por etiqueta usando Nekos.best.',
  comandos: ['/anime-buscar', '/anime-imagen'],
  activo: true,

  async ejecutar(sock, msg, context = {}) {
    const chatId = msg.key?.remoteJid;
    if (!chatId) {
      console.error('❌ No se puede ejecutar el buscador de anime: falta mensaje.key.remoteJid.');
      return;
    }

    const termino = String(context.text || '').trim();
    if (!termino) {
      await enviarTexto(sock, msg, INSTRUCCIONES);
      return;
    }

    try {
      const { data } = await axios.get(API_NEKOS_BEST, {
        params: { query: termino },
        timeout: TIMEOUT_MS
      });
      const resultados = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.images)
          ? data.images
          : [];

      if (resultados.length === 0) {
        await enviarTexto(
          sock,
          msg,
          `⚠️ No encontré resultados para: "${termino}"\nIntenta con otra palabra o etiqueta en inglés`
        );
        return;
      }

      const resultado = resultados[Math.floor(Math.random() * resultados.length)];
      const urlImagen = obtenerUrlImagen(resultado);
      if (!urlImagen) {
        throw new Error('El resultado de Nekos.best no contiene una URL de imagen.');
      }

      const respuestaImagen = await axios.get(urlImagen, {
        responseType: 'arraybuffer',
        timeout: TIMEOUT_MS,
        maxContentLength: MAX_IMAGE_BYTES
      });
      const imagen = Buffer.from(respuestaImagen.data);
      if (imagen.length === 0 || imagen.length > MAX_IMAGE_BYTES) {
        throw new Error('La imagen está vacía o supera el límite permitido.');
      }

      await sock.sendMessage(
        chatId,
        {
          image: imagen,
          caption: `🎌 Imagen de Anime\n🔍 Búsqueda: "${termino}"\n✨ ¡Disfrútala!\n📸 Fuente: Nekos.best`
        },
        { quoted: msg }
      );
    } catch (error) {
      console.error(
        `❌ Error en ${context.command || '/anime-buscar'}: fallo al consultar o enviar contenido de Nekos.best.`
      );
      await enviarTexto(sock, msg, '❌ No pude conectarme al servicio. Intenta más tarde.');
    }
  }
};

export default plugin;
