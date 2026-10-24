import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export async function ensureDataDir(dirPath) {
  const resolved = path.resolve(dirPath);
  try {
    await fs.mkdir(resolved, { recursive: true });
    return resolved;
  } catch (error) {
    console.warn(`⚠️ No se pudo asegurar la carpeta ${resolved}:`, error.message || error);
    return resolved;
  }
}

export async function readFileSafe(filePath, fallback = '') {
  try {
    await ensureDataDir(path.dirname(filePath));
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    return fallback;
  }
}

export async function writeFileSafe(filePath, content) {
  try {
    await ensureDataDir(path.dirname(filePath));
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, content, 'utf8');
    await fs.rename(tempPath, filePath);
    return true;
  } catch (error) {
    try {
      await ensureDataDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
      return true;
    } catch (fallbackError) {
      console.warn(`⚠️ No se pudo guardar ${filePath}:`, fallbackError.message || fallbackError);
      return false;
    }
  }
}

export async function readJsonFileSafe(filePath, fallback = {}) {
  try {
    const content = await readFileSafe(filePath, '');
    if (!content || !String(content).trim()) {
      await writeJsonFileSafe(filePath, fallback);
      return fallback;
    }

    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }

    return fallback;
  } catch (error) {
    await writeJsonFileSafe(filePath, fallback);
    return fallback;
  }
}

export async function writeJsonFileSafe(filePath, data) {
  return writeFileSafe(filePath, JSON.stringify(data, null, 2));
}

export function ensureDirectorySync(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}
