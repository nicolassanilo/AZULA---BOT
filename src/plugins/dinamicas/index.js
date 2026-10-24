// ==========================================
// 📂 CARGADOR DE DINÁMICAS — Versión con diagnóstico
// ==========================================
import { readdir } from 'fs/promises';
import { iniciarDinámicaComun } from './base.js';

let listaDinamicas = [];
let ultimaUsada = null;

export async function cargarTodasLasDinamicas() {
  if (listaDinamicas.length > 0) return listaDinamicas;

  try {
    console.log('🔍 Leyendo carpeta dinamicas...');
    const archivos = await readdir('./src/plugins/dinamicas/');
    const modulos = archivos.filter(f => 
      f.startsWith('tipo-') && f.endsWith('.js')
    );
    console.log(`📁 Archivos encontrados: ${modulos.join(', ')}`);

    listaDinamicas = [];
    for (const archivo of modulos) {
      try {
        const ruta = `./${archivo}`;
        const modulo = await import(ruta);
        
        if (!modulo.datos) {
          console.log(`⚠️ ${archivo} → FALTA: export const datos = { ... }`);
          continue;
        }
        if (!modulo.datos.id || !modulo.datos.nombre) {
          console.log(`⚠️ ${archivo} → Faltan campos obligatorios (id, nombre)`);
          continue;
        }
        if (typeof modulo.datos.formatoPregunta !== 'function') {
          console.log(`⚠️ ${archivo} → FALTA: formatoPregunta: function() { ... }`);
          continue;
        }
        if (typeof modulo.datos.validarRespuesta !== 'function') {
          console.log(`⚠️ ${archivo} → FALTA: validarRespuesta: function() { ... }`);
          continue;
        }

        listaDinamicas.push(modulo.datos);
        console.log(`✅ ${archivo} → ${modulo.datos.nombre}`);
        
      } catch (error) {
        console.log(`❌ ${archivo} → ERROR: ${error.message}`);
      }
    }
    
    console.log(`📊 Total cargadas: ${listaDinamicas.length}`);
    return listaDinamicas;
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
    return [];
  }
}

export async function elegirDinámicaAleatoria() {
  const todas = await cargarTodasLasDinamicas();
  if (!todas || todas.length === 0) return null;
  if (todas.length === 1) return todas[0];

  let seleccionada;
  do {
    seleccionada = todas[Math.floor(Math.random() * todas.length)];
  } while (seleccionada.id === ultimaUsada && todas.length > 1);

  ultimaUsada = seleccionada.id;
  return seleccionada;
}

export async function iniciarDinámica(grupoId, enviarMensaje, escucharMensajes) {
  try {
    const dinámica = await elegirDinámicaAleatoria();
    
    if (!dinámica) {
      return enviarMensaje(grupoId, '⚠️ No hay dinámicas disponibles. Revisá la consola.');
    }

    await enviarMensaje(grupoId, `
🎮 INICIANDO: ${dinámica.nombre}
${dinámica.descripcionCorta}

📋 ${dinámica.rondas} rondas · ⏱️ 50s por respuesta
    `);

    await iniciarDinámicaComun(dinámica, grupoId, enviarMensaje, escucharMensajes);
    
  } catch (error) {
    console.error('❌ Error en dinámica:', error);
    await enviarMensaje(grupoId, '❌ Error al ejecutar la dinámica.');
  }
}
