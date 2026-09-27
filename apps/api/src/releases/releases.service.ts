import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ReleaseFileWithRelations } from './releases.mapper.js';

const WITH_RELATIONS = { release: true, minecraftVersions: true } as const;

@Injectable()
export class ReleasesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Vérifie qu'un plugin est en vente ; 404 sinon (les fichiers d'un plugin retiré ne sont plus proposés). */
  private async requireActiveProduct(slug: string): Promise<{ id: string }> {
    const product = await this.prisma.product.findFirst({ where: { slug, active: true }, select: { id: true } });
    if (!product) throw new NotFoundException('Plugin introuvable.');
    return product;
  }

  /** Versions de Minecraft pour lesquelles le plugin a au moins un fichier, de la plus récente à la plus ancienne. */
  async minecraftVersions(slug: string): Promise<string[]> {
    const product = await this.requireActiveProduct(slug);
    const versions = await this.prisma.minecraftVersion.findMany({
      where: { files: { some: { release: { productId: product.id } } } },
      orderBy: { sortOrder: 'desc' },
    });
    return versions.map((v) => v.version);
  }

  /** Fichiers d'un plugin, du plus récent au plus ancien, filtrés par version de Minecraft si elle est donnée. */
  async files(slug: string, minecraft?: string): Promise<ReleaseFileWithRelations[]> {
    const product = await this.requireActiveProduct(slug);
    return this.prisma.releaseFile.findMany({
      where: {
        release: { productId: product.id },
        ...(minecraft ? { minecraftVersions: { some: { version: minecraft } } } : {}),
      },
      include: WITH_RELATIONS,
      orderBy: [{ release: { releasedAt: 'desc' } }, { edition: 'asc' }, { fileName: 'asc' }],
    });
  }

  /** Un fichier à télécharger ; 404 s'il n'existe pas ou si son plugin n'est plus en vente. */
  async fileForDownload(id: string) {
    const file = await this.prisma.releaseFile.findFirst({
      where: { id, release: { product: { active: true } } },
    });
    if (!file) throw new NotFoundException('Fichier introuvable.');
    return file;
  }

  /** Compte un téléchargement (incrément atomique : pas de perte si plusieurs arrivent ensemble). */
  async countDownload(id: string): Promise<void> {
    await this.prisma.releaseFile.update({ where: { id }, data: { downloadCount: { increment: 1 } } });
  }
}
