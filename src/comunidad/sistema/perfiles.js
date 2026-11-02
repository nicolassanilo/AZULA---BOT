import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJsonFileSafe, writeJsonFileSafe } from '../archivos-seguros.js';
import { db } from '../../../db.js';
import { prepararTablasEquipos } from '../../plugins/equipos.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_DATOS = path.join(__dirname, '../../../data/perfiles.json');

export const EQUIPOS = {
  '🍥': { nombre: 'Team Naruto', emoji: '🍥' },
  '🩸': { nombre: 'Team Jujutsu Kaisen', emoji: '🩸' },
  '🔰': { nombre: 'Team Hunter × Hunter', emoji: '🔰' },
  '🌊🔥': { nombre: 'Team Avatar', emoji: '🌊🔥' }
};

export const GENEROS = {
  M: { nombre: 'Masculino', emoji: '♂️' },
  F: { nombre: 'Femenino', emoji: '♀️' },
  O: { nombre: 'Otro', emoji: '⚧️' },
  N: { nombre: 'No especificado', emoji: '❔' }
};

const registrosEnCurso = new Map();
let esquemaPerfilesPreparado;

function normalizarNombreEquipo(nombre) {
  return String(nombre || '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

async function prepararPersistenciaPerfiles() {
  if (!esquemaPerfilesPreparado) {
    esquemaPerfilesPreparado = (async () => {
      await prepararTablasEquipos();
      const columnas = new Set((await db.all('PRAGMA table_info(perfiles)')).map((columna) => columna.name));

      for (const [nombre, definicion] of [
        ['nombre', 'TEXT'],
        ['genero', 'TEXT'],
        ['fecha_nacimiento', 'TEXT'],
        ['fecha_registro', 'TEXT'],
        ['grupo_id', 'TEXT']
      ]) {
        if (!columnas.has(nombre)) {
          await db.run(`ALTER TABLE perfiles ADD COLUMN ${nombre} ${definicion}`);
          columnas.add(nombre);
        }
      }
    })().catch((error) => {
      esquemaPerfilesPreparado = null;
      throw error;
    });
  }

  await esquemaPerfilesPreparado;
}

async function asegurarEquiposDisponibles(grupoId) {
  await prepararPersistenciaPerfiles();
  const existentes = await db.all(
    'SELECT id, nombre_con_emoji FROM equipos WHERE grupo_id = ?',
    [grupoId]
  );
  const teamIds = {};

  for (const [emoji, equipo] of Object.entries(EQUIPOS)) {
    const nombreNormalizado = normalizarNombreEquipo(equipo.nombre);
    let fila = existentes.find((item) =>
      normalizarNombreEquipo(item.nombre_con_emoji) === nombreNormalizado
    );

    if (!fila) {
      const nombreConEmoji = `${equipo.nombre} ${equipo.emoji}`;
      const resultado = await db.run(
        'INSERT OR IGNORE INTO equipos (nombre_con_emoji, grupo_id, admin_id) VALUES (?, ?, ?)',
        [nombreConEmoji, grupoId, 'sistema']
      );
      fila = resultado.lastID
        ? { id: resultado.lastID, nombre_con_emoji: nombreConEmoji }
        : await db.get(
          'SELECT id, nombre_con_emoji FROM equipos WHERE grupo_id = ? AND nombre_con_emoji = ? COLLATE NOCASE',
          [grupoId, nombreConEmoji]
        );
      if (fila) existentes.push(fila);
    }

    if (fila) {
      teamIds[emoji] = Number(fila.id);
    }
  }

  return teamIds;
}

async function obtenerPerfilPersistido(usuarioId) {
  await prepararPersistenciaPerfiles();
  return db.get(
    `SELECT p.id_usuario, p.nombre, p.genero, p.fecha_nacimiento, p.fecha_registro,
            p.team_id, p.grupo_id, e.nombre_con_emoji
     FROM perfiles p
     LEFT JOIN equipos e ON e.id = p.team_id
     WHERE p.id_usuario = ?`,
    [normalizarUsuario(usuarioId)]
  );
}

function mostrarPerfilRegistrado(perfil) {
  const equipoPorClave = EQUIPOS[perfil?.equipo];
  const nombreEquipo = perfil?.nombre_con_emoji ||
    (equipoPorClave ? `${equipoPorClave.nombre} ${equipoPorClave.emoji}` : 'Sin equipo');
  return `Ya estás registrado: ${perfil?.nombre || 'Sin nombre'} — ${nombreEquipo}`;
}

function textoOpcionesEquipos() {
  return Object.values(EQUIPOS)
    .map((equipo, index) => `${index + 1}️⃣ ${equipo.emoji} ${equipo.nombre}`)
    .join('\n');
}

function parsearFechaNacimiento(texto) {
  const valor = String(texto || '').trim();
  if (valor.toLowerCase() === 'omitir') return { valida: true, fecha: null };

  const coincidencia = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!coincidencia) return { valida: false, fecha: null };

  const [, diaTexto, mesTexto, anioTexto] = coincidencia;
  const dia = Number(diaTexto);
  const mes = Number(mesTexto);
  const anio = Number(anioTexto);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia ||
    fecha > new Date()
  ) {
    return { valida: false, fecha: null };
  }

  return { valida: true, fecha: `${anioTexto}-${mesTexto}-${diaTexto}` };
}

function formatearFechaNacimiento(fecha) {
  if (!fecha) return 'No especificada';
  const coincidencia = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return coincidencia ? `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}` : fecha;
}

function crearEstructuraInicial() {
  return {};
}

function asegurarArchivo() {
  try {
    fs.mkdirSync(path.dirname(RUTA_DATOS), { recursive: true });

    if (!fs.existsSync(RUTA_DATOS)) {
      fs.writeFileSync(RUTA_DATOS, JSON.stringify(crearEstructuraInicial(), null, 2), 'utf8');
    }
  } catch (error) {
    console.error('❌ Error asegurando existencia de perfiles.json:', error);
  }
}

function cargarDatos() {
  try {
    asegurarArchivo();
    return readJsonFileSafe(RUTA_DATOS, {});
  } catch (error) {
    console.warn('⚠️ Error cargando perfiles:', error?.message || error);
    return {};
  }
}

function guardarDatos(datos) {
  try {
    asegurarArchivo();
    writeJsonFileSafe(RUTA_DATOS, datos && typeof datos === 'object' ? datos : {});
  } catch (error) {
    console.warn('⚠️ Error guardando perfiles:', error?.message || error);
  }
}

function normalizarUsuario(usuarioId) {
  return String(usuarioId || '').trim();
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return 'No especificada';

  try {
    return new Date(fechaISO).toLocaleDateString('es-AR');
  } catch (error) {
    return fechaISO;
  }
}

export function obtenerPerfil(usuarioId) {
  const usuarioNormalizado = normalizarUsuario(usuarioId);

  if (!usuarioNormalizado) {
    return null;
  }

  const datos = cargarDatos();
  return datos[usuarioNormalizado] || null;
}

export function guardarPerfil(usuarioId, datosPerfil) {
  const usuarioNormalizado = normalizarUsuario(usuarioId);

  if (!usuarioNormalizado) {
    return null;
  }

  const datos = cargarDatos();
  const perfilActual = datos[usuarioNormalizado] || {};

  const perfilGuardado = {
    ...perfilActual,
    ...datosPerfil,
    fechaRegistro: datosPerfil?.fechaRegistro || perfilActual?.fechaRegistro || new Date().toISOString(),
    ultimaActualizacion: new Date().toISOString()
  };

  datos[usuarioNormalizado] = perfilGuardado;
  guardarDatos(datos);

  console.log(`💾 Perfil guardado para ${usuarioNormalizado}`);
  return perfilGuardado;
}

export function detectarEquipoPorEmoji(nombreUsuario) {
  if (!nombreUsuario) {
    return null;
  }

  for (const emoji of Object.keys(EQUIPOS)) {
    if (String(nombreUsuario).includes(emoji)) {
      return { emoji, ...EQUIPOS[emoji], origen: 'emoji-nombre' };
    }
  }

  return null;
}

export function obtenerEquipoUsuario(usuarioId, nombreUsuario = '') {
  const perfil = obtenerPerfil(usuarioId);

  if (perfil?.equipo && EQUIPOS[perfil.equipo]) {
    return {
      emoji: perfil.equipo,
      ...EQUIPOS[perfil.equipo],
      origen: 'perfil'
    };
  }

  return detectarEquipoPorEmoji(nombreUsuario);
}

function iniciarRegistro(usuarioId, grupoId, teamIds) {
  registrosEnCurso.set(usuarioId, {
    tipo: 'registro',
    paso: 1,
    grupoId,
    teamIds,
    datos: {}
  });
}

function iniciarEdicion(usuarioId) {
  registrosEnCurso.set(usuarioId, {
    tipo: 'editar',
    paso: 'seleccionarCampo',
    datos: {}
  });
}

function finalizarRegistro(usuarioId) {
  registrosEnCurso.delete(usuarioId);
}

function parsearGenero(texto) {
  const valor = String(texto || '').trim().toUpperCase();
  if (GENEROS[valor]) {
    return valor;
  }
  return null;
}

function parsearEquipo(texto) {
  const valor = String(texto || '').trim();

  for (const [indice, [emoji, equipo]] of Object.entries(EQUIPOS).entries()) {
    if (
      valor === String(indice + 1) ||
      valor.includes(emoji) ||
      valor.toLocaleLowerCase().includes(equipo.nombre.toLocaleLowerCase())
    ) {
      return emoji;
    }
  }

  return null;
}

async function enviarPerfilActual(sock, grupoId, remitente, msg) {
  const perfilJson = obtenerPerfil(remitente);
  const perfilPersistido = await obtenerPerfilPersistido(remitente);
  const equipoCoincidente = perfilPersistido?.nombre_con_emoji
    ? Object.entries(EQUIPOS).find(([, equipo]) =>
      normalizarNombreEquipo(perfilPersistido.nombre_con_emoji).includes(normalizarNombreEquipo(equipo.nombre))
    )
    : null;
  const perfil = perfilJson || (perfilPersistido && {
    nombre: perfilPersistido.nombre,
    genero: perfilPersistido.genero,
    fechaNacimiento: perfilPersistido.fecha_nacimiento,
    fechaRegistro: perfilPersistido.fecha_registro,
    equipo: equipoCoincidente?.[0],
    nombre_con_emoji: perfilPersistido.nombre_con_emoji
  });

  if (!perfil) {
    await sock.sendMessage(grupoId, {
      text: '📝 *Todavía no tenés perfil registrado.*\n\nEscribí */registrar* para crear uno y empezar a usar todas las funciones del bot. ✨'
    }, { quoted: msg });
    return;
  }

  const genero = GENEROS[perfil.genero] || GENEROS.N;
  const equipo = EQUIPOS[perfil.equipo] || {
    nombre: perfil.nombre_con_emoji || 'Sin equipo',
    emoji: '❔'
  };

  const mensaje = `👤 *TU PERFIL* 👤

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📛 Nombre: ${perfil.nombre || 'No especificado'}
${genero.emoji} Género: ${genero.nombre}
🎂 Fecha de nacimiento: ${formatearFechaNacimiento(perfil.fechaNacimiento)}
${equipo.emoji} Equipo: ${equipo.nombre}
📅 Registrado: ${formatearFecha(perfil.fechaRegistro)}
🕒 Última actualización: ${formatearFecha(perfil.ultimaActualizacion)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✏️ Para editar: */editar-perfil*
🔄 Cambiar equipo rápido: */elegir-equipo*`;

  await sock.sendMessage(grupoId, { text: mensaje }, { quoted: msg });
}

async function procesarRespuestaRegistro(sock, grupoId, remitente, texto, msg) {
  const registro = registrosEnCurso.get(remitente);

  if (!registro || registro.tipo !== 'registro') {
    return false;
  }

  if (registro.paso === 1) {
    const nombre = texto.trim();

    if (!nombre) {
      await sock.sendMessage(grupoId, {
        text: '⚠️ El nombre no puede estar vacío. Escribí tu nombre para continuar.'
      }, { quoted: msg });
      return true;
    }

    registro.datos.nombre = nombre;
    registro.paso = 2;

    await sock.sendMessage(grupoId, {
      text: `📝 *PASO 2 de 4*\n\n${GENEROS.M.emoji} ¿Cuál es tu género?\n\nEscribí una opción:\nM ♂️ Masculino\nF ♀️ Femenino\nO ⚧️ Otro\nN ❔ No especificar`
    }, { quoted: msg });
    return true;
  }

  if (registro.paso === 2) {
    const genero = parsearGenero(texto);

    if (!genero) {
      await sock.sendMessage(grupoId, {
        text: '⚠️ Opción inválida. Escribí M, F, O o N.'
      }, { quoted: msg });
      return true;
    }

    registro.datos.genero = genero;
    registro.paso = 3;

    await sock.sendMessage(grupoId, {
      text: '📝 *PASO 3 de 4*\n\n🎂 ¿Cuál es tu fecha de nacimiento?\n\nFormato: DD/MM/AAAA\nO escribí *omitir* si no querés decirla.'
    }, { quoted: msg });
    return true;
  }

  if (registro.paso === 3) {
    const respuesta = texto.trim();
    const fecha = parsearFechaNacimiento(respuesta);
    if (!fecha.valida) {
      await sock.sendMessage(grupoId, {
        text: '⚠️ Fecha inválida. Usá el formato DD/MM/AAAA con una fecha real que no sea futura, o escribí *omitir*.'
      }, { quoted: msg });
      return true;
    }

    registro.datos.fechaNacimiento = fecha.fecha;
    registro.paso = 4;

    await sock.sendMessage(grupoId, {
      text: `📝 *PASO 4 de 4 - ÚLTIMO PASO*\n\n⚔️ ¿A qué equipo querés unirte?\n\n${textoOpcionesEquipos()}\n\nEscribí el número:`
    }, { quoted: msg });
    return true;
  }

  if (registro.paso === 4) {
    const equipoElegido = parsearEquipo(texto);

    if (!equipoElegido) {
      await sock.sendMessage(grupoId, {
        text: `⚠️ Opción inválida. Elegí un número de la lista:\n\n${textoOpcionesEquipos()}`
      }, { quoted: msg });
      return true;
    }

    const teamId = registro.teamIds?.[equipoElegido];
    if (!teamId) {
      await sock.sendMessage(grupoId, {
        text: '❌ No se encontró ese equipo en la base de datos. Escribí */registrar* para volver a intentar.'
      }, { quoted: msg });
      finalizarRegistro(remitente);
      return true;
    }

    const fechaRegistro = new Date().toISOString();
    try {
      await prepararPersistenciaPerfiles();
      const resultado = await db.run(
        `INSERT INTO perfiles
          (id_usuario, team_id, nombre, genero, fecha_nacimiento, fecha_registro, grupo_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id_usuario) DO NOTHING`,
        [
          normalizarUsuario(remitente),
          teamId,
          registro.datos.nombre,
          registro.datos.genero,
          registro.datos.fechaNacimiento,
          fechaRegistro,
          registro.grupoId
        ]
      );

      if (!resultado.changes) {
        const perfilExistente = await obtenerPerfilPersistido(remitente);
        finalizarRegistro(remitente);
        await sock.sendMessage(grupoId, {
          text: mostrarPerfilRegistrado(perfilExistente)
        }, { quoted: msg });
        return true;
      }
    } catch (error) {
      console.error(`❌ No se pudo guardar el perfil de ${remitente}:`, error);
      await sock.sendMessage(grupoId, {
        text: '❌ No se pudo guardar tu registro en la base de datos. Tus respuestas siguen guardadas; intentá elegir el equipo nuevamente.'
      }, { quoted: msg });
      return true;
    }

    const perfilCompleto = guardarPerfil(remitente, {
      ...registro.datos,
      equipo: equipoElegido,
      fechaRegistro
    });
    const equipo = EQUIPOS[equipoElegido];
    finalizarRegistro(remitente);
    console.log(`Usuario guardado: ID ${remitente}, Equipo ${equipo.nombre}`);

    await sock.sendMessage(grupoId, {
      text: `✅ Registro completado! Bienvenido, ${perfilCompleto.nombre} del ${equipo.nombre}`
    }, { quoted: msg });
    return true;
  }

  return false;
}

async function procesarRespuestaEdicion(sock, grupoId, remitente, texto, msg) {
  const registro = registrosEnCurso.get(remitente);

  if (!registro || registro.tipo !== 'editar') {
    return false;
  }

  const perfil = obtenerPerfil(remitente);

  if (!perfil) {
    finalizarRegistro(remitente);
    return true;
  }

  if (registro.paso === 'seleccionarCampo') {
    const opcion = String(texto || '').trim();
    const campoMap = {
      '1': 'nombre',
      '2': 'genero',
      '3': 'fechaNacimiento',
      '4': 'equipo'
    };

    const campo = campoMap[opcion];

    if (!campo) {
      await sock.sendMessage(grupoId, {
        text: '⚠️ Opción inválida. Escribí 1, 2, 3 o 4 para editar el campo deseado.'
      }, { quoted: msg });
      return true;
    }

    registro.paso = 'valor';
    registro.campo = campo;

    if (campo === 'nombre') {
      await sock.sendMessage(grupoId, {
        text: '✏️ Escribí el nuevo nombre para tu perfil.'
      }, { quoted: msg });
      return true;
    }

    if (campo === 'genero') {
      await sock.sendMessage(grupoId, {
        text: '⚙️ Escribí una opción para tu género:\n\nM ♂️ Masculino\nF ♀️ Femenino\nO ⚧️ Otro\nN ❔ No especificar'
      }, { quoted: msg });
      return true;
    }

    if (campo === 'fechaNacimiento') {
      await sock.sendMessage(grupoId, {
        text: '🎂 Escribí tu nueva fecha de nacimiento en formato DD/MM/AAAA\nO escribí *omitir* para dejarlo vacío.'
      }, { quoted: msg });
      return true;
    }

    if (campo === 'equipo') {
      await sock.sendMessage(grupoId, {
        text: `⚔️ Elegí tu equipo:\n\n${textoOpcionesEquipos()}`
      }, { quoted: msg });
      return true;
    }
  }

  if (registro.paso === 'valor') {
    const campo = registro.campo;
    const datosActualizados = { ...perfil };

    if (campo === 'nombre') {
      datosActualizados.nombre = texto.trim();
    }

    if (campo === 'genero') {
      const genero = parsearGenero(texto);

      if (!genero) {
        await sock.sendMessage(grupoId, {
          text: '⚠️ Género inválido. Escribí M, F, O o N.'
        }, { quoted: msg });
        return true;
      }

      datosActualizados.genero = genero;
    }

    if (campo === 'fechaNacimiento') {
      const respuesta = texto.trim();
      const fecha = parsearFechaNacimiento(respuesta);
      if (!fecha.valida) {
        await sock.sendMessage(grupoId, {
          text: '⚠️ Fecha inválida. Usá el formato DD/MM/AAAA con una fecha real que no sea futura, o escribí *omitir*.'
        }, { quoted: msg });
        return true;
      }
      datosActualizados.fechaNacimiento = fecha.fecha;
    }

    if (campo === 'equipo') {
      const equipoElegido = parsearEquipo(texto);

      if (!equipoElegido) {
        await sock.sendMessage(grupoId, {
          text: `⚠️ Equipo inválido. Elegí un número de la lista:\n\n${textoOpcionesEquipos()}`
        }, { quoted: msg });
        return true;
      }

      datosActualizados.equipo = equipoElegido;
    }

    guardarPerfil(remitente, datosActualizados);
    finalizarRegistro(remitente);

    const equipoActual = EQUIPOS[datosActualizados.equipo] || { nombre: 'Sin equipo', emoji: '❔' };

    await sock.sendMessage(grupoId, {
      text: `✅ *Perfil actualizado con éxito*\n\n${campo === 'equipo' ? `${equipoActual.emoji} Equipo:` : '📌 Campo actualizado:'} ${campo}\n\nEscribí */perfil* para ver tu perfil completo.`
    }, { quoted: msg });
    return true;
  }

  return false;
}

export function activarPerfiles(sock) {
  if (!sock || typeof sock.ev?.on !== 'function') {
    console.error('❌ No se pudo activar perfiles: sock inválido');
    return;
  }

  if (sock.__perfilesActivado) {
    return;
  }

  sock.__perfilesActivado = true;

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg?.message || msg.key?.fromMe) return;

      const textoCompleto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const texto = textoCompleto.trim();
      const grupoId = msg.key.remoteJid;
      const remitente = msg.key.participant || msg.key.remoteJid;

      if (!grupoId) return;

      const comando = texto.toLowerCase();

      if (['/perfil', '/miperfil', '/crearperfil'].includes(comando.split(/\s+/, 1)[0])) {
        return;
      }

      if (comando === '/perfil' || comando === '/miperfil') {
        await enviarPerfilActual(sock, grupoId, remitente, msg);
        return;
      }

      if (comando === '/registrar' || comando === '/perfil crear') {
        const teamIds = await asegurarEquiposDisponibles(grupoId);
        const perfilPersistido = await obtenerPerfilPersistido(remitente);
        const perfilJson = obtenerPerfil(remitente);
        const perfilActual = perfilPersistido
          ? {
            ...perfilJson,
            ...perfilPersistido,
            nombre: perfilPersistido.nombre || perfilJson?.nombre
          }
          : perfilJson;

        if (perfilActual) {
          await sock.sendMessage(grupoId, {
            text: mostrarPerfilRegistrado(perfilActual)
          }, { quoted: msg });
          return;
        }

        iniciarRegistro(remitente, grupoId, teamIds);
        await sock.sendMessage(grupoId, {
          text: '📝 *REGISTRO DE PERFIL - PASO 1 de 4*\n\n👤 ¿Qué nombre querés usar en tu perfil?\n\nEscribí tu nombre a continuación...'
        }, { quoted: msg });
        return;
      }

      if (comando === '/editar-perfil') {
        const perfilActual = obtenerPerfil(remitente);

        if (!perfilActual) {
          await sock.sendMessage(grupoId, {
            text: '📝 *Todavía no tenés perfil registrado.*\n\nEscribí */registrar* para crear uno primero.'
          }, { quoted: msg });
          return;
        }

        iniciarEdicion(remitente);
        await sock.sendMessage(grupoId, {
          text: '✏️ *EDITAR PERFIL*\n\nElegí qué campo querés modificar:\n\n1️⃣ Nombre\n2️⃣ Género\n3️⃣ Fecha de nacimiento\n4️⃣ Equipo'
        }, { quoted: msg });
        return;
      }

      if (comando === '/elegir-equipo') {
        const perfilActual = obtenerPerfil(remitente);

        if (!perfilActual) {
          await sock.sendMessage(grupoId, {
            text: '📝 *Todavía no tenés perfil registrado.*\n\nEscribí */registrar* para crear uno y luego elegir tu equipo.'
          }, { quoted: msg });
          return;
        }

        registrosEnCurso.set(remitente, {
          tipo: 'editar',
          paso: 'valor',
          campo: 'equipo',
          datos: {}
        });

        await sock.sendMessage(grupoId, {
          text: `⚔️ *ELEGIR EQUIPO*\n\n${textoOpcionesEquipos()}\n\nEscribí el número del equipo deseado:`
        }, { quoted: msg });
        return;
      }

      const registro = registrosEnCurso.get(remitente);

      if (registro?.tipo === 'registro') {
        const procesado = await procesarRespuestaRegistro(sock, grupoId, remitente, texto, msg);
        if (procesado) {
          return;
        }
      }

      if (registro?.tipo === 'editar') {
        const procesado = await procesarRespuestaEdicion(sock, grupoId, remitente, texto, msg);
        if (procesado) {
          return;
        }
      }
    } catch (error) {
      console.error('❌ Error en sistema de perfiles:', error);
    }
  });

  console.log('✅ Sistema de perfiles de usuario activado.');
}
