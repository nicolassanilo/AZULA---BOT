import assert from 'node:assert/strict';
import test from 'node:test';
import { detectarMedia } from '../plugins/stickers.js';

test('detecta GIFs animados de Baileys mediante gifPlayback', () => {
  assert.deepEqual(
    detectarMedia({ videoMessage: { gifPlayback: true, mimetype: 'video/mp4' } }),
    { tipo: 'gif' }
  );
});

test('mantiene las imágenes normales como stickers estáticos', () => {
  assert.deepEqual(
    detectarMedia({ imageMessage: { mimetype: 'image/jpeg' } }),
    { tipo: 'image' }
  );
});

test('no trata videos normales como GIFs', () => {
  assert.deepEqual(
    detectarMedia({ videoMessage: { gifPlayback: false, mimetype: 'video/mp4' } }),
    { tipo: 'unsupported' }
  );
});
