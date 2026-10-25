import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_IMAGEN = path.join(__dirname, '../../assets/menu-bot.jpg');

// ACTUALIZADO: 2026-09-10 — Dinámicas: 4 tipos en carpeta

export const MENU_PRINCIPAL = `
🥷📋 𝐌𝐄𝐍𝐔 𝐏𝐑𝐈𝐍𝐂𝐈𝐏𝐀𝐋 · 𝓐𝔃𝓾𝓵𝓪 𝓑𝓸𝓽 🎮
╭─────────────────────────────────────────────╮
╰─────────────────────────────────────────────╯

👤 𝐏𝐄𝐑𝐅𝐈𝐋 & 𝐏𝐔𝐍𝐓𝐎𝐒
──────────────────────────────────────────────
/perfil          → Ver tu ficha completa
/equipo          → Ver datos de tu equipo
/puntos          → Consultar tus puntos disponibles
/puntos ver [team_id] → Ver puntos del Team
/inventario      → Ver todos tus objetos comprados

👥🏪 𝐓𝐄𝐀𝐌𝐒 & 𝐓𝐈𝐄𝐍𝐃𝐀𝐒
──────────────────────────────────────────────
👥 Teams del grupo
/teams crear [nombre + emoji] → Crear un Team (solo admins)
/teams agregar [nombre + emoji] → Alias compatible para crear
/teams lista       → Ver Teams y puntos actuales
/teams editar [id] [nuevo nombre + emoji] → Editar un Team
/teams eliminar [id] → Eliminar un Team sin movimientos de puntos

🏪 Tiendas de equipo
🩸 /tienda jujutsu → Tienda del Hechicero
🍥 /tienda naruto  → Tienda del Shinobi
🔰 /tienda hunter  → Tienda del Cazador
/comprar [ID]    → Adquirir objeto de tu tienda
/tiendas agregar [nombre + emoji] → Crear tienda
/tiendas lista   → Ver tiendas del grupo
/tiendas editar [id] [nuevo nombre + emoji] → Editar tienda
/tiendas eliminar [id] → Eliminar tienda
/teams_tiendas estado → Ver estado de Teams y Tiendas
/puntos agregar [team_id] [cantidad] [motivo] → Sumar puntos (solo admins)
/puntos restar [team_id] [cantidad] [motivo] → Restar puntos (solo admins)

📋 𝐌𝐈𝐒𝐈𝐎𝐍𝐄𝐒 𝐘 𝐑𝐄𝐂𝐎𝐌𝐏𝐄𝐍𝐒𝐀𝐒
──────────────────────────────────────────────
📋 Misiones Comunes
   /misiones          → Ver misiones generales
   /completar [ID]     → Registrar misión cumplida

🧾 Misiones Support
   /misiones-support   → Ver misiones de equipo y grandes desafíos
   /completar-support [ID] → Registrar misión Support

📋 𝐑𝐄𝐐𝐔𝐈𝐒𝐈𝐓𝐎𝐒 𝐘 𝐆𝐑𝐀𝐃𝐔𝐀𝐂𝐈𝐎́𝐍
   /requisitos        → Ver requisitos para Misiones Support
   /graduar-genin     → Graduación Genin (Equipo Naruto) — 100.000 pts
   /obtener-licencia  → Licencia de Cazador (Equipo Hunter) — 100.000 pts

🎮 𝐃𝐈𝐍𝐀́𝐌𝐈𝐂𝐀𝐒 𝐈𝐍𝐓𝐄𝐑𝐀𝐂𝐓𝐈𝐕𝐀𝐒
──────────────────────────────────────────────
/dinamica         → 🎲 Iniciar dinámica al azar

📂 Dinámicas disponibles:
   📌 Adivina el Jutsu / Habilidad
   ⚔️ Equipo de Sueño
   💬 Frases Famosas
   👤 ¿Quién es por su apariencia?

/dinamica-fin     → Detener dinámica activa (solo Admins)

⚔️ 𝐃𝐄𝐒𝐀𝐅Í𝐎𝐒 𝐘 𝐁𝐀𝐓𝐀𝐋𝐋𝐀𝐒
──────────────────────────────────────────────
/retar @usuario [nivel] → Desafiar a otro miembro
/aceptar         → Aceptar un desafío recibido
/rechazar        → Rechazar un desafío
/clasificacion   → Ver ranking general de puntos

👋 𝐁𝐈𝐄𝐍𝐕𝐄𝐍𝐈𝐃𝐀 𝐏𝐄𝐑𝐒𝐎𝐍𝐀𝐋𝐈𝐙𝐀𝐃𝐀
──────────────────────────────────────────────
/bienvenida [mensaje] → Configurar el mensaje de bienvenida del grupo
/bienvenida-ver      → Ver el mensaje actual del grupo
/bienvenida-restablecer → Volver al mensaje por defecto

📋 𝐀𝐘𝐔𝐃𝐀
──────────────────────────────────────────────
/ayuda           → Explicación detallada de todos los comandos

{{PLUGINS_DISPONIBLES}}
`;

const PIE_MENU = `╭─────────────────────────────────────────────╯
 💡 ¡Elige una opción y disfruta de la comunidad! ✨
╰─────────────────────────────────────────────`;

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
    ? pluginsConMenu.join('\n')
    : '• No hay plugins de comandos cargados.';
  const bloquePlugins = `🧩 𝐏𝐋𝐔𝐆𝐈𝐍𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒
──────────────────────────────────────────────
${listadoPlugins}`;

  return `${MENU_PRINCIPAL.replace('{{PLUGINS_DISPONIBLES}}', bloquePlugins).trimEnd()}

${PIE_MENU}`;
}

/**
 * Activa los comandos /menu y /ayuda.
 * Si existe la imagen local, la envía junto con el texto.
 * Si no existe, envía solo texto para no romper el bot.
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

      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const textoNormalizado = texto.trim().toLowerCase();

      if (textoNormalizado !== '/menu' && textoNormalizado !== '/ayuda') return;

      const grupoId = msg.key.remoteJid;
      const menu = crearMenuPrincipal(obtenerPlugins());

      if (fs.existsSync(RUTA_IMAGEN)) {
        await sock.sendMessage(grupoId, {
          image: { url: RUTA_IMAGEN }
        }, { quoted: msg });
        await sock.sendMessage(grupoId, { text: menu }, { quoted: msg });
        console.log('📋 Menú enviado como imagen y texto separado para conservar el formato completo');
      } else {
        await sock.sendMessage(grupoId, { text: menu }, { quoted: msg });
        console.log('📋 Menú enviado solo con texto porque no se encontró la imagen en assets/menu-bot.jpg');
        console.log(`   💡 Ruta esperada: ${RUTA_IMAGEN}`);
      }
    } catch (error) {
      console.error('❌ Error al enviar el menú principal:', error);
    }
  });

  console.log('✅ Plugin de menú actualizado y decorado activado');
}
