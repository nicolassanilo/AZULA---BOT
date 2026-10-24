import { cargarRanking, guardarRanking } from './sistema/ranking.js';
import { obtenerEquipoUsuario } from './sistema/perfiles.js';

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

function obtenerDesafiosPorGrupo(grupoId) {
  if (!DESAFIOS_PENDIENTES.has(grupoId)) {
    DESAFIOS_PENDIENTES.set(grupoId, []);
  }

  return DESAFIOS_PENDIENTES.get(grupoId);
}

function claveParDesafios(grupoId, usuarioA, usuarioB) {
  const usuarios = [normalizarUsuarioId(usuarioA), normalizarUsuarioId(usuarioB)].sort();
  return `${grupoId}:${usuarios.join('|')}`;
}

function obtenerMenciones(msg) {
  const mencionados = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  return mencionados
    .map((usuarioId) => normalizarUsuarioId(usuarioId))
    .filter(Boolean);
}

function buscarDesafioPorDesafiado(grupoId, usuarioId) {
  const desafios = obtenerDesafiosPorGrupo(grupoId);
  return desafios.find((desafio) => desafio.desafiado === normalizarUsuarioId(usuarioId)) || null;
}

function buscarDesafioActivo(grupoId, desafianteId, desafiadoId) {
  const desafios = obtenerDesafiosPorGrupo(grupoId);
  const clave = claveParDesafios(grupoId, desafianteId, desafiadoId);

  return desafios.find((desafio) => claveParDesafios(grupoId, desafio.desafiante, desafio.desafiado) === clave) || null;
}

function removerDesafio(grupoId, desafio) {
  if (!desafio) {
    return;
  }

  const desafios = obtenerDesafiosPorGrupo(grupoId);
  const indice = desafios.findIndex((item) => item.id === desafio.id);

  if (indice >= 0) {
    desafios.splice(indice, 1);
  }

  if (desafios.length === 0) {
    DESAFIOS_PENDIENTES.delete(grupoId);
  }
}

function enviarTexto(sock, grupoId, mensaje, msg = null) {
  const opciones = msg ? { quoted: msg } : {};
  return sock.sendMessage(grupoId, { text: mensaje }, opciones);
}

function construirUso() {
  return `📝 Uso correcto: /retar @usuario [nivel]\n\nEjemplo: /retar @Gon 2\n\nNiveles disponibles:\n🟢 1 = Fácil\n🟡 2 = Medio\n🔴 3 = Difícil\n⚡ 4 = Épico`;
}

function emojiEquipo(equipo) {
  return equipo?.emoji || '❓';
}

function obtenerPuntosUsuario(usuarioId) {
  const datos = cargarRanking();
  return Number(datos.usuarios?.[normalizarUsuarioId(usuarioId)]?.puntos || 0);
}

function actualizarPuntosUsuario(usuarioId, puntos) {
  const datos = cargarRanking();
  const usuarioNormalizado = normalizarUsuarioId(usuarioId);

  datos.usuarios[usuarioNormalizado] = {
    ...(datos.usuarios[usuarioNormalizado] || {}),
    puntos: Number(puntos || 0)
  };

  guardarRanking(datos);
}

function obtenerDesafioPendiente(grupoId, usuarioDestino) {
  return buscarDesafioPorDesafiado(grupoId, usuarioDestino);
}

function iniciarExpiracion(grupoId, desafio, sock) {
  const tiempoRestante = Math.max(0, desafio.tiempoLimite - Date.now());

  setTimeout(async () => {
    const desafios = obtenerDesafiosPorGrupo(grupoId);
    const desafioActual = desafios.find((item) => item.id === desafio.id);

    if (!desafioActual) {
      return;
    }

    removerDesafio(grupoId, desafioActual);

    try {
      await enviarTexto(sock, grupoId, `⏱️ El desafío entre @${desafioActual.desafiante} y @${desafioActual.desafiado} ha caducado.`);
    } catch (error) {
      console.error('❌ Error al expirar desafío:', error);
    }
  }, tiempoRestante);
}

export async function ejecutarComandoDesafio(sock, msg, context = {}) {
  const { command, args = [] } = context;
  const grupoId = msg.key.remoteJid;
  const remitente = normalizarUsuarioId(msg.key.participant || msg.key.remoteJid);

  if (command === '/retar') {
    const mencionados = obtenerMenciones(msg);
    const usuarioDestino = mencionados[0] || normalizarUsuarioId(args[0]);
    const nivelSolicitado = Number.parseInt(args[1] || '1', 10);

    if (!usuarioDestino) {
      await enviarTexto(sock, grupoId, construirUso(), msg);
      return;
    }

    const desafianteId = remitente;
    const desafiadoId = normalizarUsuarioId(usuarioDestino);

    if (desafianteId === desafiadoId) {
      await enviarTexto(sock, grupoId, '⛔ No puedes retarte a ti mismo. ¡Desafía a otro miembro! 😤⚔️', msg);
      return;
    }

    const equipoDesafiante = obtenerEquipoUsuario(desafianteId);
    const equipoDesafiado = obtenerEquipoUsuario(desafiadoId);

    if (!equipoDesafiante || !equipoDesafiado) {
      await enviarTexto(sock, grupoId, '⚠️ Uno de los usuarios no tiene equipo asignado.', msg);
      return;
    }

    const mismoEquipo = equipoDesafiante.emoji === equipoDesafiado.emoji;
    const nivel = Number.isInteger(nivelSolicitado) && NIVEL_CONFIG[nivelSolicitado] ? nivelSolicitado : 1;
    const configNivel = NIVEL_CONFIG[nivel];

    if (mismoEquipo && nivel !== 1) {
      await enviarTexto(sock, grupoId, '⛔ Nivel no permitido para desafiar a alguien de tu mismo equipo.\nUsa Nivel 1 o desafía a alguien de otro equipo.', msg);
      return;
    }

    if (!mismoEquipo && nivel === 1) {
      await enviarTexto(sock, grupoId, '⛔ Nivel 1 es solo para miembros del mismo equipo.\nUsa Nivel 2, 3 o 4 para otros equipos.', msg);
      return;
    }

    if (!configNivel) {
      await enviarTexto(sock, grupoId, '⛔ Nivel inválido. Usa: 1, 2, 3 o 4', msg);
      return;
    }

    const montoApuesta = configNivel.monto;
    const puntosDesafiante = obtenerPuntosUsuario(desafianteId);
    const puntosDesafiado = obtenerPuntosUsuario(desafiadoId);

    if (puntosDesafiante < montoApuesta) {
      await enviarTexto(sock, grupoId, `❌ No tienes suficientes puntos para este desafío.\nNecesitas: ${montoApuesta.toLocaleString('es-AR')} pts · Tenés: ${puntosDesafiante.toLocaleString('es-AR')} pts`, msg);
      return;
    }

    if (puntosDesafiado < montoApuesta) {
      await enviarTexto(sock, grupoId, '⚠️ El usuario desafiado no tiene suficientes puntos para aceptar este reto.', msg);
      return;
    }

    const desafios = obtenerDesafiosPorGrupo(grupoId);
    const desafioExistente = desafios.find(
      (desafio) => {
        const parActual = claveParDesafios(grupoId, desafio.desafiante, desafio.desafiado);
        const parNuevo = claveParDesafios(grupoId, desafianteId, desafiadoId);
        return parActual === parNuevo;
      }
    );

    if (desafioExistente) {
      await enviarTexto(sock, grupoId, '⚠️ Ya existe un desafío activo entre estos dos usuarios. Esperá a que termine antes de lanzar otro.', msg);
      return;
    }

    const desafio = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      grupoId,
      desafiante: desafianteId,
      desafiado: desafiadoId,
      nivel,
      nombreNivel: configNivel.nombre,
      monto: montoApuesta,
      tiempoLimite: Date.now() + TIEMPO_LIMITE_MS,
      creadoEn: Date.now()
    };

    desafios.push(desafio);
    iniciarExpiracion(grupoId, desafio, sock);

    await enviarTexto(sock, grupoId, `
⚔️ DESAFÍO LANZADO ⚔️
───────────────────────────
🥷 Desafiante: @${desafianteId} ${emojiEquipo(equipoDesafiante)}
🥷 Desafiado: @${desafiadoId} ${emojiEquipo(equipoDesafiado)}
📊 Nivel: ${nivel} ${configNivel.nombre}
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
      await enviarTexto(sock, grupoId, '⚠️ No tienes ningún desafío pendiente por aceptar.', msg);
      return;
    }

    removerDesafio(grupoId, desafio);

    await enviarTexto(sock, grupoId, `
⚔️ BATALLA EN CURSO... ⚡
───────────────────────────
🥷 @${desafio.desafiante} vs @${desafio.desafiado}
🔄 Calculando resultado...
`);

    const ganaDesafiante = Math.random() > 0.5;
    const ganador = ganaDesafiante ? desafio.desafiante : desafio.desafiado;
    const perdedor = ganaDesafiante ? desafio.desafiado : desafio.desafiante;

    const datos = cargarRanking();
    const usuarios = datos.usuarios || {};

    const infoGanador = usuarios[ganador] || { puntos: 0, nombre: ganador };
    infoGanador.puntos = Number(infoGanador.puntos || 0) + Number(desafio.monto || 0);
    usuarios[ganador] = infoGanador;

    const infoPerdedor = usuarios[perdedor] || { puntos: 0, nombre: perdedor };
    infoPerdedor.puntos = Math.max(0, Number(infoPerdedor.puntos || 0) - Number(desafio.monto || 0));
    usuarios[perdedor] = infoPerdedor;

    datos.usuarios = usuarios;
    guardarRanking(datos);

    const puntosGanador = Number(usuarios[ganador]?.puntos || 0);
    const puntosPerdedor = Number(usuarios[perdedor]?.puntos || 0);

    await enviarTexto(sock, grupoId, `
🏆 ¡GANADOR: @${ganador}! 🎉
───────────────────────────
💸 Gana: +${Number(desafio.monto || 0).toLocaleString('es-AR')} pts
💔 Pierde: -${Number(desafio.monto || 0).toLocaleString('es-AR')} pts
📊 Nuevo puntaje:
🏆 @${ganador}: ${puntosGanador.toLocaleString('es-AR')} pts
💔 @${perdedor}: ${puntosPerdedor.toLocaleString('es-AR')} pts

⚔️ ¡Gran combate! ¡A seguir entrenando! 💪
`);

    return;
  }

  if (command === '/rechazar') {
    const desafio = obtenerDesafioPendiente(grupoId, remitente);

    if (!desafio) {
      await enviarTexto(sock, grupoId, '⚠️ No tienes ningún desafío pendiente.', msg);
      return;
    }

    removerDesafio(grupoId, desafio);

    await enviarTexto(sock, grupoId, `❌ El desafío fue rechazado por @${remitente}.`, msg);
    return;
  }
}
