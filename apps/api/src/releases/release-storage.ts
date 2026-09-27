import { stat } from 'node:fs/promises';
import { isAbsolute, resolve, sep } from 'node:path';

/** Un chemin de stockage sain : segments de lettres, chiffres, `.`, `_`, `-`, jamais `..` ni absolu. */
const SAFE_STORAGE_PATH = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;

/**
 * Chemin réel d'un fichier publié, ou `null` s'il sortirait du dossier des fichiers.
 * Le chemin vient de la base : même si elle était modifiée, on ne lit jamais hors de `baseDir`.
 */
export function resolveReleasePath(baseDir: string, storagePath: string): string | null {
  if (isAbsolute(storagePath) || !SAFE_STORAGE_PATH.test(storagePath)) return null;
  if (storagePath.split('/').some((segment) => segment === '.' || segment === '..')) return null;
  const base = resolve(baseDir);
  const target = resolve(base, storagePath);
  return target.startsWith(base + sep) ? target : null;
}

export async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}
