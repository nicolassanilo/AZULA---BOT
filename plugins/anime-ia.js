import axios from 'axios';

const API_URL = 'https://animeapi.ai/api/generate';
const MAX_PROMPT_LENGTH = 500;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const GENERATION_TIMEOUT_MS = 180000;
const DOWNLOAD_TIMEOUT_MS = 60000;
const INSTRUCCIONES = `🎨 Generador de Imágenes con IA
───────────────────────
Uso: /imagen-ia [tu descripción]

Ejemplos:
/imagen-ia Una chica con paraguas rojo en una parada de autobús bajo la lluvia
/imagen-ia Un samurái de espada brillante en un bosque de cerezos en flor
/imagen-ia Paisaje de montaña con nubes y atardecer estilo anime

💡 Sé específico para mejores resultados ✨`;

async function enviarTexto(sock, msg, texto) {
  await sock.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg });
}

function obtenerImagenDeRespuesta(respuesta) {
  const contentType = String(respuesta.headers?.['content-type'] || '').toLowerCase();
  let data = respuesta.data;

  if (contentType.startsWith('image/')) {
    return { buffer: Buffer.from(data) };
  }

  if (Buffer.isBuffer(data) || data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    const texto = Buffer.from(data).toString('utf8').trim();
    try {
      data = JSON.parse(texto);
    } catch {
      data = texto;
    }
  }

  if (typeof data === 'string') {
    const texto = data.trim();
    const base64 = texto.match(/^data:image\/[^;]+;base64,(.+)$/i);
    if (base64) return { buffer: Buffer.from(base64[1], 'base64') };
    if (/^https?:\/\//i.test(texto)) return { url: texto };
  }

  const resultado = Array.isArray(data?.images) ? data.images[0] : null;
  const candidato = data?.image_url
    || data?.imageUrl
    || data?.url
    || data?.image
    || data?.output
    || resultado?.image_url
    || resultado?.url
    || resultado
    || data?.data?.image_url
    || data?.data?.url
    || data?.data;

  if (typeof candidato === 'string') {
    const base64 = candidato.match(/^data:image\/[^;]+;base64,(.+)$/i);
    if (base64) return { buffer: Buffer.from(base64[1], 'base64') };
    if (/^https?:\/\//i.test(candidato)) return { url: candidato };
  }

  throw new Error('La respuesta de AnimeAPI.ai no contiene una imagen válida.');
}

async function descargarImagen(url) {
  const urlImagen = new URL(url);
  if (!['http:', 'https:'].includes(urlImagen.protocol)) {
    throw new Error('AnimeAPI.ai devolvió un protocolo de imagen no válido.');
  }

  const respuesta = await axios.get(urlImagen.href, {
    responseType: 'arraybuffer',
    timeout: DOWNLOAD_TIMEOUT_MS,
    maxContentLength: MAX_IMAGE_BYTES
  });
  return Buffer.from(respuesta.data);
}

function esErrorDeConexion(error) {
  return !error.response || error.response.status >= 500
    || ['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK', 'ENOTFOUND', 'ECONNRESET', 'EAI_AGAIN']
      .includes(error.code);
}

const plugin = {
  nombre: 'Generador de imágenes de anime con IA',
  descripcion: 'Genera imágenes de anime a partir de una descripción usando AnimeAPI.ai.',
  comandos: ['/imagen-ia', '/ia'],
  activo: true,

  async ejecutar(sock, msg, context = {}) {
    const chatId = msg.key?.remoteJid;
    if (!chatId) {
      console.error('❌ No se puede ejecutar el generador de anime: falta mensaje.key.remoteJid.');
      return;
    }

    const descripcion = String(context.text || '').trim();
    if (!descripcion || descripcion.toLowerCase() === 'ayuda') {
      await enviarTexto(sock, msg, INSTRUCCIONES);
      return;
    }

    if (descripcion.length > MAX_PROMPT_LENGTH) {
      await enviarTexto(sock, msg, '⚠️ La descripción es muy larga. Sé más breve');
      return;
    }

    const animeApiKey = String(process.env.ANIMEAPI_KEY || '').trim();
    if (!animeApiKey) {
      await enviarTexto(sock, msg, '⚠️ Configura ANIMEAPI_KEY como variable de entorno para usar este comando.');
      return;
    }

    await enviarTexto(sock, msg, '⏳ Generando imagen... Esto puede tardar unos segundos');

    try {
      const respuesta = await axios.post(
        API_URL,
        { prompt: descripcion, model: 'anime', orientation: 'portrait' },
        {
          headers: {
            Authorization: `Bearer ${animeApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: GENERATION_TIMEOUT_MS,
          maxContentLength: MAX_IMAGE_BYTES,
          responseType: 'arraybuffer'
        }
      );

      const resultado = obtenerImagenDeRespuesta(respuesta);
      const imagen = resultado.buffer || await descargarImagen(resultado.url);
      if (imagen.length === 0 || imagen.length > MAX_IMAGE_BYTES) {
        throw new Error('La imagen está vacía o supera el límite permitido.');
      }

      await sock.sendMessage(
        chatId,
        {
          image: imagen,
          caption: `🎨 Imagen generada con IA\n📝 Descripción: "${descripcion}"\n✨ ¡Listo!`
        },
        { quoted: msg }
      );
    } catch (error) {
      if (error.response?.status === 413) {
        await enviarTexto(sock, msg, '⚠️ La descripción es muy larga. Sé más breve');
        return;
      }

      console.error(`❌ Error en ${context.command || '/imagen-ia'}: fallo al generar o enviar la imagen.`);
      await enviarTexto(
        sock,
        msg,
        esErrorDeConexion(error)
          ? '❌ Error de conexión. Intenta más tarde'
          : '⚠️ No pude generar la imagen. Intenta con otra descripción más clara'
      );
    }
  }
};

export default plugin;
