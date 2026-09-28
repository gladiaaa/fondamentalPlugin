import { Injectable, NotFoundException } from '@nestjs/common';
import type { AdminReleaseResponse } from '@fondamental/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminActionLogService } from './admin-action-log.service.js';
import { MESSAGES } from './admin.constants.js';
import type { UpdateReleaseDto } from './admin-release-list.dto.js';

const WITH_FILES = {
  product: true,
  files: {
    include: { minecraftVersions: true },
    orderBy: [{ edition: 'asc' }, { fileName: 'asc' }] as Prisma.ReleaseFileOrderByWithRelationInput[],
  },
} as const;

type ReleaseWithFiles = {
  id: string;
  version: string;
  channel: AdminReleaseResponse['channel'];
  changelog: string;
  releasedAt: Date;
  hiddenAt: Date | null;
  product: { slug: string };
  files: Array<{
    id: string;
    fileName: string;
    edition: AdminReleaseResponse['files'][number]['edition'];
    sizeBytes: number;
    sha256: string;
    downloadCount: number;
    minecraftVersions: Array<{ version: string; sortOrder: number }>;
  }>;
};

function toResponse(release: ReleaseWithFiles): AdminReleaseResponse {
  return {
    id: release.id,
    productSlug: release.product.slug,
    version: release.version,
    channel: release.channel,
    changelog: release.changelog,
    releasedAt: release.releasedAt.toISOString(),
    hiddenAt: release.hiddenAt?.toISOString() ?? null,
    files: release.files.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      edition: file.edition,
      sizeBytes: file.sizeBytes,
      sha256: file.sha256,
      downloadCount: file.downloadCount,
      minecraftVersions: [...file.minecraftVersions].sort((a, b) => b.sortOrder - a.sortOrder).map((v) => v.version),
    })),
  };
}

@Injectable()
export class AdminReleaseListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AdminActionLogService,
  ) {}

  /** Versions publiées, masquées comprises, de la plus récente à la plus ancienne. */
  async list(productSlug?: string): Promise<AdminReleaseResponse[]> {
    const releases = await this.prisma.release.findMany({
      where: productSlug ? { product: { slug: productSlug } } : undefined,
      include: WITH_FILES,
      orderBy: { releasedAt: 'desc' },
      take: 200,
    });
    return releases.map(toResponse);
  }

  /** Masquer, changer de canal ou corriger le changelog. Les fichiers eux-mêmes ne sont jamais modifiés. */
  async update(adminId: string, id: string, patch: UpdateReleaseDto): Promise<AdminReleaseResponse> {
    const before = await this.prisma.release.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'RELEASE_NOT_FOUND', message: MESSAGES.releaseNotFound });

    const data: { hiddenAt?: Date | null; channel?: 'RELEASE' | 'BETA'; changelog?: string } = {};
    if (patch.hidden !== undefined && patch.hidden !== Boolean(before.hiddenAt)) {
      data.hiddenAt = patch.hidden ? new Date() : null;
    }
    if (patch.channel !== undefined) data.channel = patch.channel;
    if (patch.changelog !== undefined) data.changelog = patch.changelog;

    const after = await this.prisma.release.update({ where: { id }, data, include: WITH_FILES });
    await this.auditLog.log(adminId, 'release.update', 'release', id, {
      version: before.version,
      before: { hidden: Boolean(before.hiddenAt), channel: before.channel },
      after: { hidden: patch.hidden, channel: patch.channel, changelog: patch.changelog !== undefined },
    });
    return toResponse(after);
  }
}
