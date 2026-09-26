const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
/** Le commentaire de fin d'archive fait au plus 65 535 octets : l'enregistrement de fin est dans les derniers 65 557. */
const MAX_END_SEARCH = 22 + 0xffff;

/**
 * Noms des fichiers d'une archive zip (un jar en est une), lus dans son répertoire central
 * **sans rien décompresser** : pas de risque de « bombe » zip. `null` si ce n'est pas un zip lisible.
 */
export function listZipEntries(buffer: Buffer): string[] | null {
  if (buffer.length < 22) return null;

  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - MAX_END_SEARCH); i -= 1) {
    if (buffer.readUInt32LE(i) === END_OF_CENTRAL_DIRECTORY) {
      end = i;
      break;
    }
  }
  if (end === -1) return null;

  const entryCount = buffer.readUInt16LE(end + 10);
  const directorySize = buffer.readUInt32LE(end + 12);
  const directoryOffset = buffer.readUInt32LE(end + 16);
  // Zip64 (valeurs saturées) : jamais le cas d'un plugin, refusé plutôt que mal lu.
  if (entryCount === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) return null;
  if (directoryOffset + directorySize > end) return null;

  const names: string[] = [];
  let position = directoryOffset;
  for (let i = 0; i < entryCount; i += 1) {
    if (position + 46 > buffer.length || buffer.readUInt32LE(position) !== CENTRAL_DIRECTORY_ENTRY) return null;
    const nameLength = buffer.readUInt16LE(position + 28);
    const extraLength = buffer.readUInt16LE(position + 30);
    const commentLength = buffer.readUInt16LE(position + 32);
    const nameEnd = position + 46 + nameLength;
    if (nameEnd > buffer.length) return null;
    names.push(buffer.toString('utf8', position + 46, nameEnd));
    position = nameEnd + extraLength + commentLength;
  }
  return names;
}

/** Un plugin Paper / Bukkit : un jar qui contient son descripteur à la racine. */
export function isPluginJar(buffer: Buffer): boolean {
  const names = listZipEntries(buffer);
  return names !== null && names.some((name) => name === 'plugin.yml' || name === 'paper-plugin.yml');
}
