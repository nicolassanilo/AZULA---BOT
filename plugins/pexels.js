import axios from 'axios';

const PEXELS_API_URL = 'https://api.pexels.com/v1/search';
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const TIMEOUT_MS = 20000;

async function enviarTexto(sock, msg, texto) {
  await sock.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg });
}

const plugin = {
  nombre: 'Pexels',
  descripcion: 'Busca imágenes de Pexels por palabra clave.',
  comandos: ['/foto', '/imagen'],
  activo: true,

  async ejecutar(sock, msg, context = {}) {
    const chatId = msg.key?.remoteJid;
    if (!chatId) {
      console.error('❌ No se puede ejecutar Pexels: falta mensaje.key.remoteJid.');
      return;
    }

    const palabra = String(context.text || '').trim();
    if (!palabra) {
      await enviarTexto(sock, msg, '📸 Dime qué buscas. Ejemplo: /foto gato');
      return;
    }

    const apiKey = String(process.env.PEXELS_API_KEY || context.config?.pexelsApiKey || '').trim();
    if (!apiKey) {
      await enviarTexto(sock, msg, '⚠️ Configura pexelsApiKey en config/config.json para usar este comando.');
      return;
    }

    try {
      const { data } = await axios.get(PEXELS_API_URL, {
        params: {
          query: palabra,
          per_page: 1,
          page: Math.floor(Math.random() * 10) + 1
        },
        headers: { Authorization: apiKey },
        timeout: TIMEOUT_MS
      });

      if (!Array.isArray(data?.photos)) {
        throw new Error('La respuesta de Pexels no contiene una lista de imágenes.');
      }
      if (data.photos.length === 0) {
        await enviarTexto(sock, msg, `⚠️ No encontré imágenes para: ${palabra}. Prueba con otra palabra.`);
        return;
      }

      const imagen = data.photos[Math.floor(Math.random() * data.photos.length)];
      const urlImagen = imagen?.src?.large;
      if (!urlImagen) {
        throw new Error('La imagen de Pexels no incluye una URL válida.');
      }

      const respuestaImagen = await axios.get(urlImagen, {
        responseType: 'arraybuffer',
        timeout: TIMEOUT_MS,
        maxContentLength: MAX_IMAGE_BYTES
      });
      const bufferImagen = Buffer.from(respuestaImagen.data);
      if (bufferImagen.length === 0 || bufferImagen.length > MAX_IMAGE_BYTES) {
        throw new Error('La imagen está vacía o supera el límite permitido.');
      }

      await sock.sendMessage(
        chatId,
        {
          image: bufferImagen,
          caption: `📸 Imagen de Pexels\n🔍 Búsqueda: "${palabra}"\n✨ ¡Disfrútala!`
        },
        { quoted: msg }
      );
    } catch (error) {
      console.error(`❌ Error en ${context.command || '/foto'}: fallo al consultar o enviar contenido de Pexels.`);
      await enviarTexto(sock, msg, '❌ No pude conectarme a Pexels. Intenta más tarde.');
    }
  }
};

export default plugin;
