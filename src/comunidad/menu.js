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
const COMANDOS_MENU = [
  '/menu',
  '/ayuda',
  '/menu-equipos',
  '/menu-tiendas',
  '/menu-misiones',
  '/menu-dinamicas',
  '/menu-perfil',
  '/menu-desafios',
  '/menu-config',
  '/menu-utilidades'
];

export const comandos = COMANDOS_MENU;

const ENCABEZADO_MENU = (titulo) => `🥷📋 𝐌𝐄𝐍𝐔 ${titulo} · 𝓐𝔃𝓾𝓵𝓪 𝓑𝓸𝓽 🎮
╭─────────────────────────────────────────────╮
╰─────────────────────────────────────────────╯`;
const PIE_MENU = `╭─────────────────────────────────────────────╯
 💡 ¡Elige una opción y disfruta de la comunidad! ✨
╰─────────────────────────────────────────────`;

const MENUS_CATEGORIA = {
  '/menu-equipos': `${ENCABEZADO_MENU('𝐄𝐐𝐔𝐈𝐏𝐎𝐒')}

/equipos crear [nombre + emoji] → Crear un Team (solo admins del grupo)
/equipos lista → Ver los Teams disponibles
/equipos editar [id] [nuevo nombre] → Editar un Team (solo admins)
/equipos eliminar [id] → Eliminar un Team sin miembros (solo admins)
/puntos ver [team_id] → Consultar puntos del Team
/puntos agregar|restar [team_id] [cantidad] [motivo] → Ajustar puntos (solo admins)

${PIE_MENU}`,
  '/menu-tiendas': `${ENCABEZADO_MENU('𝐓𝐄𝐀𝐌𝐒 & 𝐓𝐈𝐄𝐍𝐃𝐀𝐒')}

🏪 Tiendas de equipo
🩸 /tienda jujutsu → Tienda del Hechicero
🍥 /tienda naruto → Tienda del Shinobi
🔰 /tienda hunter → Tienda del Cazador
/comprar [ID] → Adquirir objeto de tu tienda
/tiendas agregar [team_id] [nombre] | [productos] → Configurar tienda (admin del Team)
/tiendas ver [team_id] → Ver tienda del Team

${PIE_MENU}`,
  '/menu-misiones': `${ENCABEZADO_MENU('𝐌𝐈𝐒𝐈𝐎𝐍𝐄𝐒 𝐘 𝐑𝐄𝐂𝐎𝐌𝐏𝐄𝐍𝐒𝐀𝐒')}

/misiones agregar [team_id] [tipo] [descripción] [puntos] → Crear misión (solo admins)
/misiones lista [team_id] → Ver misiones activas del Team
/misiones completar [id_mision] → Completar una misión y recibir puntos

${PIE_MENU}`,
  '/menu-dinamicas': `${ENCABEZADO_MENU('𝐃𝐈𝐍𝐀́𝐌𝐈𝐂𝐀𝐒 𝐈𝐍𝐓𝐄𝐑𝐀𝐂𝐓𝐈𝐕𝐀𝐒')}

/dinamicas activar [team_id] [tipo] → Activar dinámica (solo admins)
/dinamicas lista [team_id] → Ver dinámicas del Team
/dinamica → Iniciar una dinámica activa
/dinamica-fin → Detener dinámica (solo admins)

${PIE_MENU}`,
  '/menu-perfil': `${ENCABEZADO_MENU('𝐏𝐄𝐑𝐅𝐈𝐋 & 𝐏𝐔𝐍𝐓𝐎𝐒')}

/crearperfil → Elegir un Team y crear tu perfil
/crearperfil [team_id] → Vincular tu perfil al Team elegido
/miperfil → Ver datos, puntos, equipo y rango
/inventario → Ver todos tus objetos comprados

${PIE_MENU}`,
  '/menu-desafios': `${ENCABEZADO_MENU('𝐃𝐄𝐒𝐀𝐅Í𝐎𝐒 𝐘 𝐁𝐀𝐓𝐀𝐋𝐋𝐀𝐒')}

/retar @usuario [nivel] → Desafiar a otro miembro
/aceptar → Aceptar un desafío recibido
/rechazar → Rechazar un desafío
/clasificacion → Ver ranking general de puntos

${PIE_MENU}`,
  '/menu-utilidades': `${ENCABEZADO_MENU('𝐔𝐓𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒')}

🛠️ Stickers
/sticker → Crear un sticker respondiendo a una imagen
/s → Alias rápido para crear stickers
/sticker círculo → Sticker circular
/sticker cuadrado → Sticker cuadrado
/sticker eliminar-fondo → Quitar el fondo y crear un sticker

💡 También puedes enviar una imagen con /sticker como texto.

${PIE_MENU}`
};

function crearMenuPrincipal() {
  return `${ENCABEZADO_MENU('𝐏𝐑𝐈𝐍𝐂𝐈𝐏𝐀𝐋')}

Elige una categoría:
/menu-equipos → 📋 Equipos
/menu-perfil → 👤 Mi Perfil
/menu-tiendas → 🏪 Tiendas
/menu-misiones → 📋 Misiones
/menu-dinamicas → 🎮 Dinámicas
/menu-desafios → Desafíos y Batallas
/menu-utilidades → 🛠️ Utilidades
/menu-config → ⚙️ Configuración

${PIE_MENU}`;
}

function crearMenuConfig() {
  return `${ENCABEZADO_MENU('𝐁𝐈𝐄𝐍𝐕𝐄𝐍𝐈𝐃𝐀 & 𝐀𝐘𝐔𝐃𝐀')}

👋 𝐁𝐈𝐄𝐍𝐕𝐄𝐍𝐈𝐃𝐀 𝐏𝐄𝐑𝐒𝐎𝐍𝐀𝐋𝐈𝐙𝐀𝐃𝐀
/bienvenida [mensaje] → Configurar el mensaje de bienvenida del grupo
/bienvenida-ver → Ver el mensaje actual del grupo
/bienvenida-restablecer → Volver al mensaje por defecto

⚙️ 𝐂𝐎𝐍𝐅𝐈𝐆𝐔𝐑𝐀𝐂𝐈𝐎́𝐍
/menu → Ver las secciones del bot
/ayuda → Ver esta sección

${PIE_MENU}`;
}

export const MENUS_POR_COMANDO = MENUS_CATEGORIA;

function crearTextoMenu(comando, plugins) {
  if (comando === '/menu' || comando === '/ayuda') {
    return comando === '/ayuda' ? crearMenuConfig() : crearMenuPrincipal();
  }
  if (comando === '/menu-config') return crearMenuConfig();
  return MENUS_CATEGORIA[comando];
}

/**
 * Activa el índice, la ayuda y los submenús de cada categoría.
 * Adjunta una imagen aleatoria cuando el texto cabe en el caption de WhatsApp.
 */
export function activarMenu(sock, obtenerPlugins = () => new Map()) {
  if (!sock || typeof sock.ev?.on !== 'function') {
    console.error('❌ No se pudo activar el menú: sock inválido');
    return;
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg?.message || msg.key?.fromMe) return;

      const contenido = msg.message.ephemeralMessage?.message ||
        msg.message.viewOnceMessage?.message ||
        msg.message.viewOnceMessageV2?.message ||
        msg.message;
      const texto = contenido?.conversation ||
        contenido?.extendedTextMessage?.text ||
        contenido?.imageMessage?.caption ||
        contenido?.videoMessage?.caption ||
        '';
      const textoNormalizado = texto.trim().toLowerCase();

      if (!COMANDOS_MENU.includes(textoNormalizado)) return;

      const grupoId = msg.key.remoteJid;
      if (!grupoId) {
        console.error('❌ No se pudo enviar el menú: el mensaje no tiene chatId (remoteJid).');
        return;
      }
      const menu = crearTextoMenu(textoNormalizado, obtenerPlugins());
      if (!menu) return;
      console.log(`📏 Menú ${textoNormalizado}: ${menu.length} caracteres.`);
      if (menu.length > LIMITE_CAPTION) {
        console.warn(`⚠️ El menú ${textoNormalizado} supera el límite de caption (${LIMITE_CAPTION} caracteres); se enviará solo como texto.`);
      }

      const imagenesDisponibles = RUTAS_IMAGEN
        .map((ruta) => [ruta, ruta.replace(/\.jpg$/i, '.png')].find((candidata) => fs.existsSync(candidata)))
        .filter(Boolean);
      if (imagenesDisponibles.length > 0 && menu.length <= LIMITE_CAPTION) {
        const rutaImagen = imagenesDisponibles[Math.floor(Math.random() * imagenesDisponibles.length)];
        await sock.sendMessage(grupoId, {
          image: fs.readFileSync(rutaImagen),
          caption: menu
        }, { quoted: msg });
        console.log(`📋 Menú enviado en un solo mensaje con imagen: ${rutaImagen}`);
      } else {
        await sock.sendMessage(grupoId, { text: menu }, { quoted: msg });
        if (!imagenesDisponibles.length) {
          console.log('📋 No se encontraron imágenes menu_01–menu_05 (.jpg/.png) en Imagenes; se envió solo el texto del menú.');
        } else {
          console.log(`📋 Menú ${textoNormalizado} enviado solo como texto para conservarlo completo.`);
        }
      }
    } catch (error) {
      console.error('❌ Error al enviar el menú principal:', error);
    }
  });

  console.log('✅ Plugin de menú actualizado y decorado activado');
}
