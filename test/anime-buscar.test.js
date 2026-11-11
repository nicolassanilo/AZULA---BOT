import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import plugin from '../plugins/anime-buscar.js';
import { comandos as comandosMenu, MENUS_POR_COMANDO } from '../src/comunidad/menu.js';

function crearContexto() {
  const enviados = [];
  const sock = {
    async sendMessage(...argumentos) {
      enviados.push(argumentos);
    }
  };
  const msg = { key: { remoteJid: 'chat' } };
  return { enviados, sock, msg };
}

test('/anime-buscar sin término muestra las instrucciones', async () => {
  const { enviados, sock, msg } = crearContexto();

  await plugin.ejecutar(sock, msg, { text: '' });

  assert.match(enviados[0][1].text, /Buscador de Imágenes de Anime/);
  assert.match(enviados[0][1].text, /\/anime-buscar kawaii/);
  assert.equal(enviados.length, 1);
});

test('/anime-buscar sin resultados presenta el aviso solicitado', async () => {
  const { enviados, sock, msg } = crearContexto();
  const getOriginal = axios.get;
  axios.get = async () => ({ data: { results: [] } });

  try {
    await plugin.ejecutar(sock, msg, { text: 'dragón' });
  } finally {
    axios.get = getOriginal;
  }

  assert.equal(
    enviados[0][1].text,
    '⚠️ No encontré resultados para: "dragón"\nIntenta con otra palabra o etiqueta en inglés'
  );
  assert.equal(enviados.length, 1);
});

test('/anime-imagen busca, descarga en memoria y envía una imagen aleatoria', async () => {
  const { enviados, sock, msg } = crearContexto();
  const getOriginal = axios.get;
  const llamadas = [];
  axios.get = async (url, opciones) => {
    llamadas.push({ url, opciones });
    if (opciones.responseType === 'arraybuffer') {
      return { data: Buffer.from('imagen de prueba') };
    }
    return {
      data: {
        results: [
          { url: 'https://nekos.best/api/v2/test-1.jpg' },
          { url: 'https://nekos.best/api/v2/test-2.jpg' }
        ]
      }
    };
  };

  try {
    await plugin.ejecutar(sock, msg, { text: 'neko', command: '/anime-imagen' });
  } finally {
    axios.get = getOriginal;
  }

  assert.equal(llamadas[0].url, 'https://api.nekos.best/api/v2/search');
  assert.deepEqual(llamadas[0].opciones.params, { query: 'neko' });
  assert.ok(llamadas[1].url.startsWith('https://nekos.best/api/v2/test-'));
  assert.deepEqual(enviados[0][1].image, Buffer.from('imagen de prueba'));
  assert.equal(
    enviados[0][1].caption,
    '🎌 Imagen de Anime\n🔍 Búsqueda: "neko"\n✨ ¡Disfrútala!\n📸 Fuente: Nekos.best'
  );
});

test('/anime-buscar informa los errores de conexión', async () => {
  const { enviados, sock, msg } = crearContexto();
  const getOriginal = axios.get;
  axios.get = async () => {
    throw new Error('network error');
  };

  try {
    await plugin.ejecutar(sock, msg, { text: 'maid' });
  } finally {
    axios.get = getOriginal;
  }

  assert.equal(enviados[0][1].text, '❌ No pude conectarme al servicio. Intenta más tarde.');
});

test('/menu-utilidades incluye los comandos de imágenes de anime', () => {
  assert.ok(comandosMenu.includes('/menu-utilidades'));
  assert.match(MENUS_POR_COMANDO['/menu-utilidades'], /\/anime-buscar/);
  assert.match(MENUS_POR_COMANDO['/menu-utilidades'], /\/anime-imagen/);
});
