import { Controller, Get, Logger, NotFoundException, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { resolve } from 'node:path';
import { ApiErrors } from '../common/api-docs.js';
import type { Env } from '../config/env.js';
import { isFile, resolveReleasePath } from './release-storage.js';
import { ReleasesService } from './releases.service.js';

/** Téléchargements : publics, sans compte. C'est la licence, pas le fichier, qui débloque le premium. */
@ApiTags('fichiers')
@Controller('downloads')
export class DownloadsController {
  private readonly logger = new Logger(DownloadsController.name);
  private readonly baseDir: string;
  private readonly accelPrefix: string | undefined;

  constructor(
    private readonly releases: ReleasesService,
    config: ConfigService<Env, true>,
  ) {
    this.baseDir = resolve(config.get('RELEASES_DIR', { infer: true }));
    this.accelPrefix = config.get('DOWNLOADS_ACCEL_PREFIX', { infer: true });
  }

  @Get(':fileId')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Télécharger un jar',
    description:
      'Public. Répond par le fichier (`Content-Disposition: attachment`). En ligne, nginx peut servir le fichier (`X-Accel-Redirect`) : le site n’a rien à changer.',
  })
  @ApiParam({ name: 'fileId', type: String, format: 'uuid', description: 'Le champ `id` d’un fichier de `GET /products/:slug/files`.' })
  @ApiResponse({ status: 200, description: 'Le fichier `.jar`.', content: { 'application/java-archive': { schema: { type: 'string', format: 'binary' } } } })
  @ApiErrors(404, 429)
  async download(
    @Param('fileId', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) fileId: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.releases.fileForDownload(fileId);

    const path = resolveReleasePath(this.baseDir, file.storagePath);
    if (!path || !(await isFile(path))) {
      // Ligne en base mais fichier absent (ou chemin refusé) : à corriger côté serveur, pas côté visiteur.
      this.logger.error(`Fichier ${file.id} indisponible sur le disque`);
      throw new NotFoundException('Fichier introuvable.');
    }

    await this.releases.countDownload(file.id);

    res.attachment(file.fileName);
    res.type('application/java-archive');
    if (this.accelPrefix) {
      res.setHeader('X-Accel-Redirect', `${this.accelPrefix}/${file.storagePath}`);
      res.end();
      return;
    }
    res.sendFile(path, (error) => {
      if (error && !res.headersSent) res.status(500).end();
    });
  }
}
