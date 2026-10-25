import { db } from '../../db.js';

const ADMIN_IDS = ['PONER_ID_ADMIN_AQUI'];

const RESPUESTAS = {
  soloAdmin: '⛔ Solo los administradores configurados pueden usar estos comandos.',
  ayudaTeams: 'Uso: /teams agregar [nombre] | [descripción]\n/teams lista\n/teams editar [id] [nuevo nombre] | [nueva descripción]\n/teams eliminar [id]',
  ayudaTiendas: 'Uso: /tiendas agregar [nombre] | [ubicación]\n/tiendas lista\n/tiendas editar [id] [nuevo nombre] | [nueva ubicación]\n/tiendas eliminar [id]',
  ayudaEdicionTienda: 'Uso: /tiendas editar [id] [nuevo nombre] | [nueva ubicación]',
  faltanDatos: '⚠️ Faltan datos. Separa el nombre del otro campo con |. Ejemplo: /teams agregar Equipo Azul | Grupo de la comunidad.',
  noEncontrado: (tipo, id) => `⚠️ No se encontró ${tipo} con ID ${id}.`,
  agregado: (tipo, id) => `✅ ${tipo} agregado correctamente. ID: ${id}.`,
  actualizado: (tipo, id) => `✅ ${tipo} con ID ${id} actualizado correctamente.`,
  eliminado: (tipo, id) => `✅ ${tipo} con ID ${id} eliminado correctamente.`,
  sinRegistros: (tipo) => `📭 Todavía no hay ${tipo} registrados.`,
  error: '⚠️ Ocurrió un error al procesar el comando. Revisa el registro del bot e inténtalo de nuevo.',
  estado: (equipos, tiendas) => `✅ Plugin Teams y Tiendas activo.\n👥 Equipos: ${equipos}\n🏪 Tiendas: ${tiendas}`
};

const COMANDOS = ['/teams', '/tiendas', '/teams_tiendas'];
let tablasPreparadas;

function obtenerTexto(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).trim();
}

function esAdmin(remitente) {
  const permitidos = ADMIN_IDS
    .map((id) => id.trim())
    .filter((id) => id && id !== 'PONER_ID_ADMIN_AQUI');

  return permitidos.includes(remitente);
}

function separarCampos(texto) {
  const delimitador = texto.indexOf('|');
  if (delimitador >= 0) {
    return [
      texto.slice(0, delimitador).trim(),
      texto.slice(delimitador + 1).trim()
    ];
  }

  const [primerCampo, ...resto] = texto.trim().split(/\s+/);
  return [primerCampo || '', resto.join(' ').trim()];
}

function validarId(id) {
  return /^\d+$/.test(id);
}

async function prepararTablas() {
  if (!tablasPreparadas) {
    tablasPreparadas = Promise.all([
      db.run(`CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        ubicacion TEXT,
        propietario TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'activo'
      )`),
      db.run(`CREATE TABLE IF NOT EXISTS tiendas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        ubicacion TEXT NOT NULL,
        propietario TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'activo'
      )`)
    ]).catch((error) => {
      tablasPreparadas = null;
      throw error;
    });
  }

  await tablasPreparadas;
}

async function responder(sock, msg, texto) {
  await sock.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg });
}

async function listar(tipo, sock, msg) {
  const tabla = tipo === 'teams' ? 'teams' : 'tiendas';
  const etiqueta = tipo === 'teams' ? 'equipos' : 'tiendas';
  const filas = await db.all(
    `SELECT id, nombre, descripcion, ubicacion, propietario, estado FROM ${tabla} ORDER BY id`
  );

  if (!filas.length) {
    await responder(sock, msg, RESPUESTAS.sinRegistros(etiqueta));
    return;
  }

  const listado = filas.map((fila) => {
    const detalle = tipo === 'teams'
      ? `📝 ${fila.descripcion}`
      : `📍 ${fila.ubicacion}`;
    return `ID ${fila.id} · ${fila.nombre}\n${detalle}\n🔘 Estado: ${fila.estado}`;
  }).join('\n\n');

  await responder(sock, msg, `${tipo === 'teams' ? '👥 Equipos' : '🏪 Tiendas'}:\n\n${listado}`);
}

async function agregar(tipo, valor, propietario, sock, msg) {
  const [nombre, detalle] = separarCampos(valor);
  if (!nombre || !detalle) {
    await responder(sock, msg, RESPUESTAS.faltanDatos);
    return;
  }

  const tabla = tipo === 'teams' ? 'teams' : 'tiendas';
  const columnaDetalle = tipo === 'teams' ? 'descripcion' : 'ubicacion';
  const resultado = await db.run(
    `INSERT INTO ${tabla} (nombre, ${columnaDetalle}, propietario, estado) VALUES (?, ?, ?, 'activo')`,
    [nombre, detalle, propietario]
  );
  await responder(sock, msg, RESPUESTAS.agregado(tipo === 'teams' ? 'Equipo' : 'Tienda', resultado.lastID));
}

async function editar(tipo, valor, sock, msg) {
  const match = valor.match(/^(\d+)\s+([\s\S]+)$/);
  if (!match) {
    await responder(sock, msg, tipo === 'teams' ? RESPUESTAS.ayudaTeams : RESPUESTAS.ayudaEdicionTienda);
    return;
  }

  const [, id, cambios] = match;
  const [nombre, detalle] = separarCampos(cambios);
  if (!validarId(id) || !nombre || !detalle) {
    await responder(sock, msg, RESPUESTAS.faltanDatos);
    return;
  }

  const tabla = tipo === 'teams' ? 'teams' : 'tiendas';
  const columnaDetalle = tipo === 'teams' ? 'descripcion' : 'ubicacion';
  const resultado = await db.run(
    `UPDATE ${tabla} SET nombre = ?, ${columnaDetalle} = ? WHERE id = ?`,
    [nombre, detalle, Number(id)]
  );

  if (!resultado.changes) {
    await responder(sock, msg, RESPUESTAS.noEncontrado(tipo === 'teams' ? 'el equipo' : 'la tienda', id));
    return;
  }
  await responder(sock, msg, RESPUESTAS.actualizado(tipo === 'teams' ? 'Equipo' : 'Tienda', id));
}

async function eliminar(tipo, valor, sock, msg) {
  const id = valor.trim();
  if (!validarId(id)) {
    await responder(sock, msg, `⚠️ Indica un ID numérico.\n${tipo === 'teams' ? RESPUESTAS.ayudaTeams : RESPUESTAS.ayudaTiendas}`);
    return;
  }

  const tabla = tipo === 'teams' ? 'teams' : 'tiendas';
  const resultado = await db.run(`DELETE FROM ${tabla} WHERE id = ?`, [Number(id)]);
  if (!resultado.changes) {
    await responder(sock, msg, RESPUESTAS.noEncontrado(tipo === 'teams' ? 'el equipo' : 'la tienda', id));
    return;
  }
  await responder(sock, msg, RESPUESTAS.eliminado(tipo === 'teams' ? 'Equipo' : 'Tienda', id));
}

async function ejecutar(sock, msg, context = {}) {
  try {
    const remitente = msg.key.participant || msg.key.remoteJid;
    if (!esAdmin(remitente)) {
      await responder(sock, msg, RESPUESTAS.soloAdmin);
      return;
    }

    await prepararTablas();
    const texto = obtenerTexto(msg);
    const comando = context.command || `/${texto.split(/\s+/)[0]?.replace(/^\//, '')}`;
    const resto = texto.replace(/^\/\S+\s*/i, '').trim();

    if (comando === '/teams_tiendas') {
      const [equipos, tiendas] = await Promise.all([
        db.get('SELECT COUNT(*) AS total FROM teams'),
        db.get('SELECT COUNT(*) AS total FROM tiendas')
      ]);
      await responder(sock, msg, RESPUESTAS.estado(equipos.total, tiendas.total));
      return;
    }

    const tipo = comando === '/teams' ? 'teams' : 'tiendas';
    const [accion, ...partes] = resto.split(/\s+/);
    const valor = partes.join(' ').trim();

    if (accion === 'lista') {
      await listar(tipo, sock, msg);
    } else if (accion === 'agregar') {
      await agregar(tipo, valor, remitente, sock, msg);
    } else if (accion === 'editar') {
      await editar(tipo, valor, sock, msg);
    } else if (accion === 'eliminar') {
      await eliminar(tipo, valor, sock, msg);
    } else {
      await responder(sock, msg, tipo === 'teams' ? RESPUESTAS.ayudaTeams : RESPUESTAS.ayudaTiendas);
    }
  } catch (error) {
    console.error('❌ Error en el plugin teams_tiendas:', error);
    try {
      await responder(sock, msg, RESPUESTAS.error);
    } catch (errorEnvio) {
      console.error('❌ No se pudo enviar el mensaje de error de teams_tiendas:', errorEnvio);
    }
  }
}

const plugin = {
  nombre: 'teams_tiendas',
  descripcion: 'Administración de equipos y tiendas personalizables.',
  comandos: COMANDOS,
  command: COMANDOS,
  commands: COMANDOS,
  activo: true,
  ejecutar,
  run: ejecutar
};

export default plugin;
