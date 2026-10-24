import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJsonFileSafe, writeJsonFileSafe } from '../archivos-seguros.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_DATOS = path.join(__dirname, '../../../data/perfiles.json');

export const EQUIPOS = {
  '🍥': { nombre: 'Team Naruto', emoji: '🍥' },
  '🩸': { nombre: 'Team Jujutsu Kaisen', emoji: '🩸' },
  '🔰': { nombre: 'Team Hunter × Hunter', emoji: '🔰' }
};

export const GENEROS = {
  M: { nombre: 'Masculino', emoji: '♂️' },
  F: { nombre: 'Femenino', emoji: '♀️' },
  O: { nombre: 'Otro', emoji: '⚧️' },
  N: { nombre: 'No especificado', emoji: '❔' }
};

const registrosEnCurso = new Map();

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

function iniciarRegistro(usuarioId) {
  registrosEnCurso.set(usuarioId, {
    tipo: 'registro',
    paso: 1,
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

  if (valor === '1' || valor.includes('🍥') || valor.toLowerCase().includes('naruto')) {
    return '🍥';
  }

  if (valor === '2' || valor.includes('🩸') || valor.toLowerCase().includes('jujutsu')) {
    return '🩸';
  }

  if (valor === '3' || valor.includes('🔰') || valor.toLowerCase().includes('hunter')) {
    return '🔰';
  }

  return null;
}

async function enviarPerfilActual(sock, grupoId, remitente, msg) {
  const perfil = obtenerPerfil(remitente);

  if (!perfil) {
    await sock.sendMessage(grupoId, {
      text: '📝 *Todavía no tenés perfil registrado.*\n\nEscribí */registrar* para crear uno y empezar a usar todas las funciones del bot. ✨'
    }, { quoted: msg });
    return;
  }

  const genero = GENEROS[perfil.genero] || GENEROS.N;
  const equipo = EQUIPOS[perfil.equipo] || { nombre: 'Sin equipo', emoji: '❔' };

  const mensaje = `👤 *TU PERFIL* 👤

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📛 Nombre: ${perfil.nombre || 'No especificado'}
${genero.emoji} Género: ${genero.nombre}
🎂 Fecha de nacimiento: ${perfil.fechaNacimiento || 'No especificada'}
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
    registro.datos.fechaNacimiento = respuesta.toLowerCase() === 'omitir' ? null : respuesta;
    registro.paso = 4;

    await sock.sendMessage(grupoId, {
      text: '📝 *PASO 4 de 4 - ÚLTIMO PASO*\n\n⚔️ ¿A qué equipo querés unirte?\n\n1️⃣ 🍥 Team Naruto\n2️⃣ 🩸 Team Jujutsu Kaisen\n3️⃣ 🔰 Team Hunter × Hunter\n\nEscribí el número:'
    }, { quoted: msg });
    return true;
  }

  if (registro.paso === 4) {
    const equipoElegido = parsearEquipo(texto);

    if (!equipoElegido) {
      await sock.sendMessage(grupoId, {
        text: '⚠️ Opción inválida. Escribí 1, 2 o 3 según tu equipo.'
      }, { quoted: msg });
      return true;
    }

    const perfilCompleto = guardarPerfil(remitente, {
      ...registro.datos,
      equipo: equipoElegido,
      fechaRegistro: new Date().toISOString()
    });

    finalizarRegistro(remitente);

    const genero = GENEROS[perfilCompleto.genero] || GENEROS.N;
    const equipo = EQUIPOS[equipoElegido];

    await sock.sendMessage(grupoId, {
      text: `🎉 *¡PERFIL CREADO CON ÉXITO!* 🎉\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📛 Nombre: ${perfilCompleto.nombre}\n${genero.emoji} Género: ${genero.nombre}\n🎂 Fecha de nacimiento: ${perfilCompleto.fechaNacimiento || 'No especificada'}\n${equipo.emoji} Equipo: ${equipo.nombre}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ ¡Ahora el bot te reconocerá automáticamente en todos los comandos!\nEscribí */perfil* para verlo cuando quieras.\n\n¡Bienvenido/a a ${equipo.nombre}! 🚀`
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
        text: '⚔️ Elegí tu equipo:\n\n1️⃣ 🍥 Team Naruto\n2️⃣ 🩸 Team Jujutsu Kaisen\n3️⃣ 🔰 Team Hunter × Hunter'
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
      datosActualizados.fechaNacimiento = respuesta.toLowerCase() === 'omitir' ? null : respuesta;
    }

    if (campo === 'equipo') {
      const equipoElegido = parsearEquipo(texto);

      if (!equipoElegido) {
        await sock.sendMessage(grupoId, {
          text: '⚠️ Equipo inválido. Escribí 1, 2 o 3.'
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

      if (comando === '/perfil' || comando === '/miperfil') {
        await enviarPerfilActual(sock, grupoId, remitente, msg);
        return;
      }

      if (comando === '/registrar' || comando === '/perfil crear') {
        const perfilActual = obtenerPerfil(remitente);

        if (perfilActual) {
          await sock.sendMessage(grupoId, {
            text: '✅ *Ya tenés un perfil registrado.*\n\nEscribí */perfil* para verlo o */editar-perfil* para modificarlo.'
          }, { quoted: msg });
          return;
        }

        iniciarRegistro(remitente);
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
          text: '⚔️ *ELEGIR EQUIPO*\n\n1️⃣ 🍥 Team Naruto\n2️⃣ 🩸 Team Jujutsu Kaisen\n3️⃣ 🔰 Team Hunter × Hunter\n\nEscribí el número del equipo deseado:'
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
