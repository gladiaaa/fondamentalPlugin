import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { ReleaseFileResponse } from '@fondamental/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Response } from 'express';
import { SkipOriginCheck } from '../auth/auth.decorators.js';
import { AdminTokenGuard } from './admin-token.guard.js';
import { ReleasePublisher } from './release-publisher.service.js';
import { toReleaseFileResponse } from './releases.mapper.js';

/** Ce que multer (stockage en mémoire) donne d'un fichier envoyé : seuls ces deux champs servent. */
interface UploadedFileInfo {
  originalname: string;
  buffer: Buffer;
}

class ReleaseDto {
  @IsOptional()
  @IsIn(['RELEASE', 'BETA'])
  channel?: 'RELEASE' | 'BETA';

  /** Notes de version en texte brut. */
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  changelog?: string;
}

class UploadFileDto {
  @IsIn(['UNIVERSAL', 'FREE', 'PREMIUM'])
  edition!: 'UNIVERSAL' | 'FREE' | 'PREMIUM';

  /** Versions de Minecraft couvertes, séparées par des virgules : `1.21.4,1.21.5`. */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((v) => v.trim()).filter(Boolean) : value,
  )
  @IsString({ each: true })
  minecraft!: string[];
}

/**
 * Publication d'une version de plugin par la CI des plugins (voir `docs/release-plugin.md`).
 * Hors documentation OpenAPI : ce n'est pas une route du site. Appels de serveur à serveur :
 * pas d'en-tête `Origin`, l'authentification est le jeton `RELEASES_TOKEN`.
 */
@ApiExcludeController()
@Controller('admin/releases/:product/:version')
@SkipOriginCheck()
@UseGuards(AdminTokenGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminReleasesController {
  constructor(private readonly publisher: ReleasePublisher) {}

  /** Crée la version (201) ou met à jour son canal et son changelog (200). */
  @Put()
  async upsert(
    @Param('product') product: string,
    @Param('version') version: string,
    @Body() dto: ReleaseDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ product: string; version: string; channel: string; created: boolean }> {
    const { release, created } = await this.publisher.upsertRelease(product, version, dto);
    res.status(created ? 201 : 200);
    return { product, version: release.version, channel: release.channel, created };
  }

  /** Ajoute un jar (multipart : champ `file`, plus `edition` et `minecraft`). */
  @Post('files')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file'))
  async addFile(
    @Param('product') product: string,
    @Param('version') version: string,
    @Body() dto: UploadFileDto,
    @UploadedFile() file: UploadedFileInfo | undefined,
  ): Promise<ReleaseFileResponse> {
    if (!file) throw new BadRequestException('Fichier manquant (champ « file »).');
    const created = await this.publisher.addFile(
      product,
      version,
      { originalName: file.originalname, buffer: file.buffer },
      { edition: dto.edition, minecraft: dto.minecraft },
    );
    return toReleaseFileResponse(created);
  }
}
