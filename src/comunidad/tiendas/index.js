import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJsonFileSafe, writeJsonFileSafe } from '../archivos-seguros.js';

import { cargarRanking, guardarRanking, detectarEquipo } from '../sistema/ranking.js';
import { obtenerEquipoUsuario } from '../sistema/perfiles.js';
import { TIENDA_NARUTO } from './tienda-naruto.js';
import { TIENDA_JUJUTSU } from './tienda-jujutsu.js';
import { TIENDA_HUNTER } from './tienda-hunter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const INVENTARIO_RUTA = path.join(DATA_DIR, 'inventario.json');

const tiendas = [
  TIENDA_NARUTO,
  TIENDA_JUJUTSU,
  TIENDA_HUNTER
];

function cargarInventario() {
  try {
    fsSync.mkdirSync(DATA_DIR, { recursive: true });

    if (!fsSync.existsSync(INVENTARIO_RUTA)) {
      writeJsonFileSafe(INVENTARIO_RUTA, {});
      return {};
    }

    return readJsonFileSafe(INVENTARIO_RUTA, {});
  } catch (error) {
    console.warn('⚠️ Error cargando inventario:', error?.message || error);
    return {};
  }
}

function guardarInventario(datos) {
  try {
    fsSync.mkdirSync(DATA_DIR, { recursive: true });
    writeJsonFileSafe(INVENTARIO_RUTA, datos && typeof datos === 'object' ? datos : {});
  } catch (error) {
    console.warn('⚠️ Error guardando inventario:', error?.message || error);
  }
}

function obtenerInventarioUsuario(usuarioId) {
  const inventario = cargarInventario();
  const compras = inventario[usuarioId];

  if (!Array.isArray(compras)) {
    return [];
  }

  return compras.map((compra) => {
    if (typeof compra === 'object' && compra !== null) {
      return {
        id: Number(compra.id),
        nombre: compra.nombre || 'Producto',
        precio: Number(compra.precio || 0),
        fechaCompra: compra.fechaCompra || new Date().toISOString().split('T')[0],
        emoji: compra.emoji || ''
      };
    }

    return {
      id: Number(compra),
      nombre: 'Producto',
      precio: 0,
      fechaCompra: new Date().toISOString().split('T')[0],
      emoji: ''
    };
  });
}

function guardarInventarioUsuario(usuarioId, compras) {
  const inventario = cargarInventario();
  inventario[usuarioId] = compras;
  guardarInventario(inventario);
}

export function obtenerInventario(usuarioId) {
  const compras = obtenerInventarioUsuario(usuarioId);
  return compras
    .map((compra) => ({
      id: Number(compra.id),
      nombre: compra.nombre || 'Producto',
      precio: Number(compra.precio || 0),
      fechaCompra: compra.fechaCompra || new Date().toISOString().split('T')[0],
      emoji: compra.emoji || '📦'
    }))
    .sort((a, b) => a.id - b.id);
}

function obtenerProductosComprados(usuarioId) {
  const compras = obtenerInventarioUsuario(usuarioId);

  return [...new Set(compras
    .map((compra) => Number(compra.id))
    .filter((id) => Number.isInteger(id) && id > 0))];
}

function guardarCompraUsuario(usuarioId, productoId) {
  const compras = obtenerInventarioUsuario(usuarioId);
  const id = Number(productoId);

  if (!compras.some((compra) => Number(compra.id) === id)) {
    compras.push({
      id,
      nombre: 'Producto',
      precio: 0,
      fechaCompra: new Date().toISOString().split('T')[0],
      emoji: ''
    });
  }

  guardarInventarioUsuario(usuarioId, compras);
}

export function tieneProducto(usuarioId, productoId) {
  return obtenerProductosComprados(usuarioId).includes(Number(productoId));
}

export function tieneCarnetJujutsu(usuarioId) {
  return tieneProducto(usuarioId, TIENDA_JUJUTSU.productoRequisitoId);
}

export function tieneRequisitoCompra(usuarioId, tienda) {
  const requisito = Number(tienda?.productoRequisitoId || 0);

  if (!requisito || tienda?.emoji === '🔰') {
    return true;
  }

  return tieneProducto(usuarioId, requisito);
}

export function buscarProductoEnTienda(tienda, productoId) {
  if (!tienda || !productoId) {
    return null;
  }

  const productoBuscado = Number(productoId);
  return tienda.productos.find((producto) => Number(producto.id) === productoBuscado) || null;
}

function obtenerTiendaPorNombre(nombreTienda) {
  const nombre = String(nombreTienda || '').trim().toLowerCase();

  if (nombre.includes('jujutsu')) return TIENDA_JUJUTSU;
  if (nombre.includes('naruto')) return TIENDA_NARUTO;
  if (nombre.includes('hunter')) return TIENDA_HUNTER;

  return null;
}

export function obtenerTiendaPorEquipo(equipo) {
  const nombreEquipo = String(equipo?.nombre || equipo?.emoji || equipo || '').trim().toLowerCase();

  if (nombreEquipo.includes('naruto')) return TIENDA_NARUTO;
  if (nombreEquipo.includes('jujutsu')) return TIENDA_JUJUTSU;
  if (nombreEquipo.includes('hunter')) return TIENDA_HUNTER;

  return null;
}

export function agregarAInventario(usuarioId, producto) {
  const inventario = cargarInventario();
  const compras = obtenerInventarioUsuario(usuarioId);

  const productoAAgregar = {
    id: Number(producto.id),
    nombre: producto.nombre || 'Producto',
    precio: Number(producto.precio || 0),
    fechaCompra: producto.fechaCompra || new Date().toISOString().split('T')[0],
    emoji: producto.emoji || ''
  };

  const yaExiste = compras.some((compra) => Number(compra.id) === Number(producto.id));

  if (!yaExiste) {
    compras.push(productoAAgregar);
  }

  inventario[usuarioId] = compras;
  guardarInventario(inventario);

  return productoAAgregar;
}

export function descontarPuntos(usuarioId, monto) {
  const ranking = cargarRanking();
  const saldoActual = Number(ranking.usuarios?.[usuarioId]?.puntos || 0);
  const nuevoSaldo = Math.max(0, saldoActual - Number(monto || 0));

  ranking.usuarios[usuarioId] = {
    ...(ranking.usuarios[usuarioId] || {}),
    puntos: nuevoSaldo
  };

  guardarRanking(ranking);

  return nuevoSaldo;
}

function construirListaProductos(tienda) {
  return tienda.productos
    .map((p) => `*${p.id}.* ${p.emoji} ${p.nombre} - ${p.precio.toLocaleString()} pts`)
    .join('\n');
}

function construirListaProductosAgrupados(tienda) {
  const grupos = new Map();

  for (const producto of tienda.productos) {
    const categoria = producto.categoria || 'Sin categoría';
    if (!grupos.has(categoria)) {
      grupos.set(categoria, []);
    }
    grupos.get(categoria).push(producto);
  }

  let mensaje = '';

  for (const [categoria, productos] of grupos.entries()) {
    mensaje += `\n*${categoria}*\n`;
    for (const producto of productos) {
      mensaje += `*${producto.id}.* ${producto.emoji} ${producto.nombre} - ${producto.precio.toLocaleString()} pts\n`;
    }
  }

  return mensaje.trim();
}

function construirSeccionYaTenes(tienda, usuarioId) {
  const productosComprados = obtenerProductosComprados(usuarioId)
    .map((idProducto) => tienda.productos.find((p) => p.id === idProducto))
    .filter(Boolean);

  if (productosComprados.length === 0) {
    return '✅ Ya tenés:\n- Todavía no compraste ningún producto de esta tienda.';
  }

  const contenido = productosComprados
    .map((producto) => `- ${producto.emoji} ${producto.nombre}`)
    .join('\n');

  return `✅ Ya tenés:\n${contenido}`;
}

function obtenerPuntajeUsuario(usuarioId) {
  const ranking = cargarRanking();
  return Number(ranking.usuarios?.[usuarioId]?.puntos || 0);
}

function guardarPuntajeUsuario(usuarioId, puntos) {
  const ranking = cargarRanking();
  ranking.usuarios[usuarioId] = {
    ...(ranking.usuarios[usuarioId] || {}),
    puntos: Number(puntos || 0)
  };
  guardarRanking(ranking);
  return true;
}

async function obtenerNombreRemitente(sock, msg) {
  try {
    const grupoId = msg.key?.remoteJid;
    if (grupoId && grupoId.endsWith('@g.us')) {
      const metadata = await sock.groupMetadata(grupoId);
      const participante = metadata?.participants?.find((p) => p.id === (msg.key?.participant || msg.key?.remoteJid));
      if (participante?.displayName) return participante.displayName;
      if (participante?.notify) return participante.notify;
      if (participante?.name) return participante.name;
    }
  } catch (error) {
    // Ignoramos errores y usamos el fallback.
  }

  return msg.pushName || msg.key?.participant || msg.key?.remoteJid || 'Usuario';
}

async function mostrarAyudaTiendas(sock, msg) {
  const ayuda = `
🏪 ¿A cuál tienda quieres ingresar?

🩸 /tienda jujutsu → Jujutsu Kaisen
🍥 /tienda naruto → Naruto
🔰 /tienda hunter → Hunter × Hunter`;

  await sock.sendMessage(msg.key.remoteJid, { text: ayuda }, { quoted: msg });
}

async function mostrarTiendas(sock, msg, tiendaSeleccionada = null) {
  const usuario = await obtenerNombreRemitente(sock, msg);
  const usuarioId = msg.key?.participant || msg.key?.remoteJid || msg.from;
  const equipo = obtenerEquipoUsuario(usuarioId, usuario) || detectarEquipo(usuario);

  const tienda = tiendaSeleccionada
    ? obtenerTiendaPorNombre(tiendaSeleccionada)
    : obtenerTiendaPorEquipo(equipo);

  if (!tienda) {
    await mostrarAyudaTiendas(sock, msg);
    return;
  }

  let mensaje = '';

  if (tienda.emoji === '🩸' && tienda.encabezado) {
    mensaje = `${tienda.encabezado}\n\n${construirListaProductosAgrupados(tienda)}\n\n${construirSeccionYaTenes(tienda, usuarioId)}\n\n${tienda.pie || ''}`;
  } else {
    mensaje = `🛒 *Tienda de ${tienda.equipo}* ${tienda.emoji}\n\n` +
      `Tu equipo detectado es: *${equipo?.nombre || tienda.equipo}*\n\n` +
      `*Productos disponibles:*\n` +
      construirListaProductos(tienda)+
      `\n\n${construirSeccionYaTenes(tienda, usuarioId)}`;
  }

  await sock.sendMessage(msg.key.remoteJid, { text: mensaje }, { quoted: msg });
}

async function mostrarProductos(sock, msg) {
  const usuario = await obtenerNombreRemitente(sock, msg);
  const usuarioId = msg.key?.participant || msg.key?.remoteJid || msg.from;
  const equipo = obtenerEquipoUsuario(usuarioId, usuario) || detectarEquipo(usuario);
  const tienda = obtenerTiendaPorEquipo(equipo);

  if (!tienda) {
    sock.sendMessage(msg.key.remoteJid, { text: '🚫 No se pudo detectar tu equipo para ver los productos.' }, { quoted: msg });
    return;
  }

  const mensaje = tienda.emoji === '🩸' && tienda.encabezado
    ? `${tienda.encabezado}\n\n${construirListaProductosAgrupados(tienda)}\n\n${construirSeccionYaTenes(tienda, usuarioId)}\n\n${tienda.pie || ''}`
    : `🛒 *Productos de ${tienda.equipo}* ${tienda.emoji}\n\n` + construirListaProductos(tienda) + `\n\n${construirSeccionYaTenes(tienda, usuarioId)}`;

  sock.sendMessage(msg.key.remoteJid, { text: mensaje }, { quoted: msg });
}

async function mostrarInventario(sock, msg) {
  const usuario = await obtenerNombreRemitente(sock, msg);
  const usuarioId = msg.key?.participant || msg.key?.remoteJid || msg.from;
  const equipo = obtenerEquipoUsuario(usuarioId, usuario) || detectarEquipo(usuario);
  const inventario = obtenerInventario(usuarioId);

  const nombreLimpio = String(usuario || 'Miembro')
    .replace(/[🍥🩸🔰]/g, '')
    .trim() || 'Miembro';

  const miembro = `@${nombreLimpio.replace(/\s+/g, '') || 'Miembro'}`;
  const nombreEquipo = equipo?.nombre || 'Sin equipo asignado';
  const emojiEquipo = equipo?.emoji || '❓';

  if (!inventario.length) {
    const mensajeVacio = `🎒 INVENTARIO PERSONAL
╭─────────────────────────────╮
❌ Aún no tienes objetos comprados
╰─────────────────────────────╯

💡 Visitá la tienda de tu equipo:
🩸 /tienda jujutsu
🍥 /tienda naruto
🔰 /tienda hunter`;

    await sock.sendMessage(msg.key.remoteJid, { text: mensajeVacio }, { quoted: msg });
    return;
  }

  const listaObjetos = inventario
    .map((producto) => `${producto.emoji || '📦'} ${producto.id}. ${producto.nombre} · ${producto.precio.toLocaleString('es-AR')} pts · ✅ ${producto.fechaCompra || 'Sin fecha'}`)
    .join('\n');

  const mensaje = `🎒 INVENTARIO PERSONAL
╭─────────────────────────────╮
${emojiEquipo} Miembro: ${miembro}
📦 Equipo: ${emojiEquipo} ${nombreEquipo}
📋 Total de objetos: ${inventario.length}
╰─────────────────────────────╯

📜 OBJETOS ADQUIRIDOS:
───────────────────────────
${listaObjetos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 ¡Seguí equipando a tu personaje con /tienda! 🛒✨`;

  await sock.sendMessage(msg.key.remoteJid, { text: mensaje }, { quoted: msg });
}

async function comprarProducto(sock, msg, texto) {
  const usuario = await obtenerNombreRemitente(sock, msg);
  const usuarioId = msg.key?.participant || msg.key?.remoteJid || msg.from;
  const equipo = obtenerEquipoUsuario(usuarioId, usuario) || detectarEquipo(usuario);

  if (!equipo) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: '⚠️ No pertenecés a ningún equipo.\n\nRegistrate con /registrar o elegí tu equipo con /elegir-equipo para poder comprar en la tienda correspondiente.'
    }, { quoted: msg });
    return;
  }

  const tienda = obtenerTiendaPorEquipo(equipo);

  if (!tienda) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: '🚫 No se pudo cargar la tienda de tu equipo.'
    }, { quoted: msg });
    return;
  }

  const args = (texto || '').trim().split(/\s+/).filter(Boolean);
  const productoId = Number(args[0]);

  if (!args.length || !Number.isInteger(productoId)) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: `📝 *Uso correcto:* /comprar [ID del producto]\nEjemplo: */comprar 14*\n\nRevisá los IDs disponibles con:\n🩸 /tienda jujutsu\n🍥 /tienda naruto\n🔰 /tienda hunter`
    }, { quoted: msg });
    return;
  }

  const producto = buscarProductoEnTienda(tienda, productoId);

  if (!producto) {
    const nombreTienda = tienda.emoji === '🩸' ? 'jujutsu' : tienda.emoji === '🍥' ? 'naruto' : 'hunter';
    await sock.sendMessage(msg.key.remoteJid, {
      text: `⛔ Producto no encontrado. Verificá el ID con /tienda ${nombreTienda}.`
    }, { quoted: msg });
    return;
  }

  if (tieneProducto(usuarioId, productoId)) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: `✅ Ya tienes este objeto en tu inventario. No se puede comprar nuevamente.\n\n📦 ${producto.emoji} ${producto.nombre}`
    }, { quoted: msg });
    return;
  }

  const requisito = Number(tienda.productoRequisitoId || 0);
  if (requisito && producto.id !== requisito && !tieneRequisitoCompra(usuarioId, tienda)) {
    const textoRequisito = tienda.emoji === '🩸'
      ? '📋 Carnet de Grado 4'
      : tienda.emoji === '🍥'
        ? '📋 Carnet Genin'
        : '📋 Certificación oficial';

    await sock.sendMessage(msg.key.remoteJid, {
      text: `⚠️ *REQUISITO INCUMPLIDO*\n\nPrimero debes comprar tu certificación oficial:\n\n${textoRequisito}\n💰 Precio: 100.000 pts\n\n✅ Compralo con: */comprar ${requisito}*`
    }, { quoted: msg });
    return;
  }

  const puntosActuales = obtenerPuntajeUsuario(usuarioId);

  if (puntosActuales < producto.precio) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: `❌ No tenés suficientes puntos.\n\n📦 ${producto.emoji} ${producto.nombre}\n💸 Necesitás: ${producto.precio.toLocaleString()} pts\n🟡 Tenés: ${puntosActuales.toLocaleString()} pts`
    }, { quoted: msg });
    return;
  }

  const puntosRestantes = descontarPuntos(usuarioId, producto.precio);
  agregarAInventario(usuarioId, {
    id: producto.id,
    nombre: producto.nombre,
    emoji: producto.emoji,
    precio: producto.precio,
    fechaCompra: new Date().toISOString().split('T')[0]
  });

  const mensaje = `✅ COMPRA REALIZADA CON ÉXITO 🛒\n` +
    `───────────────────────────\n` +
    `📦 ${producto.emoji} ${producto.nombre}\n` +
    `💸 Precio: ${producto.precio.toLocaleString()} pts\n` +
    `🟢 Puntos restantes: ${puntosRestantes.toLocaleString()} pts\n\n` +
    `¡Agregado a tu ficha! 🎉`;

  await sock.sendMessage(msg.key.remoteJid, { text: mensaje }, { quoted: msg });
}

export function activarTiendas(sock) {
  sock.ev.on('messages.upsert', async (update) => {
    if (!update.messages?.length) return;

    for (const msg of update.messages) {
      if (!msg.message || msg.key?.fromMe) continue;

      const text = msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption || '';

      if (!text) continue;

      const trimmed = text.trim();

      // /tienda -> muestra ayuda con las tres tiendas disponibles
      if (trimmed === '/tienda') {
        await mostrarAyudaTiendas(sock, msg);
        continue;
      }

      // /tienda jujutsu -> muestra la tienda del equipo Jujutsu Kaisen
      // /tienda naruto -> muestra la tienda del equipo Naruto
      // /tienda hunter -> muestra la tienda del equipo Hunter × Hunter
      const tiendaCoincidencia = trimmed.match(/^\/tienda\s+(.+)$/i);
      if (tiendaCoincidencia) {
        const nombreTienda = tiendaCoincidencia[1].trim().toLowerCase();
        const tiendasDisponibles = ['jujutsu', 'naruto', 'hunter'];

        if (tiendasDisponibles.includes(nombreTienda)) {
          await mostrarTiendas(sock, msg, nombreTienda);
          continue;
        }

        await mostrarAyudaTiendas(sock, msg);
        continue;
      }

      if (trimmed.startsWith('/productos')) {
        await mostrarProductos(sock, msg);
      }

      // /inventario -> muestra los productos comprados por el usuario actual
      if (trimmed.startsWith('/inventario')) {
        await mostrarInventario(sock, msg);
        continue;
      }

      if (trimmed.startsWith('/comprar')) {
        await comprarProducto(sock, msg, trimmed.replace(/^\/comprar\s*/i, ''));
      }
    }
  });
}
