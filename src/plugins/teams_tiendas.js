import { db } from '../../db.js';

const RESPUESTAS = {
  soloAdmin: '⛔ Solo un administrador de este grupo o el propietario global del bot puede modificar sus equipos y tiendas.',
  soloGrupo: '⚠️ Este comando solo está disponible dentro de un grupo de WhatsApp.',
  noMetadata: '⚠️ No pude leer los administradores del grupo. Verifica que el bot siga dentro del grupo y vuelve a intentarlo.',
  ayudaTeams: 'Uso: /teams crear [nombre con emoji]\n/teams lista\n/teams editar [id] [nuevo nombre con emoji]\n/teams eliminar [id]\n(Alias compatible: /teams agregar [nombre con emoji])',
  ayudaTiendas: 'Uso: /tiendas agregar [nombre con emoji]\n/tiendas lista\n/tiendas editar [id] [nuevo nombre con emoji]\n/tiendas eliminar [id]',
  ayudaPuntos: 'Uso: /puntos agregar [team_id] [cantidad] [motivo opcional]\n/puntos restar [team_id] [cantidad] [motivo opcional]\n/puntos ver [team_id]',
  ayudaEdicion: (tipo) => `Uso: /${tipo} editar [id] [nuevo nombre con emoji]`,
  faltanDatos: '⚠️ Falta el nombre del equipo o tienda. Ejemplo: /teams crear Team Demon Slayer 🩸',
  noEncontrado: (tipo, id) => `⚠️ No se encontró ${tipo} con ID ${id}.`,
  agregado: (tipo, nombre, id) => `✅ ${tipo} "${nombre}" agregado para este grupo. ID: ${id}.`,
  actualizado: (tipo, id) => `✅ ${tipo} con ID ${id} actualizado correctamente.`,
  eliminado: (tipo, id) => `✅ ${tipo} con ID ${id} eliminado correctamente.`,
  puntosAsociados: (id, total) => `⚠️ No se puede eliminar el Team ${id}: tiene ${total.toLocaleString('es-AR')} movimientos de puntos asociados. Conserva su historial.`,
  puntosInsuficientes: (id, total) => `⚠️ El Team ${id} solo tiene ${total.toLocaleString('es-AR')} puntos; no se puede restar esa cantidad.`,
  puntosActualizados: (accion, id, total) => `✅ Puntos actualizados para Team ${id}. Total: ${total.toLocaleString('es-AR')} pts (operación: ${accion}).`,
  puntosVistos: (id, nombre, total) => `🏆 ${nombre} (Team ${id}): ${total.toLocaleString('es-AR')} pts.`,
  sinRegistros: (tipo) => `📭 Todavía no hay ${tipo} registrados.`,
  error: '⚠️ Ocurrió un error al procesar el comando. Revisa el registro del bot e inténtalo de nuevo.',
  estado: (equipos, tiendas) => `✅ Plugin Teams y Tiendas activo en este grupo.\n👥 Equipos: ${equipos}\n🏪 Tiendas: ${tiendas}`
};

const COMANDOS = ['/teams', '/tiendas', '/teams_tiendas', '/puntos'];
let tablasPreparadas;

function obtenerTexto(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).trim();
}

function normalizarJid(jid) {
  return String(jid || '').toLowerCase().split(':')[0];
}

function esPropietarioGlobal(ownerId, remitente) {
  const propietario = normalizarJid(ownerId);
  const usuario = normalizarJid(remitente);
  if (!propietario || !usuario) return false;
  if (propietario.includes('@')) return propietario === usuario;

  const numeroPropietario = propietario.replace(/\D/g, '');
  const numeroUsuario = usuario.split('@')[0].replace(/\D/g, '');
  return Boolean(numeroPropietario && numeroPropietario === numeroUsuario);
}

async function detectarAdminGrupo(sock, grupoId, remitente) {
  try {
    const metadata = await sock.groupMetadata(grupoId);
    const participante = metadata?.participants?.find(
      (entry) => normalizarJid(entry.id || entry.jid) === normalizarJid(remitente)
    );
    const esAdmin = Boolean(
      participante &&
      (['admin', 'superadmin', 'owner'].includes(participante.admin || '') ||
        participante.isAdmin ||
        participante.isSuperAdmin)
    );

    console.log(`👥 Usuario ${remitente} ${esAdmin ? 'es admin' : 'no es admin'} en grupo ${grupoId}`);
    return esAdmin;
  } catch (error) {
    console.error(`❌ No se pudieron leer los administradores del grupo ${grupoId}:`, error?.message || error);
    return null;
  }
}

function validarId(id) {
  return /^\d+$/.test(id);
}

async function prepararTablas() {
  if (!tablasPreparadas) {
    tablasPreparadas = (async () => {
      const columnasBase = {
        id_team: 'INTEGER',
        grupo_id: 'TEXT',
        propietario_id: 'TEXT',
        nombre_con_emoji: 'TEXT',
        creado_en: 'TEXT',
        nombre: "TEXT NOT NULL DEFAULT ''",
        descripcion: "TEXT NOT NULL DEFAULT ''",
        ubicacion: "TEXT NOT NULL DEFAULT ''",
        propietario: "TEXT NOT NULL DEFAULT ''",
        estado: "TEXT NOT NULL DEFAULT 'activo'"
      };

      for (const tabla of ['teams', 'tiendas']) {
        await db.run(`CREATE TABLE IF NOT EXISTS ${tabla} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          id_team INTEGER UNIQUE,
          grupo_id TEXT,
          propietario_id TEXT,
          nombre_con_emoji TEXT,
          creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
          nombre TEXT NOT NULL DEFAULT '',
          descripcion TEXT NOT NULL DEFAULT '',
          ubicacion TEXT NOT NULL DEFAULT '',
          propietario TEXT NOT NULL DEFAULT '',
          estado TEXT NOT NULL DEFAULT 'activo'
        )`);

        const existentes = await db.all(`PRAGMA table_info(${tabla})`);
        const nombresExistentes = new Set(existentes.map((columna) => columna.name));
        for (const [columna, definicion] of Object.entries(columnasBase)) {
          if (!nombresExistentes.has(columna)) {
            await db.run(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`);
          }
        }

        await db.run(
          `UPDATE ${tabla}
           SET nombre_con_emoji = nombre
           WHERE (nombre_con_emoji IS NULL OR nombre_con_emoji = '') AND nombre <> ''`
        );
        await db.run(`UPDATE ${tabla} SET id_team = id WHERE id_team IS NULL`);
        await db.run(
          `UPDATE ${tabla}
           SET propietario_id = propietario
           WHERE (propietario_id IS NULL OR propietario_id = '') AND propietario <> ''`
        );
        if (tabla === 'teams') {
          await db.run(
            "UPDATE teams SET creado_en = CURRENT_TIMESTAMP WHERE creado_en IS NULL OR creado_en = ''"
          );
        }
        await db.run(`CREATE INDEX IF NOT EXISTS idx_${tabla}_grupo_id ON ${tabla} (grupo_id)`);
        if (tabla === 'teams') {
          await db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_id_team ON teams (id_team)');
        }
      }

      await db.run(`CREATE TABLE IF NOT EXISTS puntos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_team INTEGER NOT NULL,
        grupo_id TEXT NOT NULL,
        usuario_id TEXT NOT NULL,
        cantidad INTEGER NOT NULL,
        motivo TEXT NOT NULL DEFAULT '',
        creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_team) REFERENCES teams (id)
      )`);
      await db.run('CREATE INDEX IF NOT EXISTS idx_puntos_team_grupo ON puntos (id_team, grupo_id)');
    })().catch((error) => {
      tablasPreparadas = null;
      throw error;
    });
  }

  await tablasPreparadas;
}

async function responder(sock, msg, texto) {
  await sock.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg });
}

async function listar(tipo, grupoId, sock, msg) {
  const tabla = tipo === 'teams' ? 'teams' : 'tiendas';
  const etiqueta = tipo === 'teams' ? 'equipos' : 'tiendas';
  const filas = tipo === 'teams'
    ? await db.all(
      `SELECT t.id, t.nombre_con_emoji, t.estado, COALESCE(SUM(p.cantidad), 0) AS puntos
       FROM teams t
       LEFT JOIN puntos p ON p.id_team = t.id AND p.grupo_id = t.grupo_id
       WHERE t.grupo_id = ?
       GROUP BY t.id, t.nombre_con_emoji, t.estado
       ORDER BY t.id`,
      [grupoId]
    )
    : await db.all(
      `SELECT id, nombre_con_emoji, estado FROM tiendas WHERE grupo_id = ? ORDER BY id`,
      [grupoId]
    );

  if (!filas.length) {
    await responder(sock, msg, RESPUESTAS.sinRegistros(etiqueta));
    return;
  }

  const listado = filas.map((fila) => {
    const puntos = tipo === 'teams'
      ? `\n🏆 Puntos: ${Number(fila.puntos).toLocaleString('es-AR')}`
      : '';
    return `ID ${fila.id} · ${fila.nombre_con_emoji}${puntos}\n🔘 Estado: ${fila.estado}`;
  }).join('\n\n');

  await responder(sock, msg, `${tipo === 'teams' ? '👥 Equipos' : '🏪 Tiendas'}:\n\n${listado}`);
}

async function agregar(tipo, nombre, grupoId, propietarioId, sock, msg) {
  if (!nombre.trim()) {
    await responder(sock, msg, RESPUESTAS.faltanDatos);
    return;
  }

  const tabla = tipo === 'teams' ? 'teams' : 'tiendas';
  const resultado = await db.run(
    `INSERT INTO ${tabla}
      (grupo_id, propietario_id, nombre_con_emoji, nombre, descripcion, ubicacion, propietario, estado)
     VALUES (?, ?, ?, ?, '', '', ?, 'activo')`,
    [grupoId, propietarioId, nombre.trim(), nombre.trim(), propietarioId]
  );
  if (tipo === 'teams') {
    await db.run('UPDATE teams SET id_team = ? WHERE id = ? AND grupo_id = ?', [
      resultado.lastID,
      resultado.lastID,
      grupoId
    ]);
    console.log(`✅ Team creado con ID ${resultado.lastID} → listo para recibir puntos`);
  }
  await responder(
    sock,
    msg,
    RESPUESTAS.agregado(tipo === 'teams' ? 'Equipo' : 'Tienda', nombre.trim(), resultado.lastID)
  );
}

async function editar(tipo, valor, grupoId, sock, msg) {
  const match = valor.match(/^(\d+)\s+([\s\S]+)$/);
  if (!match) {
    await responder(sock, msg, RESPUESTAS.ayudaEdicion(tipo));
    return;
  }

  const [, id, nombre] = match;
  if (!validarId(id) || !nombre.trim()) {
    await responder(sock, msg, RESPUESTAS.faltanDatos);
    return;
  }

  const tabla = tipo === 'teams' ? 'teams' : 'tiendas';
  const resultado = await db.run(
    `UPDATE ${tabla}
     SET nombre_con_emoji = ?, nombre = ?
     WHERE id = ? AND grupo_id = ?`,
    [nombre.trim(), nombre.trim(), Number(id), grupoId]
  );

  if (!resultado.changes) {
    await responder(sock, msg, RESPUESTAS.noEncontrado(tipo === 'teams' ? 'el equipo' : 'la tienda', id));
    return;
  }
  await responder(sock, msg, RESPUESTAS.actualizado(tipo === 'teams' ? 'Equipo' : 'Tienda', id));
}

async function eliminar(tipo, valor, grupoId, sock, msg) {
  const id = valor.trim();
  if (!validarId(id)) {
    await responder(sock, msg, `⚠️ Indica un ID numérico.\n${tipo === 'teams' ? RESPUESTAS.ayudaTeams : RESPUESTAS.ayudaTiendas}`);
    return;
  }

  const tabla = tipo === 'teams' ? 'teams' : 'tiendas';
  const resultado = tipo === 'teams'
    ? await db.run(
      `DELETE FROM teams
       WHERE id = ? AND grupo_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM puntos WHERE id_team = teams.id AND grupo_id = teams.grupo_id
         )`,
      [Number(id), grupoId]
    )
    : await db.run(
      'DELETE FROM tiendas WHERE id = ? AND grupo_id = ?',
      [Number(id), grupoId]
    );
  if (!resultado.changes) {
    if (tipo === 'teams') {
      const asociado = await db.get(
        `SELECT COUNT(*) AS total FROM puntos p
         JOIN teams t ON t.id = p.id_team AND t.grupo_id = p.grupo_id
         WHERE p.id_team = ? AND p.grupo_id = ?`,
        [Number(id), grupoId]
      );
      if (asociado.total > 0) {
        await responder(sock, msg, RESPUESTAS.puntosAsociados(Number(id), asociado.total));
        return;
      }
    }
    await responder(sock, msg, RESPUESTAS.noEncontrado(tipo === 'teams' ? 'el equipo' : 'la tienda', id));
    return;
  }
  await responder(sock, msg, RESPUESTAS.eliminado(tipo === 'teams' ? 'Equipo' : 'Tienda', id));
}

async function procesarPuntos(resto, grupoId, remitente, sock, msg) {
  const [accion, idTexto, cantidadTexto, ...motivoPartes] = resto.split(/\s+/);
  if (!['agregar', 'restar', 'ver'].includes(accion) || !validarId(idTexto || '')) {
    await responder(sock, msg, RESPUESTAS.ayudaPuntos);
    return;
  }

  const team = await db.get(
    'SELECT id, nombre_con_emoji FROM teams WHERE id = ? AND grupo_id = ?',
    [Number(idTexto), grupoId]
  );
  if (!team) {
    await responder(sock, msg, RESPUESTAS.noEncontrado('el Team', idTexto));
    return;
  }

  const actual = await db.get(
    'SELECT COALESCE(SUM(cantidad), 0) AS total FROM puntos WHERE id_team = ? AND grupo_id = ?',
    [team.id, grupoId]
  );
  const totalActual = Number(actual.total);

  if (accion === 'ver') {
    await responder(sock, msg, RESPUESTAS.puntosVistos(team.id, team.nombre_con_emoji, totalActual));
    return;
  }

  const cantidad = Number(cantidadTexto);
  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    await responder(sock, msg, '⚠️ La cantidad debe ser un entero positivo.');
    return;
  }

  const delta = accion === 'restar' ? -cantidad : cantidad;
  if (totalActual + delta < 0) {
    await responder(sock, msg, RESPUESTAS.puntosInsuficientes(team.id, totalActual));
    return;
  }

  const resultado = await db.run(
    `INSERT INTO puntos (id_team, grupo_id, usuario_id, cantidad, motivo)
     SELECT ?, ?, ?, ?, ?
     WHERE EXISTS (SELECT 1 FROM teams WHERE id = ? AND grupo_id = ?)
       AND (SELECT COALESCE(SUM(cantidad), 0) FROM puntos WHERE id_team = ? AND grupo_id = ?) + ? >= 0`,
    [
      team.id,
      grupoId,
      remitente,
      delta,
      motivoPartes.join(' '),
      team.id,
      grupoId,
      team.id,
      grupoId,
      delta
    ]
  );
  if (!resultado.changes) {
    const totalRevisado = await db.get(
      'SELECT COALESCE(SUM(cantidad), 0) AS total FROM puntos WHERE id_team = ? AND grupo_id = ?',
      [team.id, grupoId]
    );
    if (accion === 'restar' && Number(totalRevisado.total) < cantidad) {
      await responder(sock, msg, RESPUESTAS.puntosInsuficientes(team.id, Number(totalRevisado.total)));
    } else {
      await responder(sock, msg, RESPUESTAS.noEncontrado('el Team', idTexto));
    }
    return;
  }

  console.log(`✅ Puntos actualizados para Team ${team.id} → ${totalActual + delta} (${delta > 0 ? '+' : ''}${delta})`);
  await responder(sock, msg, RESPUESTAS.puntosActualizados(
    accion,
    team.id,
    totalActual + delta
  ));
}

async function ejecutar(sock, msg, context = {}) {
  try {
    const remitente = msg.key.participant || msg.key.remoteJid;
    const grupoId = msg.key.remoteJid;
    if (!grupoId?.endsWith('@g.us')) {
      await responder(sock, msg, RESPUESTAS.soloGrupo);
      return;
    }

    await prepararTablas();
    const adminGrupo = await detectarAdminGrupo(sock, grupoId, remitente);
    const propietarioGlobal = esPropietarioGlobal(context.ownerId, remitente);
    if (adminGrupo === null && !propietarioGlobal) {
      await responder(sock, msg, RESPUESTAS.noMetadata);
      return;
    }
    const tienePermiso = adminGrupo || propietarioGlobal;
    if (!adminGrupo && propietarioGlobal) {
      console.log(`🔑 Usuario ${remitente} no es admin en grupo ${grupoId}, autorizado como propietario global.`);
    }

    const texto = obtenerTexto(msg);
    const comando = context.command || `/${texto.split(/\s+/)[0]?.replace(/^\//, '')}`;
    const resto = texto.replace(/^\/\S+\s*/i, '').trim();

    if (comando === '/puntos') {
      const accionPuntos = resto.split(/\s+/, 1)[0];
      if (accionPuntos !== 'ver' && !tienePermiso) {
        await responder(sock, msg, RESPUESTAS.soloAdmin);
        return;
      }
      await procesarPuntos(resto, grupoId, remitente, sock, msg);
      return;
    }

    if (comando === '/teams_tiendas') {
      if (!tienePermiso) {
        await responder(sock, msg, RESPUESTAS.soloAdmin);
        return;
      }
      const [equipos, tiendas] = await Promise.all([
        db.get('SELECT COUNT(*) AS total FROM teams WHERE grupo_id = ?', [grupoId]),
        db.get('SELECT COUNT(*) AS total FROM tiendas WHERE grupo_id = ?', [grupoId])
      ]);
      await responder(sock, msg, RESPUESTAS.estado(equipos.total, tiendas.total));
      return;
    }

    const tipo = comando === '/teams' ? 'teams' : 'tiendas';
    const [accion, ...partes] = resto.split(/\s+/);
    const valor = partes.join(' ').trim();

    if (accion === 'lista') {
      await listar(tipo, grupoId, sock, msg);
    } else if (accion === 'crear' || accion === 'agregar') {
      if (!tienePermiso) {
        await responder(sock, msg, RESPUESTAS.soloAdmin);
        return;
      }
      await agregar(tipo, valor, grupoId, remitente, sock, msg);
    } else if (accion === 'editar') {
      if (!tienePermiso) {
        await responder(sock, msg, RESPUESTAS.soloAdmin);
        return;
      }
      await editar(tipo, valor, grupoId, sock, msg);
    } else if (accion === 'eliminar') {
      if (!tienePermiso) {
        await responder(sock, msg, RESPUESTAS.soloAdmin);
        return;
      }
      await eliminar(tipo, valor, grupoId, sock, msg);
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
  nombre: 'Teams y Tiendas',
  descripcion: 'Teams por grupo: /teams crear, /teams lista y edición. Puntos SQL: /puntos agregar, /puntos restar, /puntos ver.',
  comandos: COMANDOS,
  command: COMANDOS,
  commands: COMANDOS,
  activo: true,
  inicializar: prepararTablas,
  ejecutar,
  run: ejecutar
};

export default plugin;
