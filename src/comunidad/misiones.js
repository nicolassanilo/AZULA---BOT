// ==========================================================
// SISTEMA DE MISIONES ALEATORIAS + /Calificar
// ==========================================================
// Este módulo gestiona:
// - un banco grande y variado de misiones por categoría
// - activación de una misión por 24 horas
// - persistencia en data/misiones-activas.json
// - consulta de misión actual
// - cancelación por administradores
// - integración con ranking y perfiles
// ==========================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJsonFileSafe, writeJsonFileSafe } from './archivos-seguros.js';

import { agregarPuntos } from './sistema/ranking.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_DATOS = path.join(__dirname, '../../data/misiones-activas.json');
const DURACION_HORAS = 24;
const DURACION_MS = DURACION_HORAS * 60 * 60 * 1000;

const BANCO_MISIONES = [
  { id: 1, titulo: '🎨 Dibujo Rápido', descripcion: 'Dibujá a mano un personaje de anime y compartilo en el grupo.', dificultad: '⭐⭐ Media', categoria: '🎨 Creatividad' },
  { id: 2, titulo: '✍️ Poema de la Comunidad', descripcion: 'Escribí un poema corto sobre lo que significa este grupo para vos.', dificultad: '⭐⭐ Media', categoria: '🎨 Creatividad' },
  { id: 3, titulo: '🎭 Imitación Perfecta', descripcion: 'Imitá a un miembro del grupo sin decir quién sos y que los demás adivinen.', dificultad: '⭐⭐ Media', categoria: '🎨 Creatividad' },
  { id: 4, titulo: '📖 Historia Colaborativa', descripcion: 'Empezá una historia de 3 oraciones y otro miembro la continúa.', dificultad: '⭐ Fácil', categoria: '🎨 Creatividad' },
  { id: 5, titulo: '🎤 Canción Parodiada', descripcion: 'Cambiá la letra de una canción famosa para que hable de la comunidad.', dificultad: '⭐⭐⭐ Difícil', categoria: '🎨 Creatividad' },
  { id: 6, titulo: '🖼️ Collage Virtual', descripcion: 'Armá una imagen con 3 fotos que representen al grupo.', dificultad: '⭐⭐ Media', categoria: '🎨 Creatividad' },
  { id: 7, titulo: '💡 Slogan del Grupo', descripcion: 'Inventá un slogan o frase pegadiza para la comunidad.', dificultad: '⭐ Fácil', categoria: '🎨 Creatividad' },

  { id: 8, titulo: '⚡ Trivia Relámpago', descripcion: 'Respondé 5 preguntas de cultura general correctamente.', dificultad: '⭐ Fácil', categoria: '⚡ Reto Rápido' },
  { id: 9, titulo: '🎯 Blanco Perfecto', descripcion: 'Mandá un audio diciendo la palabra “comunidad” 10 veces seguidas sin equivocarte.', dificultad: '⭐ Fácil', categoria: '⚡ Reto Rápido' },
  { id: 10, titulo: '🔢 Número Secreto', descripcion: 'Adiviná el número del 1 al 100 que piensa el administrador.', dificultad: '⭐⭐ Media', categoria: '⚡ Reto Rápido' },
  { id: 11, titulo: '✋ 🖐️ ✌️ Torneo', descripcion: 'Ganale a 3 miembros distintos en piedra, papel o tijera.', dificultad: '⭐ Fácil', categoria: '⚡ Reto Rápido' },
  { id: 12, titulo: '🎲 Suma Perfecta', descripcion: 'Tirá 3 dados (o simulalos) y obtené exactamente 12 de suma.', dificultad: '⭐⭐ Media', categoria: '⚡ Reto Rápido' },

  { id: 13, titulo: '🤝 Saludo a 5 Miembros', descripcion: 'Saludá a 5 miembros diferentes con un mensaje personalizado para cada uno.', dificultad: '⭐ Fácil', categoria: '🤝 Social' },
  { id: 14, titulo: '🎁 Elogio Genuino', descripcion: 'Dale un elogio sincero a 3 miembros distintos del grupo.', dificultad: '⭐ Fácil', categoria: '🤝 Social' },
  { id: 15, titulo: '🗣️ Presentación Creativa', descripcion: 'Presentate a la comunidad de una forma original que nadie haya usado.', dificultad: '⭐⭐ Media', categoria: '🤝 Social' },
  { id: 16, titulo: '🔗 Cadena de Bienvenida', descripcion: 'Ayudá a 2 miembros nuevos a entender cómo funciona el bot y el grupo.', dificultad: '⭐⭐ Media', categoria: '🤝 Social' },
  { id: 17, titulo: '💬 Entrevista Rápida', descripcion: 'Hacé 5 preguntas interesantes a un miembro y compartí las respuestas.', dificultad: '⭐⭐ Media', categoria: '🤝 Social' },

  { id: 18, titulo: '🧠 Experto en Anime', descripcion: 'Respondé correctamente 7 preguntas sobre anime que te haga el administrador.', dificultad: '⭐⭐⭐ Difícil', categoria: '🧠 Conocimiento' },
  { id: 19, titulo: '📚 Cultura General', descripcion: 'Acertá 8 de 10 preguntas de cultura general.', dificultad: '⭐⭐ Media', categoria: '🧠 Conocimiento' },
  { id: 20, titulo: '🎬 Experto en Series', descripcion: 'Adiviná 5 series solo por su descripción básica.', dificultad: '⭐⭐ Media', categoria: '🧠 Conocimiento' },
  { id: 21, titulo: '🌍 Geografía Rápida', descripcion: 'Nombrá 10 países en menos de 1 minuto sin repetir continente.', dificultad: '⭐⭐ Media', categoria: '🧠 Conocimiento' },

  { id: 22, titulo: '⚔️ Reto de Equipo', descripcion: 'Juntate con 2 compañeros de tu equipo y completen la trivia juntos.', dificultad: '⭐⭐ Media', categoria: '⚔️ Equipo' },
  { id: 23, titulo: '🏆 Defensores', descripcion: 'Tu equipo debe responder 10 preguntas sin fallar ninguna.', dificultad: '⭐⭐⭐ Difícil', categoria: '⚔️ Equipo' },
  { id: 24, titulo: '🤝 Reclutador', descripcion: 'Ayudá a un miembro sin equipo a elegir uno y registrarse.', dificultad: '⭐⭐ Media', categoria: '⚔️ Equipo' },

  { id: 25, titulo: '🧩 Acertijo Maestro', descripcion: 'Resolvé el acertijo que te envíe el administrador por privado.', dificultad: '⭐⭐⭐ Difícil', categoria: '🧩 Ingenio' },
  { id: 26, titulo: '🔍 Detectives', descripcion: 'Averiguá qué miembro del grupo es el “culpable” según las pistas.', dificultad: '⭐⭐⭐ Difícil', categoria: '🧩 Ingenio' },
  { id: 27, titulo: '🧠 Lógica Pura', descripcion: 'Resolvé 3 problemas de lógica sin ayuda.', dificultad: '⭐⭐⭐ Difícil', categoria: '🧩 Ingenio' },

  { id: 28, titulo: '😂 Chiste Original', descripcion: 'Contá un chiste original que haga reír a al menos 3 miembros.', dificultad: '⭐⭐ Media', categoria: '😂 Humor' },
  { id: 29, titulo: '🎭 Situación Absurda', descripcion: 'Inventá la situación más absurda que podría pasar en el grupo.', dificultad: '⭐⭐ Media', categoria: '😂 Humor' },
  { id: 30, titulo: '🖼️ Meme de la Comunidad', descripcion: 'Creá un meme sobre algún momento o personaje del grupo.', dificultad: '⭐⭐ Media', categoria: '😂 Humor' },

  { id: 31, titulo: '🏃 Reto de Velocidad', descripcion: 'Escribí el alfabeto completo en menos de 30 segundos sin errores.', dificultad: '⭐⭐ Media', categoria: '🏃 Destreza' },
  { id: 32, titulo: '🎯 Memoria', descripcion: 'Recordá y listá 15 miembros del grupo sin mirar la lista.', dificultad: '⭐⭐⭐ Difícil', categoria: '🏃 Destreza' },
  { id: 33, titulo: '✍️ Deletreo Perfecto', descripcion: 'Escribí correctamente 10 palabras complicadas que te digan.', dificultad: '⭐⭐ Media', categoria: '🏃 Destreza' }
];

function crearEstructuraInicial() {
  return {};
}

function cargarMisionesActivas() {
  try {
    fs.mkdirSync(path.dirname(RUTA_DATOS), { recursive: true });

    if (!fs.existsSync(RUTA_DATOS)) {
      writeJsonFileSafe(RUTA_DATOS, crearEstructuraInicial());
      return {};
    }

    return readJsonFileSafe(RUTA_DATOS, {});
  } catch (error) {
    console.warn('⚠️ Error cargando misiones activas:', error?.message || error);
    return {};
  }
}

function guardarMisionesActivas(datos) {
  try {
    fs.mkdirSync(path.dirname(RUTA_DATOS), { recursive: true });
    writeJsonFileSafe(RUTA_DATOS, datos && typeof datos === 'object' ? datos : {});
  } catch (error) {
    console.warn('⚠️ Error guardando misiones activas:', error?.message || error);
  }
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return 'Sin fecha';

  try {
    return new Date(fechaISO).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return fechaISO;
  }
}

function misionExpirada(misionActiva) {
  if (!misionActiva || !misionActiva.expira) return true;
  return new Date() > new Date(misionActiva.expira);
}

function tiempoRestante(fechaExpiracion) {
  const diferencia = new Date(fechaExpiracion).getTime() - Date.now();

  if (diferencia <= 0) {
    return 'Expirada';
  }

  const horas = Math.floor(diferencia / (1000 * 60 * 60));
  const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));

  if (horas > 0) {
    return `${horas}h ${minutos}m`;
  }

  return `${minutos} minutos`;
}

function obtenerMisionActiva(grupoId) {
  const datos = cargarMisionesActivas();
  const actual = datos[grupoId];

  if (!actual) {
    return null;
  }

  if (misionExpirada(actual)) {
    delete datos[grupoId];
    guardarMisionesActivas(datos);
    console.log(`🧹 Misión expirada eliminada del grupo ${grupoId}`);
    return null;
  }

  return actual;
}

function seleccionarMisionAleatoria() {
  const indice = Math.floor(Math.random() * BANCO_MISIONES.length);
  return BANCO_MISIONES[indice];
}

function obtenerFechaActual() {
  const fecha = new Date();
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return `${dias[fecha.getDay()]}, ${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}

function construirMensajePago(usuarioMencionado, misionActiva) {
  const nombreMision = misionActiva?.titulo || 'Misión completada';

  return `*💰PAGO POR MISIÓN💰*

*Para:✨* @${usuarioMencionado}

*•🕹️~600,000 pts por misión~*
• 🕹️~*100,000 pts por Bonus*~
•🕹️~*200,000 pts por participar*~

*Misión:* ${nombreMision}

${obtenerFechaActual()}

📜PD: Reenvie este mensaje al grupo de puntos de su Team.`;
}

async function esAdministrador(sock, grupoId, usuarioId) {
  try {
    const metadata = await sock.groupMetadata(grupoId);
    const participante = metadata?.participants?.find((p) => p.id === usuarioId);
    const admin = participante?.admin || '';
    return admin === 'admin' || admin === 'superadmin';
  } catch (error) {
    return false;
  }
}

export async function run(sock, msg) {
  try {
    const grupoId = msg.key.remoteJid;

    if (!grupoId) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: '⚠️ Este comando solo puede usarse dentro de un grupo.'
      }, { quoted: msg });
      return;
    }

    const misionActiva = obtenerMisionActiva(grupoId);

    if (misionActiva) {
      const mision = BANCO_MISIONES.find((item) => item.id === misionActiva.misionId) || null;
      const tiempo = tiempoRestante(misionActiva.expira);

      await sock.sendMessage(grupoId, {
        text: `⚠️ *Ya hay una misión activa.*\n\n📌 *${mision?.titulo || 'Misión activa'}*\n⏰ Tiempo restante: ${tiempo}\n📅 Vence: ${formatearFecha(misionActiva.expira)}\n\nSi querés otra, espera que expire o cancelala con */cancelar-mision*`
      }, { quoted: msg });
      return;
    }

    const mision = seleccionarMisionAleatoria();
    const activadaEn = new Date();
    const expira = new Date(activadaEn.getTime() + DURACION_MS);

    const datos = cargarMisionesActivas();
    datos[grupoId] = {
      misionId: mision.id,
      activadaPor: msg.key.participant || msg.key.remoteJid,
      activada: activadaEn.toISOString(),
      expira: expira.toISOString()
    };

    guardarMisionesActivas(datos);

    const mensaje = `🎯 *MISIÓN ACTIVADA* 🎯

📌 *${mision.titulo}*
📂 Categoría: ${mision.categoria}
⚡ Dificultad: ${mision.dificultad}

📝 *Descripción:*
${mision.descripcion}

⏰ *Duración:* 24 horas
📅 *Vence:* ${formatearFecha(expira.toISOString())}

🚀 ¡Aceptás el reto? Cuando termines, un administrador puede usar:
*/Calificar @usuario*

¡Mucha suerte!`;

    await sock.sendMessage(grupoId, { text: mensaje }, { quoted: msg });
    console.log(`🎲 Misión #${mision.id} activada en grupo ${grupoId} - vence ${formatearFecha(expira.toISOString())}`);
  } catch (error) {
    console.error('❌ Error al activar misión:', error);
    await sock.sendMessage(msg.key.remoteJid, {
      text: '❌ Ocurrió un error al activar la misión. Intentalo nuevamente.'
    }, { quoted: msg });
  }
}

export function activarMisiones(sock) {
  if (!sock || typeof sock.ev?.on !== 'function') {
    console.error('❌ No se pudo activar el sistema de misiones: sock inválido');
    return;
  }

  if (sock.__misionesActivasRegistradas) {
    return;
  }

  sock.__misionesActivasRegistradas = true;

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg?.message) return;

      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const textoNormalizado = texto.trim();
      const comando = textoNormalizado.toLowerCase();
      const grupoId = msg.key.remoteJid;
      const senderId = msg.key.participant || msg.key.remoteJid;

      if (!grupoId || !grupoId.endsWith('@g.us')) return;

      if (comando === '/mision') {
        const actual = obtenerMisionActiva(grupoId);

        if (actual) {
          const mision = BANCO_MISIONES.find((item) => item.id === actual.misionId) || null;
          await sock.sendMessage(grupoId, {
            text: `⚠️ *Ya hay una misión activa.*\n\n📌 *${mision?.titulo || 'Misión activa'}*\n⏰ Tiempo restante: ${tiempoRestante(actual.expira)}\n📅 Vence: ${formatearFecha(actual.expira)}\n\nSi querés otra, espera que expire o cancelala con */cancelar-mision*`
          }, { quoted: msg });
          return;
        }

        const mision = seleccionarMisionAleatoria();
        const expira = new Date(Date.now() + DURACION_MS).toISOString();
        const datos = cargarMisionesActivas();

        datos[grupoId] = {
          misionId: mision.id,
          activadaPor: senderId,
          activada: new Date().toISOString(),
          expira
        };

        guardarMisionesActivas(datos);

        await sock.sendMessage(grupoId, {
          text: `🎯 *MISIÓN ACTIVADA* 🎯\n\n📌 *${mision.titulo}*\n📂 ${mision.categoria}\n⚡ ${mision.dificultad}\n\n📝 ${mision.descripcion}\n\n⏰ *Duración:* 24 horas\n📅 *Vence:* ${formatearFecha(expira)}\n\n🚀 ¡Aceptás el reto? Cuando termines, un administrador puede usar:\n*/Calificar @usuario*\n\n¡Mucha suerte!`
        }, { quoted: msg });

        console.log(`🎲 Misión #${mision.id} activada en grupo ${grupoId} - vence ${formatearFecha(expira)}`);
        return;
      }

      if (comando === '/mision-actual') {
        const actual = obtenerMisionActiva(grupoId);

        if (!actual) {
          await sock.sendMessage(grupoId, {
            text: '📭 *No hay misión activa en este grupo.*\n\nActivá una nueva con */mision*.'
          }, { quoted: msg });
          return;
        }

        const mision = BANCO_MISIONES.find((item) => item.id === actual.misionId);

        if (!mision) {
          await sock.sendMessage(grupoId, {
            text: '⚠️ La misión activa ya no está disponible en el banco.'
          }, { quoted: msg });
          return;
        }

        await sock.sendMessage(grupoId, {
          text: `🎯 *MISIÓN ACTUAL* 🎯\n\n📌 *${mision.titulo}*\n📂 ${mision.categoria}\n⚡ ${mision.dificultad}\n\n📝 ${mision.descripcion}\n\n⏰ Tiempo restante: ${tiempoRestante(actual.expira)}\n📅 Vence: ${formatearFecha(actual.expira)}`
        }, { quoted: msg });
        return;
      }

      if (comando === '/cancelar-mision') {
        const esAdmin = await esAdministrador(sock, grupoId, senderId);

        if (!esAdmin) {
          await sock.sendMessage(grupoId, {
            text: '⛔ *Solo los administradores pueden cancelar misiones.*'
          }, { quoted: msg });
          return;
        }

        const actual = obtenerMisionActiva(grupoId);

        if (!actual) {
          await sock.sendMessage(grupoId, {
            text: '📭 *No hay una misión activa para cancelar.*\n\nPodés activar una nueva con */mision*.'
          }, { quoted: msg });
          return;
        }

        const mision = BANCO_MISIONES.find((item) => item.id === actual.misionId) || null;

        await sock.sendMessage(grupoId, {
          text: `⚠️ *¿CONFIRMAR CANCELACIÓN?*\n\nMisión actual: ${mision?.titulo || 'Misión activa'}\n\nEscribí *CONFIRMAR* para cancelar la misión y activar otra inmediatamente.\nCualquier otra cosa cancela esta acción.`
        }, { quoted: msg });

        const manejadorConfirmacion = async ({ messages: mensajesSeguidas }) => {
          try {
            const respuesta = mensajesSeguidas[0];
            if (!respuesta?.message || respuesta.key.remoteJid !== grupoId) return;

            const textoRespuesta = respuesta.message.conversation || respuesta.message.extendedTextMessage?.text || '';
            const remitenteRespuesta = respuesta.key.participant || respuesta.key.remoteJid;

            if (remitenteRespuesta !== senderId) return;

            if (textoRespuesta.trim().toUpperCase() === 'CONFIRMAR') {
              const datos = cargarMisionesActivas();
              delete datos[grupoId];
              guardarMisionesActivas(datos);

              await sock.sendMessage(grupoId, {
                text: `❌ *MISIÓN CANCELADA*\n\n${mision?.titulo || 'La misión'} ha sido cancelada.\n\n✅ Ya podés activar una nueva misión con */mision*.`
              }, { quoted: respuesta });

              console.log(`🧹 Misión cancelada en grupo ${grupoId}`);
            } else {
              await sock.sendMessage(grupoId, {
                text: '✅ Cancelación abortada. La misión sigue activa.'
              }, { quoted: respuesta });
            }

            sock.ev.off('messages.upsert', manejadorConfirmacion);
          } catch (error) {
            console.error('❌ Error en confirmación de cancelación de misión:', error);
          }
        };

        sock.ev.on('messages.upsert', manejadorConfirmacion);

        setTimeout(() => {
          try {
            sock.ev.off('messages.upsert', manejadorConfirmacion);
          } catch (error) {
            console.error('❌ Error limpiando listener temporal de cancelación:', error);
          }
        }, 30000);

        return;
      }

      if (!textoNormalizado.toLowerCase().startsWith('/calificar')) {
        return;
      }

      const mencionados = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const usuarioMencionado = mencionados[0];

      if (!usuarioMencionado) {
        await sock.sendMessage(grupoId, {
          text: '⚠️ Tenés que etiquetar a quién querés calificar. Ejemplo: */Calificar @usuario*'
        }, { quoted: msg });
        return;
      }

      const usuarioTag = usuarioMencionado.replace(/@.+$/, '');
      const actual = obtenerMisionActiva(grupoId);
      const infoGrupo = await sock.groupMetadata(grupoId);
      const participantes = infoGrupo?.participants || [];
      const esAdmin = participantes.some((participante) => {
        const esEsteUsuario = participante.id === senderId;
        return esEsteUsuario && ['admin', 'superadmin'].includes(participante.admin || '');
      });

      const activador = actual?.activadaPor || null;
      const puedeCalificar = esAdmin || (actual && senderId === activador);

      if (!puedeCalificar) {
        await sock.sendMessage(grupoId, {
          text: '⚠️ Solo los administradores o quien activó la misión pueden usar /Calificar.'
        }, { quoted: msg });
        return;
      }

      const mensajePago = construirMensajePago(usuarioTag, actual || null);
      const resultadoRanking = agregarPuntos(usuarioMencionado, usuarioTag, 900000);

      await sock.sendMessage(grupoId, {
        text: mensajePago,
        mentions: [usuarioMencionado]
      }, { quoted: msg });

      if (resultadoRanking.exito) {
        await sock.sendMessage(grupoId, {
          text: `📊 *Puntos sumados*\n\n${resultadoRanking.emoji} *${resultadoRanking.equipo}*\n\nUsuario: ${usuarioTag}\nPuntos individuales: ${resultadoRanking.totalUsuario.toLocaleString('es-AR')} pts\nPuntos del equipo: ${resultadoRanking.totalEquipo.toLocaleString('es-AR')} pts`,
          mentions: [usuarioMencionado]
        }, { quoted: msg });
      } else {
        await sock.sendMessage(grupoId, {
          text: `⚠️ ${resultadoRanking.mensaje}\n\nRegistrate con */registrar* o agregá 🍥, 🩸 o 🔰 en tu nombre.`,
          mentions: [usuarioMencionado]
        }, { quoted: msg });
      }

      console.log(`💰 Pago por misión enviado a ${usuarioTag} en grupo ${grupoId}`);
    } catch (error) {
      console.error('❌ Error procesando comandos de misiones:', error);
    }
  });

  console.log(`✅ Sistema de misiones actualizado (${BANCO_MISIONES.length} misiones, duración 24 horas).`);
}
