import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { Env } from '../config/env.js';
import { Prisma, type Release, type ReleaseChannel, type ReleaseEdition } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { isPluginJar } from './jar.js';
import { MINECRAFT_VERSION, minecraftSortOrder } from './minecraft-version.js';
import type { ReleaseFileWithRelations } from './releases.mapper.js';

const PRODUCT_SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;
/** Sert de nom de dossier : jamais de `/`, jamais de `..` (le premier caractère est alphanumérique). */
const RELEASE_VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const JAR_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}\.jar$/;
const MAX_MINECRAFT_VERSIONS = 30;

export interface UploadedJar {
  originalName: string;
  buffer: Buffer;
}

@Injectable()
export class ReleasePublisher {
  private readonly logger = new Logger(ReleasePublisher.name);
  private readonly baseDir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.baseDir = resolve(config.get('RELEASES_DIR', { infer: true }));
  }

  private async requireProduct(slug: string) {
    if (!PRODUCT_SLUG.test(slug)) throw new BadRequestException('Identifiant de plugin invalide.');
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product) throw new NotFoundException('Plugin introuvable.');
    return product;
  }

  private checkVersion(version: string): void {
    if (!RELEASE_VERSION.test(version)) {
      throw new BadRequestException('Version invalide : lettres, chiffres, « . », « _ » et « - » seulement (64 au plus).');
    }
  }

  /** Crée la version d'un plugin, ou met à jour son canal et son changelog : rejouable sans risque. */
  async upsertRelease(
    slug: string,
    version: string,
    input: { channel?: ReleaseChannel; changelog?: string },
  ): Promise<{ release: Release; created: boolean }> {
    const product = await this.requireProduct(slug);
    this.checkVersion(version);
    const existing = await this.prisma.release.findUnique({
      where: { productId_version: { productId: product.id, version } },
    });
    const data = {
      ...(input.channel ? { channel: input.channel } : {}),
      ...(input.changelog !== undefined ? { changelog: input.changelog } : {}),
    };
    const release = await this.prisma.release.upsert({
      where: { productId_version: { productId: product.id, version } },
      create: { productId: product.id, version, ...data },
      update: data,
    });
    return { release, created: !existing };
  }

  /** Ajoute un jar à une version existante. Empreinte et taille sont calculées ici, jamais fournies par l'appelant. */
  async addFile(
    slug: string,
    version: string,
    upload: UploadedJar,
    meta: { edition: ReleaseEdition; minecraft: string[] },
  ): Promise<ReleaseFileWithRelations> {
    const product = await this.requireProduct(slug);
    this.checkVersion(version);

    const release = await this.prisma.release.findUnique({
      where: { productId_version: { productId: product.id, version } },
    });
    if (!release) throw new NotFoundException('Version introuvable : la créer d’abord (PUT).');

    if (!JAR_FILE_NAME.test(upload.originalName)) {
      throw new BadRequestException('Nom de fichier invalide : lettres, chiffres, « . », « _ » et « - », terminé par .jar.');
    }
    this.checkEdition(product.distribution, meta.edition);
    const minecraft = this.checkMinecraftVersions(meta.minecraft);
    if (!isPluginJar(upload.buffer)) {
      throw new UnprocessableEntityException('Ce fichier n’est pas un plugin : plugin.yml introuvable à la racine du jar.');
    }

    const storagePath = `${slug}/${version}/${upload.originalName}`;
    const finalPath = join(this.baseDir, storagePath);
    const tempPath = join(dirname(finalPath), `.upload-${randomUUID()}`);

    await mkdir(dirname(finalPath), { recursive: true });
    await writeFile(tempPath, upload.buffer, { flag: 'wx' });
    try {
      const versions = await Promise.all(
        minecraft.map((name) =>
          this.prisma.minecraftVersion.upsert({
            where: { version: name },
            create: { version: name, sortOrder: minecraftSortOrder(name) },
            update: {},
          }),
        ),
      );
      const file = await this.prisma.releaseFile
        .create({
          data: {
            releaseId: release.id,
            edition: meta.edition,
            fileName: upload.originalName,
            sizeBytes: upload.buffer.length,
            sha256: createHash('sha256').update(upload.buffer).digest('hex'),
            storagePath,
            minecraftVersions: { connect: versions.map((v) => ({ id: v.id })) },
          },
          include: { release: true, minecraftVersions: true },
        })
        .catch((error: unknown) => {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ConflictException('Ce fichier existe déjà pour cette version.');
          }
          throw error;
        });
      try {
        await rename(tempPath, finalPath);
      } catch (error) {
        // Le fichier n'a pas pu être mis en place : ne pas laisser une ligne qui pointe dans le vide.
        await this.prisma.releaseFile.delete({ where: { id: file.id } });
        throw error;
      }
      this.logger.log(`Fichier publié : ${storagePath} (${upload.buffer.length} octets)`);
      return file;
    } finally {
      await rm(tempPath, { force: true });
    }
  }

  /** Un plugin à un seul jar publie `UNIVERSAL` ; un plugin à deux jars publie `FREE` ou `PREMIUM`. */
  private checkEdition(distribution: string, edition: ReleaseEdition): void {
    const allowed = distribution === 'SINGLE_JAR' ? ['UNIVERSAL'] : ['FREE', 'PREMIUM'];
    if (!allowed.includes(edition)) {
      throw new BadRequestException(`Ce plugin se publie avec l’édition ${allowed.join(' ou ')}.`);
    }
  }

  private checkMinecraftVersions(versions: string[]): string[] {
    const unique = [...new Set(versions)];
    if (unique.length === 0 || unique.length > MAX_MINECRAFT_VERSIONS) {
      throw new BadRequestException(`Indiquer de 1 à ${MAX_MINECRAFT_VERSIONS} versions de Minecraft.`);
    }
    const invalid = unique.find((v) => !MINECRAFT_VERSION.test(v));
    if (invalid !== undefined) throw new BadRequestException('Version de Minecraft invalide (ex. 1.21.4).');
    return unique;
  }
}
