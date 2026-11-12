import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import { MENUS_POR_COMANDO } from '../src/comunidad/menu.js';

const apiKeyOriginal = process.env.ANIMEAPI_KEY;
process.env.ANIMEAPI_KEY = 'test-anime-key';
const { default: plugin } = await import('../plugins/anime-ia.js?with-test-key');
if (apiKeyOriginal === undefined) delete process.env.ANIMEAPI_KEY;
else process.env.ANIMEAPI_KEY = apiKeyOriginal;

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

test('/imagen-ia sin descripción o con ayuda muestra instrucciones y ejemplos', async () => {
  const { enviados, sock, msg } = crearContexto();

  await plugin.ejecutar(sock, msg, { text: 'ayuda' });

  assert.match(enviados[0][1].text, /Generador de Imágenes con IA/);
  assert.match(enviados[0][1].text, /paraguas rojo/);
  assert.equal(enviados.length, 1);
});

test('/ia rechaza descripciones demasiado largas sin llamar a la API', async () => {
  const { enviados, sock, msg } = crearContexto();
  const postOriginal = axios.post;
  axios.post = async () => {
    throw new Error('No debería llamar a la API');
  };

  try {
    await plugin.ejecutar(sock, msg, { text: 'a'.repeat(501), command: '/ia' });
  } finally {
    axios.post = postOriginal;
  }

  assert.match(enviados[0][1].text, /descripción es muy larga/);
  assert.equal(enviados.length, 1);
});

test('/imagen-ia indica cómo configurar la clave si falta la variable de entorno', async () => {
  const { enviados, sock, msg } = crearContexto();
  const keyOriginal = process.env.ANIMEAPI_KEY;
  delete process.env.ANIMEAPI_KEY;
  const { default: pluginSinClave } = await import('../plugins/anime-ia.js?without-test-key');

  try {
    await pluginSinClave.ejecutar(sock, msg, { text: 'un gato anime' });
  } finally {
    if (keyOriginal === undefined) delete process.env.ANIMEAPI_KEY;
    else process.env.ANIMEAPI_KEY = keyOriginal;
  }

  assert.match(enviados[0][1].text, /ANIMEAPI_KEY/);
  assert.equal(enviados.length, 1);
});

test('/imagen-ia genera la imagen, la descarga en memoria y la envía con su descripción', async () => {
  const { enviados, sock, msg } = crearContexto();
  const postOriginal = axios.post;
  const getOriginal = axios.get;
  const keyOriginal = process.env.ANIMEAPI_KEY;
  const llamadas = [];
  process.env.ANIMEAPI_KEY = 'test-anime-key';
  axios.post = async (url, cuerpo, opciones) => {
    llamadas.push({ url, cuerpo, opciones });
    return {
      data: Buffer.from(JSON.stringify({ image_url: 'https://animeapi.ai/images/test.png' })),
      headers: { 'content-type': 'application/json' }
    };
  };
  axios.get = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return { data: Buffer.from('imagen de prueba') };
  };

  try {
    await plugin.ejecutar(sock, msg, { text: 'Una chica bajo la lluvia', command: '/imagen-ia' });
  } finally {
    axios.post = postOriginal;
    axios.get = getOriginal;
    if (keyOriginal === undefined) delete process.env.ANIMEAPI_KEY;
    else process.env.ANIMEAPI_KEY = keyOriginal;
  }

  assert.equal(llamadas[0].url, 'https://animeapi.ai/api/generate');
  assert.deepEqual(llamadas[0].cuerpo, {
    prompt: 'Una chica bajo la lluvia',
    model: 'anime',
    orientation: 'portrait'
  });
  assert.equal(llamadas[0].opciones.headers.Authorization, 'Bearer test-anime-key');
  assert.equal(llamadas[0].opciones.timeout, 180000);
  assert.equal(llamadas[1].url, 'https://animeapi.ai/images/test.png');
  assert.deepEqual(enviados[0][1], {
    text: '⏳ Generando imagen... Esto puede tardar unos segundos'
  });
  assert.deepEqual(enviados[1][1].image, Buffer.from('imagen de prueba'));
  assert.equal(
    enviados[1][1].caption,
    '🎨 Imagen generada con IA\n📝 Descripción: "Una chica bajo la lluvia"\n✨ ¡Listo!'
  );
});

test('/imagen-ia distingue los errores de conexión', async () => {
  const { enviados, sock, msg } = crearContexto();
  const postOriginal = axios.post;
  const keyOriginal = process.env.ANIMEAPI_KEY;
  process.env.ANIMEAPI_KEY = 'test-anime-key';
  axios.post = async () => {
    throw new Error('connection failed');
  };

  try {
    await plugin.ejecutar(sock, msg, { text: 'un gato anime' });
  } finally {
    axios.post = postOriginal;
    if (keyOriginal === undefined) delete process.env.ANIMEAPI_KEY;
    else process.env.ANIMEAPI_KEY = keyOriginal;
  }

  assert.equal(enviados[1][1].text, '❌ Error de conexión. Intenta más tarde');
});

test('/menu-utilidades incluye los comandos de generación de anime con IA', () => {
  assert.match(MENUS_POR_COMANDO['/menu-utilidades'], /\/imagen-ia/);
  assert.match(MENUS_POR_COMANDO['/menu-utilidades'], /\/ia/);
});
