import type { ReleaseFileResponse } from '@fondamental/shared';
import type { MinecraftVersion, Release, ReleaseFile } from '../generated/prisma/client.js';

export type ReleaseFileWithRelations = ReleaseFile & { release: Release; minecraftVersions: MinecraftVersion[] };

/**
 * Ce que le site voit d'un fichier. Le chemin de stockage n'en fait pas partie :
 * seul `downloadUrl` permet de récupérer le fichier.
 */
export function toReleaseFileResponse(file: ReleaseFileWithRelations): ReleaseFileResponse {
  return {
    id: file.id,
    edition: file.edition,
    platform: file.platform,
    fileName: file.fileName,
    sizeBytes: file.sizeBytes,
    sha256: file.sha256,
    minecraftVersions: [...file.minecraftVersions].sort((a, b) => b.sortOrder - a.sortOrder).map((v) => v.version),
    downloadCount: file.downloadCount,
    downloadUrl: `/api/downloads/${file.id}`,
    release: {
      version: file.release.version,
      channel: file.release.channel,
      changelog: file.release.changelog,
      releasedAt: file.release.releasedAt.toISOString(),
    },
  };
}
