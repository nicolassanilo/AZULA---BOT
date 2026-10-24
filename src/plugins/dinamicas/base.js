// ==========================================
// ⚙️ BASE COMPARTIDA — Dinámicas interactivas
// ==========================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJsonFileSafe, writeJsonFileSafe } from '../../comunidad/archivos-seguros.js';

import { agregarPuntos } from '../../comunidad/sistema/ranking.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../../data');
const RUTA_GANADORES = path.join(DATA_DIR, 'dinamicas-ganadores.json');

export const PREMIOS = {
  normal: [
    { puesto: 1, emoji: '⭐', puntos: 70000 },
    { puesto: 2, emoji: '✨', puntos: 60000 },
    { puesto: 3, emoji: '💫', puntos: 50000 },
    { puesto: 4, emoji: '💥', puntos: 40000 },
    { puesto: 'resto', emoji: '🔥', puntos: 30000 }
  ],
  bonus: [
    { puesto: 1, emoji: '✨', puntos: 140000 },
    { puesto: 2, emoji: '💫', puntos: 120000 },
    { puesto: 3, emoji: '💥', puntos: 100000 },
    { puesto: 'resto', emoji: '🔥', puntos: 80000 }
  ]
};

export const TIEMPO_RONDA = 50000;

let dinamicaActiva = null;
let listenerRegistrado = false;

function normalizarUsuarioId(usuarioId = '') {
  return String(usuarioId || '').trim().replace(/^@/, '');
}

function obtenerTextoMensaje(msg) {
  if (!msg?.message) return '';

  return msg.message.conversation
    || msg.message.extendedTextMessage?.text
    || msg.message.imageMessage?.caption
    || msg.message.videoMessage?.caption
    || '';
}

function asegurarArchivoGanadores() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });

    if (!fs.existsSync(RUTA_GANADORES)) {
      writeJsonFileSafe(RUTA_GANADORES, []);
    }
  } catch (error) {
    console.warn('⚠️ Error asegurando archivo de ganadores de dinámicas:', error?.message || error);
  }
}

function cargarGanadores() {
  try {
    asegurarArchivoGanadores();
    const datos = readJsonFileSafe(RUTA_GANADORES, []);
    return Array.isArray(datos) ? datos : [];
  } catch (error) {
    console.warn('⚠️ Error cargando ganadores de dinámicas:', error?.message || error);
    return [];
  }
}

function guardarGanadores(datos) {
  try {
    asegurarArchivoGanadores();
    writeJsonFileSafe(RUTA_GANADORES, Array.isArray(datos) ? datos : []);
  } catch (error) {
    console.warn('⚠️ Error guardando ganadores de dinámicas:', error?.message || error);
  }
}

function registrarResultadoRonda(resultado) {
  const datos = cargarGanadores();
  datos.push(resultado);
  guardarGanadores(datos);
}

function obtenerPreguntaSinRepetir(lista, usados, clave, grupoId) {
  if (usados.length >= lista.length) {
    usados.length = 0;
    enviarMensaje(null, grupoId, '🔄 ¡Se han recargado todas las preguntas! Nuevas rondas disponibles ✨');
  }

  const disponibles = lista.filter((item) => !usados.includes(item[clave]));

  if (disponibles.length === 0) {
    usados.length = 0;
    return obtenerPreguntaSinRepetir(lista, usados, clave, grupoId);
  }

  const elegida = disponibles[Math.floor(Math.random() * disponibles.length)];
  usados.push(elegida[clave]);
  return elegida;
}

async function enviarMensaje(sock, grupoId, texto, msg = null) {
  if (!sock || !grupoId) return;

  const opciones = msg ? { quoted: msg } : {};
  await sock.sendMessage(grupoId, { text: texto }, opciones);
}

async function puedeCerrarDinámica(sock, grupoId, usuarioId) {
  try {
    const metadata = await sock.groupMetadata(grupoId);
    const participante = metadata?.participants?.find((p) => p.id === usuarioId);

    if (!participante) {
      return false;
    }

    return ['admin', 'superadmin', 'owner'].includes(participante.admin || '') || participante.isAdmin || participante.isSuperAdmin;
  } catch (error) {
    return false;
  }
}

function registrarEscucha(sock) {
  if (listenerRegistrado) {
    return;
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg?.message || msg.key?.fromMe || !dinamicaActiva) return;

      const grupoId = msg.key.remoteJid;
      if (grupoId !== dinamicaActiva.grupoId) return;
      if (!dinamicaActiva.escuchando) return;

      const texto = obtenerTextoMensaje(msg).trim();
      if (!texto || texto.startsWith('/')) return;

      const usuarioId = normalizarUsuarioId(msg.key.participant || msg.key.remoteJid);
      const usuarioNombre = msg.pushName || usuarioId;
      const validador = dinamicaActiva.datos?.validarRespuesta;

      const esCorrecta = typeof validador === 'function'
        ? validador(texto, dinamicaActiva.preguntaActual)
        : false;

      if (!esCorrecta) {
        return;
      }

      if (dinamicaActiva.respuestas.some((respuesta) => respuesta.usuarioId === usuarioId)) {
        return;
      }

      dinamicaActiva.respuestas.push({
        usuarioId,
        usuario: usuarioNombre,
        texto,
        orden: Date.now()
      });
    } catch (error) {
      console.error('❌ Error registrando respuestas de dinámica:', error);
    }
  });

  listenerRegistrado = true;
}

async function procesarRonda(sock, grupoId, datos, numeroRonda, pregunta) {
  if (!dinamicaActiva || !dinamicaActiva.activa) return;

  dinamicaActiva.escuchando = true;
  dinamicaActiva.respuestas = [];
  dinamicaActiva.datos = datos;
  dinamicaActiva.preguntaActual = pregunta;

  const tipo = datos.id === 'equipo_sueno' ? 'bonus' : 'normal';
  const premios = tipo === 'normal' ? PREMIOS.normal : PREMIOS.bonus;

  const tituloRonda = tipo === 'normal'
    ? `🔄 RONDA ${numeroRonda}/${datos.rondas}`
    : `🔄 RONDA BONUS ${numeroRonda - 10}/${datos.rondas}`;

  await enviarMensaje(sock, grupoId, `${tituloRonda}\n\n${datos.formatoPregunta(pregunta)}`);

  const inicio = Date.now();
  let ultimaCuentaEnviada = null;

  await new Promise((resolve) => {
    const cuentaRegresiva = setInterval(async () => {
      const transcurrido = Date.now() - inicio;
      const restante = Math.max(0, Math.ceil((TIEMPO_RONDA - transcurrido) / 1000));

      if (restante <= 10 && restante > 0 && restante !== ultimaCuentaEnviada) {
        ultimaCuentaEnviada = restante;
        const secuencia = Array.from({ length: 11 }, (_, index) => 10 - index).join(' · ');
        await enviarMensaje(sock, grupoId, `⏰ TIEMPO AGOTÁNDOSE: ${secuencia}`);
      }

      if (restante <= 0) {
        clearInterval(cuentaRegresiva);
        resolve();
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(cuentaRegresiva);
      resolve();
    }, TIEMPO_RONDA + 100);
  });

  dinamicaActiva.escuchando = false;
  await enviarMensaje(sock, grupoId, '🔔 ¡TIEMPO! Calificando respuestas...');

  const respuestasOrdenadas = [...dinamicaActiva.respuestas].sort((a, b) => a.orden - b.orden);

  if (respuestasOrdenadas.length === 0) {
    const respuestaCorrecta = pregunta?.respuesta || pregunta?.rol || pregunta?.frase || 'la opción indicada';
    await enviarMensaje(sock, grupoId, `❌ Nadie acertó esta ronda. La respuesta correcta era: ${respuestaCorrecta}`);
    return;
  }

  const respuestaConPuntaje = [];

  for (let i = 0; i < respuestasOrdenadas.length; i++) {
    const respuesta = respuestasOrdenadas[i];
    const puesto = i + 1;
    const premio = premios.find((item) => item.puesto === puesto) || premios.find((item) => item.puesto === 'resto');

    if (!premio) continue;

    respuestaConPuntaje.push({
      ...respuesta,
      puesto,
      premio
    });
  }

  let resultadoTexto = `━━━━━ 🏆 RESULTADOS DE LA RONDA ━━━━━\n`;
  const ganadores = respuestaConPuntaje.slice(0, 4);
  const resto = respuestaConPuntaje.slice(4);

  for (let index = 0; index < ganadores.length; index++) {
    const item = ganadores[index];
    const puntos = Number(item.premio.puntos || 0);

    await agregarPuntos(item.usuarioId, item.usuario, puntos);

    registrarResultadoRonda({
      fecha: new Date().toISOString(),
      tipo,
      ronda: numeroRonda,
      puesto: item.puesto,
      usuario: item.usuario,
      usuarioId: item.usuarioId,
      puntosGanados: puntos
    });

    resultadoTexto += `${item.premio.emoji} ${item.puesto}° @${item.usuario} → +${puntos.toLocaleString('es-AR')} pts ✅\n`;
  }

  const premioResto = premios.find((item) => item.puesto === 'resto');
  if (resto.length > 0) {
    const usuariosResto = resto.map((item) => `@${item.usuario}`);
    const puntosResto = Number(premioResto?.puntos || 0);

    for (const item of resto) {
      await agregarPuntos(item.usuarioId, item.usuario, puntosResto);
      registrarResultadoRonda({
        fecha: new Date().toISOString(),
        tipo,
        ronda: numeroRonda,
        puesto: 'resto',
        usuario: item.usuario,
        usuarioId: item.usuarioId,
        puntosGanados: puntosResto
      });
    }

    resultadoTexto += `${premioResto?.emoji || '🔥'} ${usuariosResto.join(', ')} → +${puntosResto.toLocaleString('es-AR')} pts c/u\n`;
  }

  resultadoTexto += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  await enviarMensaje(sock, grupoId, resultadoTexto);
}

export async function iniciarDinámicaComun(sock, grupoId, datos) {
  registrarEscucha(sock);

  dinamicaActiva = {
    grupoId,
    activa: true,
    escuchando: false,
    respuestas: [],
    datos,
    preguntaActual: null
  };

  const usados = [];

  await enviarMensaje(sock, grupoId, datos.mensajeInicio);

  for (let ronda = 1; ronda <= datos.rondas; ronda++) {
    const clave = datos.id === 'equipo_sueno' ? 'rol' : 'pista';
    const pregunta = obtenerPreguntaSinRepetir(datos.preguntas, usados, clave, grupoId);
    await procesarRonda(sock, grupoId, datos, ronda, pregunta);
  }

  await enviarMensaje(sock, grupoId, `🏆 ¡${datos.nombre} FINALIZADA! Gracias por participar ✨`);
  dinamicaActiva = null;
}

export function getDinámicaActiva() {
  return dinamicaActiva;
}

export async function finalizarDinámica(sock, grupoId, usuarioId) {
  const esAdmin = await puedeCerrarDinámica(sock, grupoId, usuarioId);

  if (!esAdmin) {
    await enviarMensaje(sock, grupoId, '⚠️ Solo los administradores pueden detener la dinámica.');
    return false;
  }

  if (!dinamicaActiva || dinamicaActiva.grupoId !== grupoId) {
    await enviarMensaje(sock, grupoId, '⚠️ No hay una dinámica activa en este grupo.');
    return false;
  }

  dinamicaActiva.activa = false;
  dinamicaActiva.escuchando = false;
  dinamicaActiva = null;

  await enviarMensaje(sock, grupoId, '🛑 Dinámica detenida por un administrador.');
  return true;
}
