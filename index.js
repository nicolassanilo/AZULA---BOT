/**
 * @file Archivo principal del Bot de WhatsApp HINATA.
 * @description Este archivo maneja la conexión con WhatsApp, carga los plugins de comandos
 * y procesa los mensajes entrantes.
 * @version 2.0.0
 */

// ----------------------------------------
//          IMPORTS Y CONFIGURACIÓN
// ----------------------------------------
import {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
let qrcodeImg;
try {
    qrcodeImg = await import('qrcode');
} catch (e) {
    console.log('⚠️ Módulo qrcode no disponible, QR solo en terminal');
    qrcodeImg = null;
}
import path from 'path';
import fs from 'fs/promises';
import { Boom } from '@hapi/boom';
import express from 'express';
import { initDB, db } from './db.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { readJsonFileSafe, writeJsonFileSafe } from './src/comunidad/archivos-seguros.js';
import { activarBienvenida } from './src/comunidad/bienvenida.js';
import { activarMisiones } from './src/comunidad/misiones.js';
import { activarPerfiles } from './src/comunidad/sistema/perfiles.js';
import { activarRanking } from './src/comunidad/sistema/ranking.js';
import { activarTiendas } from './src/comunidad/tiendas/index.js';
import { activarMenu } from './src/comunidad/menu.js';

process.on('uncaughtException', (error) => {
    console.warn('⚠️ Error capturado sin detener el bot:', error?.message || error);
});

process.on('unhandledRejection', (reason) => {
    console.warn('⚠️ Promesa fallida capturada:', reason?.message || reason);
});

// Importar configuración global
import './config_nagiv3.js';

// Importa makeWASocket como default
import makeWASocket from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Almacén global para los comandos cargados
export let plugins = new Map();
export let regexPlugins = [];
// Almacén global para la configuración
export let config = {};

export function getConfig() {
    return config;
}

export async function refreshConfig() {
    config = await obtenerConfig();
    return config;
}

export async function reloadPlugins() {
    const latestConfig = await refreshConfig().catch((error) => {
        console.error('⚠️ No se pudo recargar la configuración, usando la configuración actual:', error);
        return config;
    });

    const result = await cargarPlugins();
    return {
        config: latestConfig,
        ...result
    };
}

// Almacén global para el QR actual
let currentQR = null;
let socketInstance = null;
let reconnectTimer = null;
let connectLock = false;
let reconnectCount = 0;

const safeSetTimeout = (fn, delay) => {
    return setTimeout(() => {
        try {
            fn();
        } catch (error) {
            console.warn('⚠️ Error en timeout del bot:', error?.message || error);
        }
    }, delay);
};

function scheduleReconnect(reason = 'desconexión') {
    if (connectLock || reconnectTimer) return;

    reconnectCount += 1;
    reconnectTimer = safeSetTimeout(async () => {
        reconnectTimer = null;
        console.log(`⚠️ Reconectando... (${reason})`);
        try {
            await connectToWhatsApp();
        } catch (error) {
            console.warn('⚠️ Falló la reconexión automática:', error?.message || error);
            scheduleReconnect('retry');
        }
    }, 10000);
}

// Cooldown maps for rate-limiting
// key: `${command}:${userId}` -> timestamp (ms)
const cooldownsMap = new Map();
// key: chatId -> array of timestamps (ms) of recent commands
const groupUsageMap = new Map();

// ----------------------------------------
//          FUNCIONES AUXILIARES
// ----------------------------------------

/**
 * Carga la configuración desde config.json.
 * Es buena práctica mover esta función a un archivo en una carpeta 'lib'.
 */
async function obtenerConfig() {
    try {
        const defaultConfig = {
            authMethod: 'qr',
            cooldowns: { perUser: 5, groupBurstLimit: 25, groupBurstSeconds: 60 }
        };
        const data = await readJsonFileSafe('config/config.json', defaultConfig);
        if (!data || typeof data !== 'object') {
            return defaultConfig;
        }
        return data;
    } catch (error) {
        console.warn('⚠️ Usando configuración por defecto porque config/config.json no es válido:', error?.message || error);
        return {
            authMethod: 'qr',
            cooldowns: { perUser: 5, groupBurstLimit: 25, groupBurstSeconds: 60 }
        };
    }
}

/**
 * Carga dinámicamente todos los comandos desde la carpeta 'plugins'.
 */
async function collectPluginFiles(directory, collected = []) {
    try {
        const entries = await fs.readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                await collectPluginFiles(fullPath, collected);
                continue;
            }

            if (entry.isFile() && entry.name.endsWith('.js') && entry.name !== 'db.js' && !entry.name.startsWith('_')) {
                collected.push(fullPath);
            }
        }
    } catch (error) {
        // Ignorar directorios que no existan y seguir con los que sí existan.
    }

    return collected;
}

export async function cargarPlugins() {
    const newPlugins = new Map();
    const newRegexPlugins = [];
    const errors = [];

    const pluginRoots = [
        path.join(__dirname, 'plugins'),
        path.join(__dirname, 'Plugins'),
        path.join(__dirname, 'src', 'plugins'),
        path.join(__dirname, 'comunidad')
    ];

    try {
        const discoveredPluginFiles = (await Promise.all(
            pluginRoots.map(root => collectPluginFiles(root, []))
        )).flat();
        const canonicalFiles = await Promise.all(discoveredPluginFiles.map(async (file) => {
            try {
                return [await fs.realpath(file), file];
            } catch (error) {
                console.warn(`⚠️ No se pudo normalizar la ruta del plugin "${file}":`, error?.message || error);
                return [path.resolve(file), file];
            }
        }));
        const pluginFiles = [...new Map(canonicalFiles).values()];

        console.log('🔌 Cargando plugins...');
        for (const pluginFilePath of pluginFiles) {
            try {
                const file = path.basename(pluginFilePath);
                const pluginPath = `${pathToFileURL(pluginFilePath).href}?v=${Date.now()}`;
                const imported = await import(pluginPath);
                const pluginDefinition = imported.default || imported;
                const pluginName = pluginDefinition.nombre || file;
                if (pluginDefinition.activo === false) {
                    console.log(`⏸️ Plugin inactivo: ${pluginName}`);
                    continue;
                }

                const commands = pluginDefinition.command || pluginDefinition.commands || pluginDefinition.comandos ||
                    imported.command || imported.commands || imported.comandos;
                const aliases = pluginDefinition.alias || pluginDefinition.aliases || imported.alias || imported.aliases;

                if (!commands) {
                    console.log(`⚠️ Plugin omitido: "${file}" no exporta comandos compatibles.`);
                    continue;
                }

                const pluginObj = typeof pluginDefinition === 'function'
                    ? { ...pluginDefinition, run: pluginDefinition, command: pluginDefinition.command }
                    : { ...pluginDefinition, run: pluginDefinition.run || pluginDefinition.ejecutar || pluginDefinition };

                if (typeof pluginObj.run !== 'function') {
                    console.log(`⚠️ Plugin omitido: "${file}" no tiene una función run o ejecutar válida.`);
                    continue;
                }

                if (typeof pluginObj.inicializar === 'function') {
                    await pluginObj.inicializar();
                }

                const commandList = [
                  ...(Array.isArray(commands) ? commands : [commands]),
                  ...(aliases ? (Array.isArray(aliases) ? aliases : [aliases]) : [])
                ];
                let registeredCommands = 0;

                for (const cmd of commandList) {
                    if (cmd instanceof RegExp) {
                        newRegexPlugins.push({ pattern: cmd, plugin: pluginObj, file });
                        registeredCommands += 1;
                        continue;
                    }

                    if (typeof cmd !== 'string') {
                        console.log(`⚠️ Comando ignorado en "${file}": tipo de comando no soportado.`);
                        continue;
                    }

                    const commandKey = cmd.startsWith('.') || cmd.startsWith('/') || cmd.startsWith('!') ? cmd : `.${cmd}`;
                    if (newPlugins.has(commandKey)) {
                        console.warn(`⚠️ ¡Comando duplicado! "${cmd}" en "${file}" será omitido.`);
                        continue;
                    }

                    newPlugins.set(commandKey, pluginObj);
                    registeredCommands += 1;
                }

                if (registeredCommands > 0) {
                    console.log(`✅ Plugin cargado: ${pluginName}`);
                } else {
                    console.warn(`⚠️ Plugin omitido: "${pluginName}" no registró ningún comando.`);
                }
            } catch (err) {
                console.error(`❌ Error al cargar el plugin "${pluginFilePath}":`, err);
                errors.push({ file: path.basename(pluginFilePath), error: err.message });
            }
        }

        plugins = newPlugins;
        regexPlugins = newRegexPlugins;
        console.log(`✅ ${plugins.size} comandos cargados, ${regexPlugins.length} patrones regex registrados.`);
        return { plugins, regexPlugins, errors };
    } catch (error) {
        console.error('❌ No se pudo leer el directorio de plugins. Asegúrate de que la carpeta "plugins" existe.', error);
        return { plugins: new Map(), regexPlugins: [], errors: [{ file: 'directorio de plugins', error: error.message }] };
    }
}

// ----------------------------------------
//          CONEXIÓN A WHATSAPP
// ----------------------------------------

async function connectToWhatsApp() {
    if (connectLock) {
        return socketInstance;
    }

    connectLock = true;

    try {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;

        try {
            await initDB();
        } catch (dbError) {
            console.warn('⚠️ Base de datos no disponible, continuando con el bot:', dbError?.message || dbError);
        }

        try {
            config = await obtenerConfig();
        } catch (configError) {
            config = { authMethod: 'qr', cooldowns: { perUser: 5, groupBurstLimit: 25, groupBurstSeconds: 60 } };
            console.warn('⚠️ Configuración por defecto aplicada:', configError?.message || configError);
        }

        try {
            ({ plugins, regexPlugins } = await cargarPlugins());
        } catch (pluginError) {
            console.warn('⚠️ Cargando plugins vacíos por error del sistema:', pluginError?.message || pluginError);
            plugins = new Map();
            regexPlugins = [];
        }

        if (socketInstance && typeof socketInstance.ws?.close === 'function') {
            try {
                socketInstance.ws.close();
            } catch (error) {
                console.warn('⚠️ Error cerrando socket previo:', error?.message || error);
            }
        }

        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`✅ Bot iniciado correctamente`);
        console.log(`🤖 Usando WhatsApp v${version.join('.')} (isLatest: ${isLatest})`);

        if (config.authMethod === 'qr') {
            console.log('🔑 Método de autenticación: QR Code');
        } else if (config.authMethod === 'phone') {
            console.log('📱 Método de autenticación: Número de teléfono');
        } else {
            console.log('⚠️ Método de autenticación desconocido, usando QR por defecto');
            config.authMethod = 'qr';
        }

        const phoneNumber = String(config.phoneNumber || '').replace(/\D/g, '');
        if (config.authMethod === 'phone' && !/^549\d{8,10}$/.test(phoneNumber)) {
            console.error('❌ Número de emparejamiento inválido. En config/config.json, configura phoneNumber con el formato argentino 549 + número, solo dígitos (sin +, espacios ni @lid).');
            return null;
        }

        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
            },
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            shouldIgnoreJid: (jid) => jid.includes('@broadcast'),
            getMessage: async () => ({ conversation: 'hello' })
        });

        socketInstance = sock;

        activarBienvenida(sock);
        activarMisiones(sock);
        activarRanking(sock);
        activarPerfiles(sock);
        activarMenu(sock, () => plugins);
        activarTiendas(sock);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;

            if (update.qr && config.authMethod === 'qr') {
                try {
                    qrcode.generate(update.qr, { small: true });
                    console.log('🔑 Escanea el QR mostrado en la terminal para iniciar sesión.');
                    if (qrcodeImg && qrcodeImg.default && qrcodeImg.default.toDataURL) {
                        qrcodeImg.default.toDataURL(update.qr, { width: 300, margin: 2 }, (err, url) => {
                            if (!err) {
                                currentQR = url;
                                console.log('🌐 QR generado correctamente para web');
                                console.log('🌐 QR también disponible en http://localhost:3000/qr');
                            } else {
                                currentQR = null;
                            }
                        });
                    }
                } catch (err) {
                    currentQR = null;
                    console.warn('⚠️ QR no disponible:', err?.message || err);
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log(`⚠️ Conexión cerrada. Estado: ${statusCode ?? 'desconocido'} | reconectar: ${shouldReconnect}`);

                if (shouldReconnect) {
                    scheduleReconnect('close');
                }
            } else if (connection === 'open') {
                reconnectCount = 0;
                console.log('✅ Conectado a WhatsApp');
                if (config.authMethod === 'phone') {
                    console.log('✅ Sesión vinculada y conexión lista.');
                }
                if (currentQR) {
                    currentQR = null;
                }
            }
        });

        let credencialesGuardadas = false;
        sock.ev.on('creds.update', async () => {
            try {
                await saveCreds();
                if (!credencialesGuardadas) {
                    console.log('✅ Credenciales de WhatsApp guardadas.');
                    credencialesGuardadas = true;
                }
            } catch (error) {
                console.error('❌ No se pudieron guardar las credenciales de WhatsApp:', error?.message || error);
            }
        });
        console.log('🔐 Esperando actualizaciones de credenciales de WhatsApp.');

        sock.ev.on('messages.upsert', async (m) => {
            if (m.type !== 'notify' || !m.messages?.[0]?.key) return;

            const msg = m.messages[0];
            if (msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') return;

            const chatId = msg.key.remoteJid;
            const userId = msg.key.participant || msg.key.remoteJid;

            if (chatId?.endsWith('@g.us')) {
                try {
                    await db.run(
                        'INSERT INTO group_activity (chatId, userId, lastSeen) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(chatId, userId) DO UPDATE SET lastSeen = CURRENT_TIMESTAMP',
                        [chatId, userId]
                    );
                } catch (dbErr) {
                    console.warn('⚠️ Actividad de grupo no guardada:', dbErr?.message || dbErr);
                }
            }

            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const prefix = '/';

            if (!text.startsWith(prefix)) {
                const contenido = text.trim();
                try {
                    if (/^\d+$/.test(contenido)) {
                        if (/^[1-4]$/.test(contenido)) {
                            const triviaPlugin = plugins.get('/trivia') || plugins.get('.trivia');
                            if (triviaPlugin && triviaPlugin.procesarMensajeTrivia) {
                                await triviaPlugin.procesarMensajeTrivia(sock, msg);
                                return;
                            }
                        }

                        const adivinaPlugin = plugins.get('/adivina') || plugins.get('.adivina');
                        if (adivinaPlugin && adivinaPlugin.procesarMensajeNumero) {
                            await adivinaPlugin.procesarMensajeNumero(sock, msg);
                            return;
                        }
                    }

                    if (contenido.length === 1 && /\p{L}/u.test(contenido)) {
                        const ahorcadoPlugin = plugins.get('/ahorcado') || plugins.get('.ahorcado');
                        if (ahorcadoPlugin && ahorcadoPlugin.procesarMensajeAhorcado) {
                            await ahorcadoPlugin.procesarMensajeAhorcado(sock, msg);
                            return;
                        }
                    }
                } catch (err) {
                    console.warn('⚠️ Error procesando mensaje de juego:', err?.message || err);
                }
                return;
            }

            if (!text.startsWith(prefix)) return;

            const senderId = msg.key.remoteJid;
            const args = text.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift()?.toLowerCase() || '';
            const command = prefix + commandName;

            let plugin = plugins.get(command);
            if (!plugin && regexPlugins.length) {
                const matched = regexPlugins.find(({ pattern }) => pattern.test(commandName));
                if (matched) plugin = matched.plugin;
            }

            if (!plugin) return;

            try {
                const now = Date.now();
                let runtimeConfig = config;
                try {
                    runtimeConfig = await refreshConfig();
                } catch (e) {
                    runtimeConfig = config || {};
                }

                const perUserSec = runtimeConfig?.cooldowns?.perUser || 5;
                const groupBurstLimit = runtimeConfig?.cooldowns?.groupBurstLimit || 25;
                const groupBurstSeconds = runtimeConfig?.cooldowns?.groupBurstSeconds || 60;
                const ownerId = (runtimeConfig?.ownerJid && String(runtimeConfig.ownerJid).trim()) || (runtimeConfig?.propietario && String(runtimeConfig.propietario).trim()) || (runtimeConfig?.phoneNumber && String(runtimeConfig.phoneNumber).trim()) || '';

                let isOwner = false;
                if (ownerId) {
                    try {
                        const normalizeNumber = (num) => String(num || '').replace(/[^0-9+]/g, '').replace(/^00/, '+');
                        const normalizedOwnerId = normalizeNumber(ownerId);
                        const normalizedUserId = normalizeNumber(userId);
                        if (normalizedOwnerId.includes(normalizedUserId) || normalizedUserId.includes(normalizedOwnerId.replace('@s.whatsapp.net', ''))) {
                            isOwner = true;
                        } else if (ownerId.includes('@')) {
                            isOwner = userId === ownerId;
                        } else {
                            isOwner = userId === ownerId || userId.includes(ownerId) || userId.startsWith(ownerId);
                        }
                    } catch (e) {
                        isOwner = false;
                    }
                }

                if (isOwner) {
                    console.log(`🔓 Usuario propietario detectado (${userId}), saltando cooldowns para ${command}`);
                    await plugin.run(sock, msg, { text: args.join(' '), command, args, plugins });
                    return;
                }

                const cmdKey = `${command}:${userId}`;
                const lastUsed = cooldownsMap.get(cmdKey) || 0;
                const waitMs = perUserSec * 1000 - (now - lastUsed);
                if (lastUsed && waitMs > 0) {
                    const waitSec = Math.ceil(waitMs / 1000);
                    await sock.sendMessage(chatId, { text: `⌛ Por favor espera ${waitSec}s antes de usar el comando ${command} nuevamente.` }, { quoted: msg });
                    return;
                }

                const windowStart = now - (groupBurstSeconds * 1000);
                let timestamps = groupUsageMap.get(chatId) || [];
                timestamps = timestamps.filter((t) => t >= windowStart);
                if (timestamps.length >= groupBurstLimit) {
                    await sock.sendMessage(chatId, { text: '⚠️ Demasiados comandos en este grupo. Por favor espera unos segundos antes de usar más comandos.' }, { quoted: msg });
                    groupUsageMap.set(chatId, timestamps);
                    return;
                }

                timestamps.push(now);
                groupUsageMap.set(chatId, timestamps);
                cooldownsMap.set(cmdKey, now);

                console.log(`💬 Comando: ${command} | Argumentos: [${args.join(', ')}] | De: ${senderId}`);
                await plugin.run(sock, msg, { text: args.join(' '), command, args, plugins });
            } catch (err) {
                console.warn(`⚠️ Error ejecutando el comando "${command}":`, err?.message || err);
                await sock.sendMessage(msg.key.remoteJid, { text: '⚠️ Ocurrió un error inesperado al ejecutar ese comando.' }, { quoted: msg });
            }
        });

        if (config.authMethod === 'phone' && !state.creds.registered) {
            // Request pairing only after connection and credential listeners are attached.
            console.log(`📱 Solicitando código de emparejamiento para el número terminado en ${phoneNumber.slice(-4)}...`);
            void (async () => {
                try {
                    await new Promise((resolve) => setTimeout(resolve, 3000));
                    const code = await sock.requestPairingCode(phoneNumber);
                    console.log(`🔗 Código de vinculación: ${code}`);
                    console.log('📲 En WhatsApp: Configuración → Dispositivos vinculados → Vincular con número en lugar de escanear QR.');
                } catch (error) {
                    console.error('❌ No se pudo solicitar el código de emparejamiento:', error?.message || error);
                }
            })();
        } else if (config.authMethod === 'phone') {
            console.log('🔐 Ya existe una sesión registrada; se intentará reconectar sin pedir otro código.');
        }

        console.log('✅ Comandos cargados correctamente');
        console.log('✅ Conectado a WhatsApp');
        console.log(`✅ ${plugins.size} comandos registrados`);
        return sock;
    } catch (error) {
        console.warn('⚠️ Error al iniciar el bot:', error?.message || error);
        scheduleReconnect('inicio');
        return null;
    } finally {
        connectLock = false;
    }
}

// Iniciar el bot
connectToWhatsApp().catch(err => {
    console.error("❌ Error al iniciar la conexión WhatsApp:", err);
    console.log("🔄 El servidor web seguirá ejecutándose. Reintentando conexión en 30 segundos...");
    setTimeout(() => {
        connectToWhatsApp();
    }, 30000);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot HINATA está ejecutándose - Estado: Intentando conectar a WhatsApp...<br><a href="/qr">Ver QR para vinculación</a>');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/qr-status', (req, res) => {
  res.json({
    hasQR: !!currentQR,
    qr: currentQR,
    timestamp: new Date().toISOString()
  });
});

app.get('/qr', (req, res) => {
  if (currentQR) {
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HINATA Bot - Vinculación QR</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
            background-color: #f0f0f0;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          h1 {
            color: #333;
          }
          img {
            max-width: 100%;
            height: auto;
            border: 2px solid #ddd;
            border-radius: 5px;
          }
          p {
            color: #666;
          }
          .status {
            margin-top: 20px;
            padding: 10px;
            background-color: #e8f5e8;
            border-radius: 5px;
            color: #2e7d32;
          }
          .loading {
            display: none;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔗 Vincular HINATA Bot</h1>
          <p>Escanea el código QR con WhatsApp para vincular el bot:</p>
          <img id="qr-image" src="${currentQR}" alt="QR Code para vincular el bot">
          <p>Una vez escaneado, el bot estará listo para usar.</p>
          <div class="status">
            <p>✅ QR generado correctamente</p>
            <p><small>Última actualización: ${new Date().toLocaleString()}</small></p>
          </div>
          <div class="loading" id="loading">
            <p>🔄 Generando nuevo QR...</p>
          </div>
        </div>

        <script>
          // Función para verificar si hay un nuevo QR
          function checkQR() {
            fetch('/qr-status')
              .then(response => response.json())
              .then(data => {
                if (data.hasQR && data.qr !== document.getElementById('qr-image').src) {
                  document.getElementById('loading').style.display = 'block';
                  setTimeout(() => {
                    document.getElementById('qr-image').src = data.qr;
                    document.getElementById('loading').style.display = 'none';
                  }, 1000);
                }
              })
              .catch(err => console.log('Error checking QR:', err));
          }

          // Verificar cada 5 segundos
          setInterval(checkQR, 5000);
        </script>
      </body>
      </html>
    `);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HINATA Bot - Vinculación QR</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
            background-color: #f0f0f0;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          h1 {
            color: #333;
          }
          .instructions {
            text-align: left;
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #007bff;
          }
          .instructions h3 {
            color: #007bff;
            margin-top: 0;
          }
          .terminal-code {
            background-color: #2d3748;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
            white-space: pre-wrap;
          }
          .refresh {
            margin-top: 20px;
          }
          .refresh button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
          }
          .refresh button:hover {
            background-color: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔗 Vincular HINATA Bot</h1>

          <div class="instructions">
            <h3>📱 Instrucciones para vincular el bot:</h3>
            <p>El código QR se muestra en la terminal donde está ejecutándose el bot. Sigue estos pasos:</p>
            <ol>
              <li>Abre WhatsApp en tu teléfono</li>
              <li>Ve a <strong>Dispositivos vinculados</strong> (tres puntos > Dispositivos vinculados)</li>
              <li>Toca <strong>Vincular un dispositivo</strong></li>
              <li>Escanea el código QR que aparece en la terminal</li>
            </ol>
          </div>

          <div class="terminal-code">🔑 Escanea el QR mostrado en la terminal para iniciar sesión.
[QR Code ASCII Art aparecerá aquí]</div>

          <p><em>Nota: La visualización web del QR no está disponible actualmente debido a un problema con las dependencias.</em></p>

          <div class="refresh">
            <button onclick="window.location.reload()">🔄 Recargar página</button>
          </div>
        </div>

        <script>
          // Auto-refresh cada 30 segundos
          setTimeout(() => {
            window.location.reload();
          }, 30000);
        </script>
      </body>
      </html>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor web en puerto ${PORT}`);
  console.log(`🌐 Página principal: http://localhost:${PORT}`);
  console.log(`🌐 Página QR: http://localhost:${PORT}/qr`);
  console.log(`🌐 Estado QR: http://localhost:${PORT}/qr-status`);
});