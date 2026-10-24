import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  readJsonFileSafe,
  writeJsonFileSafe,
  ensureDataDir
} from '../src/comunidad/archivos-seguros.js';

test('readJsonFileSafe devuelve valor por defecto si el JSON está corrupto', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'azula-bor-'));
  const file = path.join(dir, 'broken.json');

  await writeFile(file, '{bad json', 'utf8');

  const result = await readJsonFileSafe(file, { ok: true });
  assert.deepEqual(result, { ok: true });

  await rm(dir, { recursive: true, force: true });
});

test('writeJsonFileSafe guarda el contenido sin romper el archivo si faltan directorios', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'azula-bor-'));
  const file = path.join(dir, 'nested', 'state.json');

  await ensureDataDir(path.join(dir, 'nested'));
  const ok = await writeJsonFileSafe(file, { guardado: true });

  assert.equal(ok, true);
  const result = await readJsonFileSafe(file, {});
  assert.deepEqual(result, { guardado: true });

  await rm(dir, { recursive: true, force: true });
});
