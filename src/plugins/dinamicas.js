// ==========================================
// 🔁 WRAPPER: DINÁMICAS MODULARES
// ==========================================

import { iniciarDinámica, finalizarDinamica } from './dinamicas/index.js';

export async function run(sock, msg, { command }) {
  if (command === '/dinamica') {
    return iniciarDinámica(sock, msg);
  }

  if (command === '/dinamica-fin') {
    return finalizarDinamica(sock, msg);
  }
}

export const command = ['/dinamica', '/dinamica-fin'];
