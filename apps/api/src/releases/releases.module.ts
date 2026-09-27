import { Module } from '@nestjs/common';
import { DownloadsController } from './downloads.controller.js';
import { ReleasesController } from './releases.controller.js';
import { ReleasesService } from './releases.service.js';

@Module({
  controllers: [ReleasesController, DownloadsController],
  providers: [ReleasesService],
  // La publication (#28) et l'espace client (#25) passent par ce service.
  exports: [ReleasesService],
})
export class ReleasesModule {}
