import { db } from '../../db.js';

let tablasPreparadas;

const COMANDOS = ['/equipos', '/teams', '/tiendas', '/misiones', '/dinamicas', '/puntos'];

function normalizarJid(jid) {
  return String(jid || '').toLowerCase().split(':')[0];
}

function extraerTexto(msg) {
  const mensaje = msg?.message?.ephemeralMessage?.message ||
    msg?.message?.viewOnceMessage?.message ||
    msg?.message;
  return (
    mensaje?.conversation ||
    mensaje?.extendedTextMessage?.text ||
    mensaje?.imageMessage?.caption ||
    mensaje?.videoMessage?.caption ||
    ''
  ).trim();
}

function esGrupo(grupoId) {
  return String(grupoId || '').endsWith('@g.us');
}

async function columnas(tabla) {
  return new Set((await db.all(`PRAGMA table_info(${tabla})`)).map((columna) => columna.name));
}

async function agregarColumnaSiFalta(tabla, nombre, definicion, existentes) {
  if (!existentes.has(nombre)) {
    await db.run(`ALTER TABLE ${tabla} ADD COLUMN ${nombre} ${definicion}`);
    existentes.add(nombre);
  }
}

export async function prepararTablasEquipos() {
  if (!tablasPreparadas) {
    tablasPreparadas = (async () => {
      await db.run('PRAGMA foreign_keys = ON');
      await db.run(`CREATE TABLE IF NOT EXISTS equipos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_con_emoji TEXT NOT NULL,
        grupo_id TEXT NOT NULL,
        admin_id TEXT NOT NULL,
        creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        activo INTEGER NOT NULL DEFAULT 1
      )`);
      await db.run(`CREATE TABLE IF NOT EXISTS perfiles (
        id_usuario TEXT PRIMARY KEY,
        team_id INTEGER NOT NULL,
        puntos_totales INTEGER NOT NULL DEFAULT 0,
        inventario TEXT NOT NULL DEFAULT '[]',
        creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES equipos(id) ON DELETE RESTRICT
      )`);
      await db.run(`CREATE TABLE IF NOT EXISTS tiendas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        grupo_id TEXT NOT NULL,
        nombre TEXT NOT NULL,
        productos TEXT NOT NULL DEFAULT '[]',
        creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        activo INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (team_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);
      await db.run(`CREATE TABLE IF NOT EXISTS misiones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        puntos_recompensa INTEGER NOT NULL,
        grupo_id TEXT NOT NULL,
        activo INTEGER NOT NULL DEFAULT 1,
        creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);
      await db.run(`CREATE TABLE IF NOT EXISTS misiones_completadas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mision_id INTEGER NOT NULL,
        id_usuario TEXT NOT NULL,
        completado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (mision_id, id_usuario),
        FOREIGN KEY (mision_id) REFERENCES misiones(id) ON DELETE CASCADE,
        FOREIGN KEY (id_usuario) REFERENCES perfiles(id_usuario) ON DELETE CASCADE
      )`);
      await db.run(`CREATE TABLE IF NOT EXISTS dinamicas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        grupo_id TEXT NOT NULL,
        activo INTEGER NOT NULL DEFAULT 1,
        creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (team_id, tipo),
        FOREIGN KEY (team_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);
      await db.run(`CREATE TABLE IF NOT EXISTS puntos_equipos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        id_usuario TEXT NOT NULL,
        cantidad INTEGER NOT NULL,
        motivo TEXT NOT NULL DEFAULT '',
        creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES equipos(id) ON DELETE CASCADE,
        FOREIGN KEY (id_usuario) REFERENCES perfiles(id_usuario) ON DELETE CASCADE
      )`);
      await db.run(`CREATE TABLE IF NOT EXISTS puntos_ajustes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        cantidad INTEGER NOT NULL,
        motivo TEXT NOT NULL DEFAULT '',
        admin_id TEXT NOT NULL,
        legacy_id INTEGER UNIQUE,
        creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES equipos(id) ON DELETE CASCADE
      )`);

      await db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_equipos_nombre_grupo ON equipos (grupo_id, nombre_con_emoji COLLATE NOCASE)');
      await db.run('CREATE INDEX IF NOT EXISTS idx_equipos_grupo_activo ON equipos (grupo_id, activo)');
      await db.run('CREATE INDEX IF NOT EXISTS idx_misiones_team_activo ON misiones (team_id, activo)');

      const legacyTeams = await columnas('teams').catch(() => new Set());
      if (legacyTeams.size) {
        const filas = await db.all('SELECT * FROM teams');
        for (const fila of filas) {
          const nombre = fila.nombre_con_emoji || fila.nombre;
          if (!nombre || !fila.grupo_id) continue;
          await db.run(
            `INSERT OR IGNORE INTO equipos
              (id, nombre_con_emoji, grupo_id, admin_id, creado_en, activo)
             VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?)`,
            [
              Number(fila.id),
              String(nombre),
              String(fila.grupo_id),
              String(fila.propietario_id || fila.propietario || 'desconocido'),
              fila.creado_en || null,
              fila.estado === 'inactivo' ? 0 : 1
            ]
          );
        }
      }

      const legacyStores = await columnas('tiendas');
      await agregarColumnaSiFalta('tiendas', 'team_id', 'INTEGER REFERENCES equipos(id) ON DELETE CASCADE', legacyStores);
      await agregarColumnaSiFalta('tiendas', 'grupo_id', "TEXT NOT NULL DEFAULT ''", legacyStores);
      await agregarColumnaSiFalta('tiendas', 'nombre', "TEXT NOT NULL DEFAULT ''", legacyStores);
      await agregarColumnaSiFalta('tiendas', 'productos', "TEXT NOT NULL DEFAULT '[]'", legacyStores);
      await agregarColumnaSiFalta('tiendas', 'creado_en', 'TEXT', legacyStores);
      await agregarColumnaSiFalta('tiendas', 'activo', 'INTEGER NOT NULL DEFAULT 1', legacyStores);

      const currentColumns = await columnas('tiendas');
      if (currentColumns.has('id_team')) {
        await db.run('UPDATE tiendas SET team_id = id_team WHERE team_id IS NULL AND id_team IS NOT NULL');
      }
      if (currentColumns.has('nombre_con_emoji')) {
        await db.run("UPDATE tiendas SET nombre = nombre_con_emoji WHERE nombre = '' AND nombre_con_emoji IS NOT NULL");
      }
      if (currentColumns.has('estado')) {
        await db.run("UPDATE tiendas SET activo = CASE WHEN estado = 'activo' THEN 1 ELSE 0 END WHERE estado IS NOT NULL");
      }
      await db.run('CREATE INDEX IF NOT EXISTS idx_tiendas_team ON tiendas (team_id, grupo_id)');
      await db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_tiendas_team_unique ON tiendas (team_id) WHERE team_id IS NOT NULL');

      const legacyPoints = await columnas('puntos');
      if (['id_team', 'grupo_id', 'cantidad', 'motivo', 'usuario_id'].every((name) => legacyPoints.has(name))) {
        const filas = await db.all(
          `SELECT p.id, p.id_team, p.grupo_id, p.cantidad, p.motivo, p.usuario_id
           FROM puntos p JOIN equipos e ON e.id = p.id_team AND e.grupo_id = p.grupo_id`
        );
        for (const fila of filas) {
          await db.run(
            `INSERT OR IGNORE INTO puntos_ajustes
              (team_id, cantidad, motivo, admin_id, legacy_id)
             VALUES (?, ?, ?, ?, ?)`,
            [fila.id_team, fila.cantidad, fila.motivo || '', fila.usuario_id || 'sistema', fila.id]
          );
        }
      }
    })().catch((error) => {
      tablasPreparadas = null;
      throw error;
    });
  }
  await tablasPreparadas;
}

export async function obtenerEquipo(teamId, grupoId) {
  await prepararTablasEquipos();
  return db.get(
    'SELECT id, nombre_con_emoji, grupo_id, admin_id, activo FROM equipos WHERE id = ? AND grupo_id = ? AND activo = 1',
    [Number(teamId), grupoId]
  );
}

export async function obtenerPerfilEquipo(idUsuario) {
  await prepararTablasEquipos();
  return db.get(
    `SELECT p.id_usuario, p.team_id, p.puntos_totales, p.inventario, p.creado_en,
            e.nombre_con_emoji, e.grupo_id
     FROM perfiles p JOIN equipos e ON e.id = p.team_id
     WHERE p.id_usuario = ?`,
    [String(idUsuario || '')]
  );
}

export async function registrarPuntosEquipo(idUsuario, teamId, cantidad, motivo = '') {
  await prepararTablasEquipos();
  const perfil = await db.get(
    'SELECT id_usuario, team_id, puntos_totales FROM perfiles WHERE id_usuario = ?',
    [String(idUsuario || '')]
  );
  if (!perfil || Number(perfil.team_id) !== Number(teamId)) {
    return false;
  }
  const nuevoTotal = Math.max(0, Number(perfil.puntos_totales || 0) + Number(cantidad || 0));
  const cambio = nuevoTotal - Number(perfil.puntos_totales || 0);
  await db.run('UPDATE perfiles SET puntos_totales = ? WHERE id_usuario = ?', [nuevoTotal, perfil.id_usuario]);
  if (cambio !== 0) {
    await db.run(
      'INSERT INTO puntos_equipos (team_id, id_usuario, cantidad, motivo) VALUES (?, ?, ?, ?)',
      [Number(teamId), perfil.id_usuario, cambio, String(motivo || '')]
    );
  }
  return true;
}

async function esAdminGrupo(sock, grupoId, remitente) {
  try {
    const metadata = await sock.groupMetadata(grupoId);
    const participante = metadata?.participants?.find(
      (item) => normalizarJid(item.id || item.jid) === normalizarJid(remitente)
    );
    return Boolean(participante && (
      ['admin', 'superadmin', 'owner'].includes(participante.admin || '') ||
      participante.isAdmin ||
      participante.isSuperAdmin
    ));
  } catch (error) {
    console.error(`No se pudieron leer administradores de ${grupoId}:`, error?.message || error);
    return null;
  }
}

async function esAdminTeam(sock, team, remitente) {
  if (normalizarJid(team.admin_id) === normalizarJid(remitente)) return true;
  return (await esAdminGrupo(sock, team.grupo_id, remitente)) === true;
}

async function responder(sock, msg, texto) {
  await sock.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg });
}

function parsearProductos(texto) {
  const entrada = String(texto || '').trim();
  if (!entrada) return [];
  try {
    const json = JSON.parse(entrada);
    if (Array.isArray(json)) return json;
  } catch {
    // Los productos también se aceptan como una lista separada por comas.
  }
  return entrada.split(',').map((producto) => producto.trim()).filter(Boolean);
}

async function ejecutarEquipos(sock, msg, accion, valor, remitente, grupoId) {
  if (accion === 'lista') {
    const equipos = await db.all(
      'SELECT id, nombre_con_emoji FROM equipos WHERE grupo_id = ? AND activo = 1 ORDER BY id',
      [grupoId]
    );
    await responder(sock, msg, equipos.length
      ? `📋 Teams disponibles:\n${equipos.map((team) => `ID ${team.id} · ${team.nombre_con_emoji}`).join('\n')}`
      : '📭 No hay Teams en este grupo.');
    return;
  }

  if (!['crear', 'editar', 'eliminar'].includes(accion)) {
    await responder(sock, msg, 'Uso: /equipos crear [nombre + emoji] | lista | editar [id] [nuevo nombre] | eliminar [id]');
    return;
  }
  if ((await esAdminGrupo(sock, grupoId, remitente)) !== true) {
    await responder(sock, msg, '⛔ Solo los administradores del grupo pueden crear o modificar Teams.');
    return;
  }

  if (accion === 'crear') {
    const nombre = valor.trim();
    if (!nombre) {
      await responder(sock, msg, 'Uso: /equipos crear [nombre + emoji]');
      return;
    }
    const existe = await db.get(
      'SELECT id FROM equipos WHERE grupo_id = ? AND nombre_con_emoji = ? COLLATE NOCASE',
      [grupoId, nombre]
    );
    if (existe) {
      await responder(sock, msg, '⚠️ Ya existe un Team con ese nombre en este grupo.');
      return;
    }
    const resultado = await db.run(
      'INSERT INTO equipos (nombre_con_emoji, grupo_id, admin_id) VALUES (?, ?, ?)',
      [nombre, grupoId, remitente]
    );
    console.log(`Equipo creado: ID ${resultado.lastID}`);
    await responder(sock, msg, `✅ Team "${nombre}" creado. ID: ${resultado.lastID}`);
    return;
  }

  const match = valor.match(/^(\d+)(?:\s+([\s\S]+))?$/);
  if (!match) {
    await responder(sock, msg, accion === 'editar'
      ? 'Uso: /equipos editar [id] [nuevo nombre]'
      : 'Uso: /equipos eliminar [id]');
    return;
  }
  const [, idTexto, nombre] = match;
  const teamId = Number(idTexto);
  const team = await obtenerEquipo(teamId, grupoId);
  if (!team) {
    await responder(sock, msg, 'Ese equipo no existe.');
    return;
  }
  if (accion === 'editar') {
    const nuevoNombre = String(nombre || '').trim();
    if (!nuevoNombre) {
      await responder(sock, msg, 'Uso: /equipos editar [id] [nuevo nombre]');
      return;
    }
    const duplicado = await db.get(
      'SELECT id FROM equipos WHERE grupo_id = ? AND nombre_con_emoji = ? COLLATE NOCASE AND id <> ?',
      [grupoId, nuevoNombre, teamId]
    );
    if (duplicado) {
      await responder(sock, msg, '⚠️ Ya existe un Team con ese nombre en este grupo.');
      return;
    }
    await db.run('UPDATE equipos SET nombre_con_emoji = ? WHERE id = ? AND grupo_id = ?', [
      nuevoNombre, teamId, grupoId
    ]);
    await responder(sock, msg, `✅ Team ${teamId} actualizado.`);
    return;
  }

  const miembros = await db.get('SELECT COUNT(*) AS total FROM perfiles WHERE team_id = ?', [teamId]);
  if (Number(miembros.total) > 0) {
    await responder(sock, msg, `⚠️ No se puede eliminar el Team ${teamId}: todavía tiene ${miembros.total} miembro(s).`);
    return;
  }
  await db.run('DELETE FROM equipos WHERE id = ? AND grupo_id = ?', [teamId, grupoId]);
  await responder(sock, msg, `✅ Team ${teamId} eliminado.`);
}

async function ejecutarTiendas(sock, msg, accion, valor, remitente, grupoId) {
  if (accion === 'agregar') {
    const delimitado = valor.match(/^(\d+)\s+([\s\S]+?)\s*\|\s*([\s\S]*)$/);
    const match = valor.match(/^(\d+)\s+(?:"([^"]+)"|'([^']+)'|(\S+))(?:\s+([\s\S]*))?$/);
    if (!match) {
      await responder(sock, msg, 'Uso: /tiendas agregar [team_id] [nombre] [productos separados por coma]');
      return;
    }
    const idTexto = delimitado?.[1] || match[1];
    const nombreTexto = delimitado?.[2] || match[2] || match[3] || match[4];
    const productosTexto = delimitado?.[3] ?? match[5] ?? '';
    const team = await obtenerEquipo(idTexto, grupoId);
    if (!team) {
      await responder(sock, msg, 'Ese equipo no existe.');
      return;
    }
    if (!(await esAdminTeam(sock, team, remitente))) {
      await responder(sock, msg, '⛔ Solo los administradores del Team pueden configurar su tienda.');
      return;
    }
    const productos = parsearProductos(productosTexto);
    if (!nombreTexto.trim()) {
      await responder(sock, msg, 'El nombre de la tienda es obligatorio.');
      return;
    }
    const existente = await db.get('SELECT id FROM tiendas WHERE team_id = ?', [team.id]);
    if (existente) {
      await db.run(
        'UPDATE tiendas SET nombre = ?, productos = ?, activo = 1 WHERE id = ?',
        [nombreTexto.trim(), JSON.stringify(productos), existente.id]
      );
      await responder(sock, msg, `✅ Tienda del Team ${team.id} actualizada.`);
      return;
    }
    await db.run(
      'INSERT INTO tiendas (team_id, grupo_id, nombre, productos) VALUES (?, ?, ?, ?)',
      [team.id, grupoId, nombreTexto.trim(), JSON.stringify(productos)]
    );
    await responder(sock, msg, `✅ Tienda "${nombreTexto.trim()}" creada para Team ${team.id}.`);
    return;
  }
  if (accion !== 'ver' || !/^\d+$/.test(valor)) {
    await responder(sock, msg, 'Uso: /tiendas agregar [team_id] [nombre] [productos] o /tiendas ver [team_id]');
    return;
  }
  const team = await obtenerEquipo(valor, grupoId);
  if (!team) {
    await responder(sock, msg, 'Ese equipo no existe.');
    return;
  }
  const tienda = await db.get(
    'SELECT nombre, productos FROM tiendas WHERE team_id = ? AND grupo_id = ? AND activo = 1',
    [team.id, grupoId]
  );
  if (!tienda) {
    await responder(sock, msg, `🏪 ${team.nombre_con_emoji} todavía no tiene una tienda configurada.`);
    return;
  }
  let productos = [];
  try {
    productos = JSON.parse(tienda.productos || '[]');
  } catch (error) {
    console.error(`Productos inválidos en tienda del Team ${team.id}:`, error?.message || error);
  }
  await responder(sock, msg, `🏪 ${tienda.nombre} · ${team.nombre_con_emoji}\n\n${productos.length
    ? productos.map((producto, index) => `• ${typeof producto === 'string' ? producto : JSON.stringify(producto)}`).join('\n')
    : 'Sin productos configurados.'}`);
}

async function ejecutarMisiones(sock, msg, accion, valor, remitente, grupoId) {
  if (accion === 'agregar') {
    const match = valor.match(/^(\d+)\s+(\S+)\s+([\s\S]+?)\s+(\d+)$/);
    if (!match) {
      await responder(sock, msg, 'Uso: /misiones agregar [team_id] [tipo] [descripción] [puntos_recompensa]');
      return;
    }
    const [, teamTexto, tipo, descripcion, puntosTexto] = match;
    const team = await obtenerEquipo(teamTexto, grupoId);
    if (!team) {
      await responder(sock, msg, 'Ese equipo no existe.');
      return;
    }
    if ((await esAdminGrupo(sock, grupoId, remitente)) !== true) {
      await responder(sock, msg, '⛔ Solo los administradores del grupo pueden configurar misiones.');
      return;
    }
    const puntos = Number(puntosTexto);
    if (!Number.isSafeInteger(puntos) || puntos < 1) {
      await responder(sock, msg, 'Los puntos de recompensa deben ser un entero positivo.');
      return;
    }
    const resultado = await db.run(
      `INSERT INTO misiones (team_id, tipo, descripcion, puntos_recompensa, grupo_id)
       VALUES (?, ?, ?, ?, ?)`,
      [team.id, tipo, descripcion.trim(), puntos, grupoId]
    );
    await responder(sock, msg, `✅ Misión ${resultado.lastID} agregada a ${team.nombre_con_emoji}.`);
    return;
  }
  if (accion === 'lista' && /^\d+$/.test(valor)) {
    const team = await obtenerEquipo(valor, grupoId);
    if (!team) {
      await responder(sock, msg, 'Ese equipo no existe.');
      return;
    }
    const misiones = await db.all(
      `SELECT id, tipo, descripcion, puntos_recompensa FROM misiones
       WHERE team_id = ? AND grupo_id = ? AND activo = 1 ORDER BY id`,
      [team.id, grupoId]
    );
    await responder(sock, msg, misiones.length
      ? `📋 Misiones de ${team.nombre_con_emoji}:\n${misiones.map((mision) =>
        `#${mision.id} · ${mision.tipo}: ${mision.descripcion} (+${mision.puntos_recompensa} pts)`
      ).join('\n')}`
      : `No hay misiones activas para ${team.nombre_con_emoji}.`);
    return;
  }
  if (accion === 'completar' && /^\d+$/.test(valor)) {
    const perfil = await obtenerPerfilEquipo(remitente);
    if (!perfil) {
      await responder(sock, msg, 'Necesitas un perfil: /crearperfil');
      return;
    }
    const mision = await db.get(
      `SELECT id, team_id, tipo, puntos_recompensa FROM misiones
       WHERE id = ? AND activo = 1 AND grupo_id = ?`,
      [Number(valor), grupoId]
    );
    if (!mision || Number(mision.team_id) !== Number(perfil.team_id)) {
      await responder(sock, msg, 'Esa misión no existe para tu Team.');
      return;
    }
    const completada = await db.get(
      'SELECT id FROM misiones_completadas WHERE mision_id = ? AND id_usuario = ?',
      [mision.id, remitente]
    );
    if (completada) {
      await responder(sock, msg, 'Ya completaste esta misión.');
      return;
    }
    await db.run(
      'INSERT INTO misiones_completadas (mision_id, id_usuario) VALUES (?, ?)',
      [mision.id, remitente]
    );
    await registrarPuntosEquipo(remitente, mision.team_id, mision.puntos_recompensa, `Misión ${mision.id}`);
    await responder(sock, msg, `🎉 Misión completada. Recibiste ${mision.puntos_recompensa} puntos para ti y tu Team.`);
    return;
  }
  await responder(sock, msg, 'Uso: /misiones agregar [team_id] [tipo] [descripción] [puntos] | lista [team_id] | completar [id_mision]');
}

async function ejecutarDinamicas(sock, msg, accion, valor, remitente, grupoId) {
  if (accion === 'activar') {
    const match = valor.match(/^(\d+)\s+(\S+)$/);
    if (!match) {
      await responder(sock, msg, 'Uso: /dinamicas activar [team_id] [tipo]');
      return;
    }
    const [, teamTexto, tipo] = match;
    const team = await obtenerEquipo(teamTexto, grupoId);
    if (!team) {
      await responder(sock, msg, 'Ese equipo no existe.');
      return;
    }
    if ((await esAdminGrupo(sock, grupoId, remitente)) !== true) {
      await responder(sock, msg, '⛔ Solo los administradores del grupo pueden activar dinámicas.');
      return;
    }
    await db.run(
      `INSERT INTO dinamicas (team_id, tipo, grupo_id, activo) VALUES (?, ?, ?, 1)
       ON CONFLICT(team_id, tipo) DO UPDATE SET activo = 1, grupo_id = excluded.grupo_id`,
      [team.id, tipo, grupoId]
    );
    await responder(sock, msg, `✅ Dinámica "${tipo}" activada para ${team.nombre_con_emoji}.`);
    return;
  }
  if (accion === 'lista' && /^\d+$/.test(valor)) {
    const team = await obtenerEquipo(valor, grupoId);
    if (!team) {
      await responder(sock, msg, 'Ese equipo no existe.');
      return;
    }
    const dinamicas = await db.all(
      'SELECT tipo FROM dinamicas WHERE team_id = ? AND grupo_id = ? AND activo = 1 ORDER BY id',
      [team.id, grupoId]
    );
    await responder(sock, msg, dinamicas.length
      ? `🎮 Dinámicas de ${team.nombre_con_emoji}:\n${dinamicas.map((dinamica) => `• ${dinamica.tipo}`).join('\n')}`
      : `No hay dinámicas activas para ${team.nombre_con_emoji}.`);
    return;
  }
  await responder(sock, msg, 'Uso: /dinamicas activar [team_id] [tipo] | lista [team_id]');
}

async function ejecutarPuntos(sock, msg, accion, valor, remitente, grupoId) {
  const [idTexto, cantidadTexto, ...motivoPartes] = valor.split(/\s+/);
  if (!/^\d+$/.test(idTexto || '')) {
    await responder(sock, msg, 'Uso: /puntos ver [team_id] o /puntos agregar|restar [team_id] [cantidad] [motivo]');
    return;
  }
  const team = await obtenerEquipo(idTexto, grupoId);
  if (!team) {
    await responder(sock, msg, 'Ese equipo no existe.');
    return;
  }
  const puntos = await db.get(
    `SELECT
       COALESCE((SELECT SUM(puntos_totales) FROM perfiles WHERE team_id = ?), 0) +
       COALESCE((SELECT SUM(cantidad) FROM puntos_ajustes WHERE team_id = ?), 0) AS total`,
    [team.id, team.id]
  );
  const totalActual = Number(puntos.total);
  if (accion === 'ver') {
    await responder(sock, msg, `🏆 ${team.nombre_con_emoji} (Team ${team.id}): ${totalActual.toLocaleString('es-ES')} pts.`);
    return;
  }
  if (!['agregar', 'restar'].includes(accion)) {
    await responder(sock, msg, 'Uso: /puntos ver [team_id] o /puntos agregar|restar [team_id] [cantidad] [motivo]');
    return;
  }
  if ((await esAdminGrupo(sock, grupoId, remitente)) !== true) {
    await responder(sock, msg, '⛔ Solo los administradores del grupo pueden modificar puntos.');
    return;
  }
  const cantidad = Number(cantidadTexto);
  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    await responder(sock, msg, 'La cantidad debe ser un entero positivo.');
    return;
  }
  const delta = accion === 'restar' ? -cantidad : cantidad;
  if (totalActual + delta < 0) {
    await responder(sock, msg, `El Team ${team.id} solo tiene ${totalActual.toLocaleString('es-ES')} puntos.`);
    return;
  }
  await db.run(
    'INSERT INTO puntos_ajustes (team_id, cantidad, motivo, admin_id) VALUES (?, ?, ?, ?)',
    [team.id, delta, motivoPartes.join(' '), remitente]
  );
  await responder(
    sock,
    msg,
    `✅ Puntos actualizados para Team ${team.id}. Total: ${(totalActual + delta).toLocaleString('es-ES')} pts.`
  );
}

async function ejecutar(sock, msg, context = {}) {
  const grupoId = msg?.key?.remoteJid;
  const remitente = msg?.key?.participant || grupoId;
  if (!esGrupo(grupoId)) {
    await responder(sock, msg, 'Este comando solo está disponible dentro de un grupo.');
    return;
  }
  await prepararTablasEquipos();
  const texto = extraerTexto(msg);
  const comando = context.command || texto.split(/\s+/, 1)[0].toLowerCase();
  const resto = texto.replace(/^\/\S+\s*/i, '').trim();
  const [accion, ...partes] = resto.split(/\s+/);
  const valor = partes.join(' ').trim();

  if (comando === '/equipos' || comando === '/teams') {
    await ejecutarEquipos(sock, msg, accion?.toLowerCase(), valor, remitente, grupoId);
  } else if (comando === '/tiendas') {
    await ejecutarTiendas(sock, msg, accion?.toLowerCase(), valor, remitente, grupoId);
  } else if (comando === '/misiones') {
    await ejecutarMisiones(sock, msg, accion?.toLowerCase(), valor, remitente, grupoId);
  } else if (comando === '/dinamicas') {
    await ejecutarDinamicas(sock, msg, accion?.toLowerCase(), valor, remitente, grupoId);
  } else if (comando === '/puntos') {
    await ejecutarPuntos(sock, msg, accion?.toLowerCase(), valor, remitente, grupoId);
  }
}

export default {
  nombre: 'Equipos, Tiendas, Misiones y Dinámicas',
  descripcion: 'Administra Teams y sus funciones vinculadas en SQLite.',
  comandos: COMANDOS,
  activo: true,
  inicializar: prepararTablasEquipos,
  ejecutar,
  run: ejecutar
};
