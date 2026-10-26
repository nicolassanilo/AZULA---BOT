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
  '/menu-tiendas': `${ENCABEZADO_MENU('𝐓𝐄𝐀𝐌𝐒 & 𝐓𝐈𝐄𝐍𝐃𝐀𝐒')}

👥 Teams del grupo
/teams crear [nombre + emoji] → Crear un Team (solo admins)
/teams agregar [nombre + emoji] → Alias compatible para crear
/teams lista → Ver Teams y puntos actuales
/teams editar [id] [nuevo nombre + emoji] → Editar un Team
/teams eliminar [id] → Eliminar un Team sin movimientos de puntos

🏪 Tiendas de equipo
🩸 /tienda jujutsu → Tienda del Hechicero
🍥 /tienda naruto → Tienda del Shinobi
🔰 /tienda hunter → Tienda del Cazador
/comprar [ID] → Adquirir objeto de tu tienda
/tiendas agregar [nombre + emoji] → Crear tienda
/tiendas lista → Ver tiendas del grupo
/tiendas editar [id] [nuevo nombre + emoji] → Editar tienda
/tiendas eliminar [id] → Eliminar tienda
/teams_tiendas estado → Ver estado de Teams y Tiendas
/puntos agregar [team_id] [cantidad] [motivo] → Sumar puntos (solo admins)
/puntos restar [team_id] [cantidad] [motivo] → Restar puntos (solo admins)
/puntos ver [team_id] → Ver puntos del Team

${PIE_MENU}`,
  '/menu-misiones': `${ENCABEZADO_MENU('𝐌𝐈𝐒𝐈𝐎𝐍𝐄𝐒 𝐘 𝐑𝐄𝐂𝐎𝐌𝐏𝐄𝐍𝐒𝐀𝐒')}

📋 Misiones Comunes
/misiones → Ver misiones generales
/completar [ID] → Registrar misión cumplida

🧾 Misiones Support
/misiones-support → Ver misiones de equipo y grandes desafíos
/completar-support [ID] → Registrar misión Support

📋 𝐑𝐄𝐐𝐔𝐈𝐒𝐈𝐓𝐎𝐒 𝐘 𝐆𝐑𝐀𝐃𝐔𝐀𝐂𝐈𝐎́𝐍
/requisitos → Ver requisitos para Misiones Support
/graduar-genin → Graduación Genin (Equipo Naruto) — 100.000 pts
/obtener-licencia → Licencia de Cazador (Equipo Hunter) — 100.000 pts

${PIE_MENU}`,
  '/menu-dinamicas': `${ENCABEZADO_MENU('𝐃𝐈𝐍𝐀́𝐌𝐈𝐂𝐀𝐒 𝐈𝐍𝐓𝐄𝐑𝐀𝐂𝐓𝐈𝐕𝐀𝐒')}

/dinamica → 🎲 Iniciar dinámica al azar

📂 Dinámicas disponibles:
📌 Adivina el Jutsu / Habilidad
⚔️ Equipo de Sueño
💬 Frases Famosas
👤 ¿Quién es por su apariencia?

/dinamica-fin → Detener dinámica activa (solo Admins)

${PIE_MENU}`,
  '/menu-perfil': `${ENCABEZADO_MENU('𝐏𝐄𝐑𝐅𝐈𝐋 & 𝐏𝐔𝐍𝐓𝐎𝐒')}

/perfil → Ver tu ficha completa
/equipo → Ver datos de tu equipo
/puntos → Consultar tus puntos disponibles
/puntos ver [team_id] → Ver puntos del Team
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

function crearMenuPrincipal(plugins) {
  const pluginsConMenu = [...new Set(plugins.values())]
    .filter((plugin) => plugin?.nombre && plugin?.descripcion)
    .map((plugin) => {
      const comandos = plugin.comandos || plugin.command || plugin.commands || [];
      const comandosSlash = (Array.isArray(comandos) ? comandos : [comandos])
        .filter((comando) => typeof comando === 'string' && comando.startsWith('/'));

      return comandosSlash.length
        ? `• ${plugin.nombre}: ${comandosSlash.join(', ')} → ${plugin.descripcion}`
        : null;
    })
    .filter(Boolean);

  const listadoPlugins = pluginsConMenu.length
    ? `\n🧩 Plugins: ${pluginsConMenu.map((linea) => linea.replace(/^• /, '')).join(' | ')}`
    : '';

  return `${ENCABEZADO_MENU('𝐏𝐑𝐈𝐍𝐂𝐈𝐏𝐀𝐋')}

Elige una categoría:
/menu-tiendas → Teams y Tiendas
/menu-misiones → Misiones, Requisitos y Graduación
/menu-dinamicas → Dinámicas
/menu-perfil → Perfil, Puntos e Inventario
/menu-desafios → Desafíos y Batallas
/menu-utilidades → 🛠️ Utilidades
/menu-config → Bienvenida y Ayuda
${listadoPlugins}

${PIE_MENU}`;
}

function crearMenuConfig(plugins) {
  const pluginsConMenu = [...new Set(plugins.values())]
    .filter((plugin) => plugin?.nombre && plugin?.descripcion)
    .map((plugin) => {
      const comandosPlugin = plugin.comandos || plugin.command || plugin.commands || [];
      const comandosSlash = (Array.isArray(comandosPlugin) ? comandosPlugin : [comandosPlugin])
        .filter((comando) => typeof comando === 'string' && comando.startsWith('/'));
      return comandosSlash.length
        ? `• ${plugin.nombre}: ${comandosSlash.join(', ')} → ${plugin.descripcion}`
        : null;
    })
    .filter(Boolean);

  const listadoPlugins = pluginsConMenu.length
    ? pluginsConMenu.join('\n')
    : '• No hay plugins de comandos cargados.';

  return `${ENCABEZADO_MENU('𝐁𝐈𝐄𝐍𝐕𝐄𝐍𝐈𝐃𝐀 & 𝐀𝐘𝐔𝐃𝐀')}

👋 𝐁𝐈𝐄𝐍𝐕𝐄𝐍𝐈𝐃𝐀 𝐏𝐄𝐑𝐒𝐎𝐍𝐀𝐋𝐈𝐙𝐀𝐃𝐀
/bienvenida [mensaje] → Configurar el mensaje de bienvenida del grupo
/bienvenida-ver → Ver el mensaje actual del grupo
/bienvenida-restablecer → Volver al mensaje por defecto

📋 𝐀𝐘𝐔𝐃𝐀
/ayuda → Mostrar esta sección

🧩 𝐏𝐋𝐔𝐆𝐈𝐍𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒
${listadoPlugins}

${PIE_MENU}`;
}

export const MENUS_POR_COMANDO = MENUS_CATEGORIA;

function crearTextoMenu(comando, plugins) {
  if (comando === '/menu' || comando === '/ayuda') {
    return comando === '/ayuda' ? crearMenuConfig(plugins) : crearMenuPrincipal(plugins);
  }
  if (comando === '/menu-config') return crearMenuConfig(plugins);
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
