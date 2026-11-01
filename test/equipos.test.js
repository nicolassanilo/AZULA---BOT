import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('Teams, perfiles, tiendas y misiones funcionan sobre SQLite y migran tablas heredadas', async (t) => {
  const directorioOriginal = process.cwd();
  const directorioTemporal = await mkdtemp(path.join(tmpdir(), 'azula-equipos-'));
  let base;
  try {
    process.chdir(directorioTemporal);
    let dbModule;
    try {
      dbModule = await import(pathToFileURL(path.join(directorioOriginal, 'db.js')).href);
    } catch (error) {
      if (error?.code === 'ERR_DLOPEN_FAILED') {
        t.skip('El binario nativo de sqlite3 no es compatible con este Node.js.');
        return;
      }
      throw error;
    }
    const { db, getDB } = dbModule;
    base = await getDB();
    await db.run(`CREATE TABLE teams (
      id INTEGER PRIMARY KEY,
      grupo_id TEXT,
      propietario_id TEXT,
      nombre_con_emoji TEXT,
      creado_en TEXT,
      nombre TEXT,
      estado TEXT
    )`);
    await db.run(
      `INSERT INTO teams (id, grupo_id, propietario_id, nombre_con_emoji, nombre, estado)
       VALUES (17, ?, ?, ?, ?, 'activo')`,
      ['grupo@g.us', 'admin@s.whatsapp.net', 'Legacy ⚡', 'Legacy ⚡']
    );
    await db.run(`CREATE TABLE tiendas (
      id INTEGER PRIMARY KEY,
      id_team INTEGER,
      grupo_id TEXT,
      nombre_con_emoji TEXT,
      estado TEXT
    )`);
    await db.run(
      `INSERT INTO tiendas (id, id_team, grupo_id, nombre_con_emoji, estado)
       VALUES (9, 17, ?, 'Tienda heredada', 'activo')`,
      ['grupo@g.us']
    );
    await db.run(`CREATE TABLE puntos (
      id INTEGER PRIMARY KEY,
      id_team INTEGER,
      grupo_id TEXT,
      usuario_id TEXT,
      cantidad INTEGER,
      motivo TEXT
    )`);
    await db.run(
      `INSERT INTO puntos (id, id_team, grupo_id, usuario_id, cantidad, motivo)
       VALUES (4, 17, ?, 'admin@s.whatsapp.net', 200, 'Puntos heredados')`,
      ['grupo@g.us']
    );

    const [{ default: plugin }, { default: perfilPlugin }] = await Promise.all([
      import(pathToFileURL(path.join(directorioOriginal, 'src', 'plugins', 'equipos.js')).href),
      import(pathToFileURL(path.join(directorioOriginal, 'src', 'plugins', 'perfil.js')).href)
    ]);

    const respuestas = [];
    const sock = {
      groupMetadata: async () => ({
        participants: [{ id: 'admin@s.whatsapp.net', admin: 'admin' }]
      }),
      sendMessage: async (_grupo, mensaje) => respuestas.push(mensaje.text)
    };
    const mensaje = (texto, usuario = 'admin@s.whatsapp.net') => ({
      key: { remoteJid: 'grupo@g.us', participant: usuario },
      message: { conversation: texto },
      pushName: 'Admin'
    });

    await plugin.run(sock, mensaje('/equipos crear Team Alfa ⚔️'), { command: '/equipos' });
    const team = await db.get(
      'SELECT id FROM equipos WHERE grupo_id = ? AND nombre_con_emoji = ?',
      ['grupo@g.us', 'Team Alfa ⚔️']
    );
    assert.ok(team);

    await plugin.run(sock, mensaje('/equipos crear Team Alfa ⚔️'), { command: '/equipos' });
    assert.match(respuestas.at(-1), /Ya existe un Team/);

    await perfilPlugin.run(sock, mensaje('/crearperfil'), { command: '/crearperfil' });
    assert.match(respuestas.at(-1), /Legacy ⚡/);
    await perfilPlugin.run(sock, mensaje(`/crearperfil ${team.id}`, 'miembro@s.whatsapp.net'), { command: '/crearperfil' });
    assert.match(respuestas.at(-1), /Perfil creado/);

    await plugin.run(
      sock,
      mensaje(`/tiendas agregar ${team.id} Mercado Pociones, Espadas`),
      { command: '/tiendas' }
    );
    await plugin.run(sock, mensaje(`/tiendas ver ${team.id}`), { command: '/tiendas' });
    assert.match(respuestas.at(-1), /Pociones/);
    assert.match(respuestas.at(-1), /Espadas/);

    await plugin.run(
      sock,
      mensaje(`/misiones agregar ${team.id} diaria Completa una tarea 75`),
      { command: '/misiones' }
    );
    const mision = await db.get('SELECT id FROM misiones WHERE team_id = ?', [team.id]);
    assert.ok(mision);
    await plugin.run(
      sock,
      mensaje(`/misiones completar ${mision.id}`, 'miembro@s.whatsapp.net'),
      { command: '/misiones' }
    );
    const perfil = await db.get(
      'SELECT puntos_totales FROM perfiles WHERE id_usuario = ?',
      ['miembro@s.whatsapp.net']
    );
    assert.equal(perfil.puntos_totales, 75);

    await plugin.run(sock, mensaje(`/puntos agregar ${team.id} 25 premio`), { command: '/puntos' });
    await plugin.run(sock, mensaje(`/puntos ver ${team.id}`), { command: '/puntos' });
    assert.match(respuestas.at(-1), /100 pts/);
    await plugin.run(sock, mensaje('/puntos ver 17'), { command: '/puntos' });
    assert.match(respuestas.at(-1), /200 pts/);

    await plugin.run(
      sock,
      mensaje(`/dinamicas activar ${team.id} equipo_sueno`),
      { command: '/dinamicas' }
    );
    await plugin.run(sock, mensaje(`/dinamicas lista ${team.id}`), { command: '/dinamicas' });
    assert.match(respuestas.at(-1), /equipo_sueno/);

    await plugin.run(sock, mensaje(`/equipos eliminar ${team.id}`), { command: '/equipos' });
    assert.match(respuestas.at(-1), /todavía tiene 1 miembro/);
    const violaciones = await db.all('PRAGMA foreign_key_check');
    assert.deepEqual(violaciones, []);

    await (await getDB()).close();
    base = null;
  } finally {
    if (base) await base.close();
    process.chdir(directorioOriginal);
    await rm(directorioTemporal, { recursive: true, force: true });
  }
});
