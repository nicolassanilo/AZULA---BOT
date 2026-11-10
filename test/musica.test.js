import assert from 'node:assert/strict';
import test from 'node:test';
import plugin from '../plugins/musica.js';

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

test('/musica informa que YouTube está temporalmente bloqueado', async () => {
  const { enviados, sock, msg } = crearContexto();

  await plugin.ejecutar(sock, msg, { text: 'https://www.youtube.com/watch?v=abc' });

  assert.match(enviados[0][1].text, /YouTube está temporalmente bloqueado/);
  assert.equal(enviados.length, 1);
});

test('/musica ayuda indica que acepta enlaces de SoundCloud', async () => {
  const { enviados, sock, msg } = crearContexto();

  await plugin.ejecutar(sock, msg, { text: 'ayuda' });

  assert.match(enviados[0][1].text, /URL de SoundCloud/);
});

test('/musica rechaza enlaces que no son de SoundCloud ni YouTube', async () => {
  const { enviados, sock, msg } = crearContexto();

  await plugin.ejecutar(sock, msg, { text: 'https://example.com/audio' });

  assert.match(enviados[0][1].text, /URL inválida/);
});
