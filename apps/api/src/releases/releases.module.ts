import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import type { Env } from '../config/env.js';
import { AdminReleasesController } from './admin-releases.controller.js';
import { AdminTokenGuard } from './admin-token.guard.js';
import { DownloadsController } from './downloads.controller.js';
import { ReleasePublisher } from './release-publisher.service.js';
import { ReleasesController } from './releases.controller.js';
import { ReleasesService } from './releases.service.js';

@Module({
  imports: [
    // Un seul jar par envoi, gardé en mémoire (taille limitée) le temps de le contrôler puis de l'écrire.
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        limits: { fileSize: config.get('RELEASES_MAX_UPLOAD_MB', { infer: true }) * 1024 * 1024, files: 1, fields: 10 },
      }),
    }),
  ],
  controllers: [ReleasesController, DownloadsController, AdminReleasesController],
  providers: [ReleasesService, ReleasePublisher, AdminTokenGuard],
  // La publication (#28) et l'espace client (#25) passent par ces services.
  exports: [ReleasesService, ReleasePublisher],
})
export class ReleasesModule {}
