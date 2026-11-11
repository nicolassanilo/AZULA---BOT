import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTAS_IMAGEN = [
  path.resolve(__dirname, '../../Imagenes/menu_01.jpg'),
  path.resolve(__dirname, '../../Imagenes/menu_02.jpg'),
  path.resolve(__dirname, '../../Imagenes/menu_03.jpg'),
  path.resolve(__dirname, '../../Imagenes/menu_04.jpg'),
  path.resolve(__dirname, '../../Imagenes/menu_05.jpg')
];

const LIMITE_CAPTION = 1024;
const COMANDOS_MENU = ['/menu', '/ayuda', '/menu-utilidades'];
const ENCABEZADO_MENU = `🥷📋 𝐌𝐄𝐍𝐔 𝐃𝐄 𝐔𝐓𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒 · 𝓐𝔃𝓾𝓵𝓪 𝓑𝓸𝓽 🎮
╭─────────────────────────────────────────────╮
╰─────────────────────────────────────────────╯`;
const PIE_MENU = `╭─────────────────────────────────────────────╯
 💡 Envía el comando tal como aparece abajo para usar una utilidad. ✨
╰─────────────────────────────────────────────`;

const MENU_UTILIDADES = `${ENCABEZADO_MENU}

🛠️ STICKERS
/sticker o /s → Crear un sticker desde una imagen o GIF.
Responde a una imagen con el comando o envía una imagen con /sticker.

🎵 MÚSICA
/musica [URL] → Descargar audio de un enlace de YouTube.
Usa solo contenido propio o con licencia que permita su descarga.

⚠️ Respeta los derechos de autor. No descargues ni compartas música protegida sin autorización.

📸 IMÁGENES
/foto [palabra clave] o /imagen [palabra clave] → Buscar una imagen en Pexels.

💡 Escribe /menu, /ayuda o /menu-utilidades para volver a ver estas instrucciones.

${PIE_MENU}`;

export const comandos = COMANDOS_MENU;
export const MENUS_POR_COMANDO = Object.fromEntries(
  COMANDOS_MENU.map((comando) => [comando, MENU_UTILIDADES])
);

export async function enviarMenu(sock, msg, comando) {
  if (!COMANDOS_MENU.includes(comando)) return;

  const chatId = msg.key?.remoteJid;
  if (!chatId) {
    console.error('❌ No se pudo enviar el menú: el mensaje no tiene chatId (remoteJid).');
    return;
  }

  console.log(`📏 Menú ${comando}: ${MENU_UTILIDADES.length} caracteres.`);
  const imagenesDisponibles = RUTAS_IMAGEN
    .map((ruta) => [ruta, ruta.replace(/\.jpg$/i, '.png')].find((candidata) => fs.existsSync(candidata)))
    .filter(Boolean);

  try {
    if (imagenesDisponibles.length > 0 && MENU_UTILIDADES.length <= LIMITE_CAPTION) {
      const rutaImagen = imagenesDisponibles[Math.floor(Math.random() * imagenesDisponibles.length)];
      await sock.sendMessage(chatId, {
        image: fs.readFileSync(rutaImagen),
        caption: MENU_UTILIDADES
      }, { quoted: msg });
      console.log(`📋 Menú enviado en un solo mensaje con imagen: ${rutaImagen}`);
    } else {
      await sock.sendMessage(chatId, { text: MENU_UTILIDADES }, { quoted: msg });
      if (!imagenesDisponibles.length) {
        console.log('📋 No se encontraron imágenes menu_01–menu_05 (.jpg/.png) en Imagenes; se envió solo el texto del menú.');
      } else {
        console.log(`📋 Menú ${comando} enviado solo como texto para conservarlo completo.`);
      }
    }
  } catch (error) {
    console.error('❌ Error al enviar el menú de utilidades:', error);
  }
}
