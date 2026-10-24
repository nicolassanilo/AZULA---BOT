import { cargarRanking, guardarRanking } from '../src/comunidad/sistema/ranking.js';
import { obtenerEquipoUsuario } from '../src/comunidad/sistema/perfiles.js';

export const command = ['/retar', '/aceptar', '/rechazar'];

const DESAFIOS_PENDIENTES = new Map();
const NIVEL_CONFIG = {
  1: { nombre: '🟢 Fácil', monto: 50000 },
  2: { nombre: '🟡 Medio', monto: 100000 },
  3: { nombre: '🔴 Difícil', monto: 250000 },
  4: { nombre: '⚡ Épico', monto: 500000 }
};
const TIEMPO_LIMITE_MS = 5 * 60 * 1000;

function normalizarUsuarioId(usuarioId = '') {
  return String(usuarioId || '')
    .trim()
    .replace(/^@/, '')
    .replace(/\s+/g, '');
}

function obtenerGrupoDesafios(grupoId) {
  if (!DESAFIOS_PENDIENTES.has(grupoId)) {
    DESAFIOS_PENDIENTES.set(grupoId, []);
  }

  return DESAFIOS_PENDIENTES.get(grupoId);
}

function clavePar(grupoId, usuarioA, usuarioB) {
  const usuarios = [normalizarUsuarioId(usuarioA), normalizarUsuarioId(usuarioB)].sort();
  return `${grupoId}:${usuarios.join('|')}`;
}

function obtenerMenciones(msg) {
  return (msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [])
    .map((usuarioId) => normalizarUsuarioId(usuarioId))
    .filter(Boolean);
}

function obtenerDesafioPendiente(grupoId, usuarioId) {
  const desafios = obtenerGrupoDesafios(grupoId);
  return desafios.find((desafio) => desafio.desafiado === normalizarUsuarioId(usuarioId)) || null;
}

function removerDesafio(grupoId, desafio) {
  const desafios = obtenerGrupoDesafios(grupoId);
  const indice = desafios.findIndex((item) => item.id === desafio.id);

  if (indice >= 0) {
    desafios.splice(indice, 1);
  }

  if (desafios.length === 0) {
    DESAFIOS_PENDIENTES.delete(grupoId);
  }
}

function enviarMensaje(sock, grupoId, texto, msg = null) {
  const opciones = msg ? { quoted: msg } : {};
  return sock.sendMessage(grupoId, { text: texto }, opciones);
}

function obtenerRankingSeguro() {
  const datos = cargarRanking();
  datos.usuarios = datos.usuarios || {};
  datos.equipos = {
    '🍥': Number(datos.equipos?.['🍥'] || 0),
    '🩸': Number(datos.equipos?.['🩸'] || 0),
    '🔰': Number(datos.equipos?.['🔰'] || 0)
  };
  return datos;
}

function obtenerPuntosUsuario(usuarioId) {
  const datos = obtenerRankingSeguro();
  return Number(datos.usuarios?.[normalizarUsuarioId(usuarioId)]?.puntos || 0);
}

function obtenerEquipoEmoji(usuarioId) {
  const equipo = obtenerEquipoUsuario(normalizarUsuarioId(usuarioId));
  return equipo?.emoji || '❔';
}

function construirUso() {
  return `📝 Uso correcto: /retar @usuario [nivel]\n\nEjemplo: /retar @Gon 2\n\nNiveles disponibles:\n🟢 1 = Fácil\n🟡 2 = Medio\n🔴 3 = Difícil\n⚡ 4 = Épico`;
}

function obtenerNivelSolicitado(args) {
  const valor = Number.parseInt(args[1] || '1', 10);

  if (!Number.isInteger(valor) || !NIVEL_CONFIG[valor]) {
    return { nivel: null, mensaje: '⛔ Nivel inválido. Usa: 1, 2, 3 o 4' };
  }

  return { nivel: valor, mensaje: null };
}

function buscarDesafioActivo(grupoId, desafianteId, desafiadoId) {
  const desafíos = obtenerGrupoDesafios(grupoId);
  const clave = clavePar(grupoId, desafianteId, desafiadoId);

  return desafíos.find((desafio) => clavePar(grupoId, desafio.desafiante, desafio.desafiado) === clave) || null;
}

function iniciarExpiracion(grupoId, desafio, sock) {
  const tiempoRestante = Math.max(0, desafio.tiempoLimite - Date.now());

  setTimeout(async () => {
    const desafios = obtenerGrupoDesafios(grupoId);
    const desafioActual = desafios.find((item) => item.id === desafio.id);

    if (!desafioActual) {
      return;
    }

    removerDesafio(grupoId, desafioActual);

    try {
      await enviarMensaje(sock, grupoId, `⏱️ El desafío ha caducado.`);
    } catch (error) {
      console.error('❌ Error al expirar desafío:', error);
    }
  }, tiempoRestante);
}

function actualizarPuntosConResultado(datos, ganadorId, perdedorId, monto) {
  const ganadorNormalizado = normalizarUsuarioId(ganadorId);
  const perdedorNormalizado = normalizarUsuarioId(perdedorId);

  const ganadorActual = datos.usuarios[ganadorNormalizado] || { puntos: 0, nombre: ganadorNormalizado };
  const perdedorActual = datos.usuarios[perdedorNormalizado] || { puntos: 0, nombre: perdedorNormalizado };

  ganadorActual.puntos = Number(ganadorActual.puntos || 0) + Number(monto || 0);
  ganadorActual.nombre = ganadorActual.nombre || ganadorNormalizado;
  ganadorActual.equipo = obtenerEquipoEmoji(ganadorNormalizado);

  perdedorActual.puntos = Math.max(0, Number(perdedorActual.puntos || 0) - Number(monto || 0));
  perdedorActual.nombre = perdedorActual.nombre || perdedorNormalizado;
  perdedorActual.equipo = obtenerEquipoEmoji(perdedorNormalizado);

  datos.usuarios[ganadorNormalizado] = ganadorActual;
  datos.usuarios[perdedorNormalizado] = perdedorActual;

  const equipoGanador = obtenerEquipoUsuario(ganadorNormalizado);
  const equipoPerdedor = obtenerEquipoUsuario(perdedorNormalizado);

  if (equipoGanador?.emoji) {
    datos.equipos[equipoGanador.emoji] = Number(datos.equipos[equipoGanador.emoji] || 0) + Number(monto || 0);
  }

  if (equipoPerdedor?.emoji) {
    datos.equipos[equipoPerdedor.emoji] = Math.max(0, Number(datos.equipos[equipoPerdedor.emoji] || 0) - Number(monto || 0));
  }

  return datos;
}

export async function run(sock, msg, { command, args = [] }) {
  const grupoId = msg.key.remoteJid;
  const remitente = normalizarUsuarioId(msg.key.participant || msg.key.remoteJid);

  if (command === '/retar') {
    const mencionados = obtenerMenciones(msg);
    const desafiadoId = normalizarUsuarioId(mencionados[0] || args[0] || '');

    if (!desafiadoId) {
      await enviarMensaje(sock, grupoId, construirUso(), msg);
      return;
    }

    const desafianteId = remitente;

    if (desafianteId === desafiadoId) {
      await enviarMensaje(sock, grupoId, '⛔ No puedes retarte a ti mismo. ¡Desafía a otro miembro! 😤⚔️', msg);
      return;
    }

    const nivelSolicitado = obtenerNivelSolicitado(args);

    if (nivelSolicitado.nivel === null) {
      await enviarMensaje(sock, grupoId, nivelSolicitado.mensaje, msg);
      return;
    }

    const equipoDesafiante = obtenerEquipoUsuario(desafianteId);
    const equipoDesafiado = obtenerEquipoUsuario(desafiadoId);

    if (!equipoDesafiante || !equipoDesafiado) {
      await enviarMensaje(sock, grupoId, '⚠️ Uno de los usuarios no tiene equipo asignado.', msg);
      return;
    }

    const nivel = nivelSolicitado.nivel;
    const mismoEquipo = equipoDesafiante.emoji === equipoDesafiado.emoji;

    if (mismoEquipo && nivel !== 1) {
      await enviarMensaje(sock, grupoId, '⛔ Nivel no permitido para desafiar a alguien de tu mismo equipo.\nUsa Nivel 1 o desafía a alguien de otro equipo.', msg);
      return;
    }

    if (!mismoEquipo && nivel === 1) {
      await enviarMensaje(sock, grupoId, '⛔ Nivel 1 es solo para miembros del mismo equipo.\nUsa Nivel 2, 3 o 4 para otros equipos.', msg);
      return;
    }

    const nivelConfig = NIVEL_CONFIG[nivel];
    const montoApuesta = nivelConfig.monto;

    const puntosDesafiante = obtenerPuntosUsuario(desafianteId);
    const puntosDesafiado = obtenerPuntosUsuario(desafiadoId);

    if (puntosDesafiante < montoApuesta) {
      await enviarMensaje(sock, grupoId, `❌ No tienes suficientes puntos para este desafío.\nNecesitas: ${montoApuesta.toLocaleString('es-AR')} pts · Tenés: ${puntosDesafiante.toLocaleString('es-AR')} pts`, msg);
      return;
    }

    if (puntosDesafiado < montoApuesta) {
      await enviarMensaje(sock, grupoId, '⚠️ El usuario desafiado no tiene suficientes puntos para aceptar este reto.', msg);
      return;
    }

    const desafioExistente = buscarDesafioActivo(grupoId, desafianteId, desafiadoId);
    if (desafioExistente) {
      await enviarMensaje(sock, grupoId, '⚠️ Ya existe un desafío activo entre estos dos usuarios. Esperá a que termine antes de lanzar otro.', msg);
      return;
    }

    const desafio = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      grupoId,
      desafiante: desafianteId,
      desafiado: desafiadoId,
      nivel,
      monto: montoApuesta,
      nombreNivel: nivelConfig.nombre,
      tiempoLimite: Date.now() + TIEMPO_LIMITE_MS,
      creadoEn: Date.now()
    };

    obtenerGrupoDesafios(grupoId).push(desafio);
    iniciarExpiracion(grupoId, desafio, sock);

    await enviarMensaje(sock, grupoId, `
⚔️ DESAFÍO LANZADO ⚔️
───────────────────────────
🥷 Desafiante: @${desafianteId} ${equipoDesafiante.emoji}
🥷 Desafiado: @${desafiadoId} ${equipoDesafiado.emoji}
📊 Nivel: ${nivel} ${nivelConfig.nombre}
💸 Apuesta: ${montoApuesta.toLocaleString('es-AR')} pts

✅ Escribe /aceptar para confirmar
❌ Escribe /rechazar para declinar
⏳ Tienes 5 minutos para responder
`, msg);

    return;
  }

  if (command === '/aceptar') {
    const desafio = obtenerDesafioPendiente(grupoId, remitente);

    if (!desafio) {
      await enviarMensaje(sock, grupoId, '⚠️ No tienes ningún desafío pendiente por aceptar.', msg);
      return;
    }

    removerDesafio(grupoId, desafio);

    await enviarMensaje(sock, grupoId, `
⚔️ BATALLA EN CURSO... ⚡
───────────────────────────
🥷 @${desafio.desafiante} vs @${desafio.desafiado}
🔄 Calculando resultado...
`);

    const ganaDesafiante = Math.random() > 0.5;
    const ganadorId = ganaDesafiante ? desafio.desafiante : desafio.desafiado;
    const perdedorId = ganaDesafiante ? desafio.desafiado : desafio.desafiante;

    let datos = obtenerRankingSeguro();
    datos = actualizarPuntosConResultado(datos, ganadorId, perdedorId, desafio.monto);
    guardarRanking(datos);

    const puntosGanador = Number(datos.usuarios?.[normalizarUsuarioId(ganadorId)]?.puntos || 0);
    const puntosPerdedor = Number(datos.usuarios?.[normalizarUsuarioId(perdedorId)]?.puntos || 0);

    await enviarMensaje(sock, grupoId, `
🏆 ¡GANADOR: @${ganadorId}! 🎉
───────────────────────────
💸 Gana: +${Number(desafio.monto || 0).toLocaleString('es-AR')} pts
💔 Pierde: -${Number(desafio.monto || 0).toLocaleString('es-AR')} pts
📊 Nuevo puntaje:
🏆 @${ganadorId}: ${puntosGanador.toLocaleString('es-AR')} pts
💔 @${perdedorId}: ${puntosPerdedor.toLocaleString('es-AR')} pts

⚔️ ¡Gran combate! ¡A seguir entrenando! 💪
`);

    return;
  }

  if (command === '/rechazar') {
    const desafio = obtenerDesafioPendiente(grupoId, remitente);

    if (!desafio) {
      await enviarMensaje(sock, grupoId, '⚠️ No tienes ningún desafío pendiente.', msg);
      return;
    }

    removerDesafio(grupoId, desafio);
    await enviarMensaje(sock, grupoId, `❌ El desafío fue rechazado.`, msg);
    return;
  }
}
