import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import plugin from '../plugins/pexels.js';
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

test('/foto explica el uso si no se proporciona palabra clave', async () => {
  const { enviados, sock, msg } = crearContexto();

  await plugin.ejecutar(sock, msg, { text: '', config: { pexelsApiKey: 'test-key' } });

  assert.equal(enviados[0][1].text, '📸 Dime qué buscas. Ejemplo: /foto gato');
  assert.equal(enviados.length, 1);
});

test('/menu-utilidades está registrado y muestra el menú', () => {
  assert.ok(comandosMenu.includes('/menu-utilidades'));
  assert.ok(MENUS_POR_COMANDO['/menu-utilidades']);
});

test('/imagen informa si falta configurar la clave API', async () => {
  const { enviados, sock, msg } = crearContexto();

  await plugin.ejecutar(sock, msg, { text: 'gatos', command: '/imagen' });

  assert.match(enviados[0][1].text, /pexelsApiKey/);
  assert.equal(enviados.length, 1);
});

test('/foto avisa cuando Pexels no encuentra resultados', async () => {
  const { enviados, sock, msg } = crearContexto();
  const getOriginal = axios.get;
  axios.get = async () => ({ data: { photos: [] } });

  try {
    await plugin.ejecutar(sock, msg, {
      text: 'paisaje lunar',
      command: '/foto',
      config: { pexelsApiKey: 'test-key' }
    });
  } finally {
    axios.get = getOriginal;
  }

  assert.match(enviados[0][1].text, /No encontré imágenes/);
  assert.equal(enviados.length, 1);
});

test('/foto envía la imagen en memoria con crédito y página aleatoria', async () => {
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
        photos: [{ src: { large: 'https://images.pexels.com/test.jpg' } }]
      }
    };
  };

  try {
    await plugin.ejecutar(sock, msg, {
      text: 'bosque',
      command: '/foto',
      config: { pexelsApiKey: 'test-key' }
    });
  } finally {
    axios.get = getOriginal;
  }

  assert.equal(llamadas[0].opciones.params.per_page, 1);
  assert.ok(llamadas[0].opciones.params.page >= 1 && llamadas[0].opciones.params.page <= 10);
  assert.equal(llamadas[0].url, 'https://api.pexels.com/v1/search');
  assert.equal(llamadas[0].opciones.headers.Authorization, 'test-key');
  assert.deepEqual(enviados[0][1].image, Buffer.from('imagen de prueba'));
  assert.equal(enviados[0][1].caption, '📸 Imagen de Pexels\n🔍 Búsqueda: "bosque"\n✨ ¡Disfrútala!');
});

test('/foto informa cuando Pexels alcanzó el límite de solicitudes', async () => {
  const { enviados, sock, msg } = crearContexto();
  const getOriginal = axios.get;
  axios.get = async () => {
    const error = new Error('Rate limited');
    error.response = { status: 429 };
    throw error;
  };

  try {
    await plugin.ejecutar(sock, msg, {
      text: 'gatos',
      command: '/foto',
      config: { pexelsApiKey: 'test-key' }
    });
  } finally {
    axios.get = getOriginal;
  }

  assert.equal(enviados[0][1].text, '❌ No pude conectarme a Pexels. Intenta más tarde.');
  assert.equal(enviados.length, 1);
});
