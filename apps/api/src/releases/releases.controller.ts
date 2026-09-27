import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { ReleaseFileResponse } from '@fondamental/shared';
import { IsOptional, Matches } from 'class-validator';
import { ApiErrors } from '../common/api-docs.js';
import { toReleaseFileResponse } from './releases.mapper.js';
import { ReleaseFileApiResponse } from './releases.responses.js';
import { ReleasesService } from './releases.service.js';

class FilesQuery {
  @IsOptional()
  @Matches(/^\d{1,3}\.\d{1,3}(\.\d{1,3})?$/, { message: 'Version de Minecraft invalide (ex. 1.21.4).' })
  minecraft?: string;
}

/** Fichiers des plugins : consultables sans compte. */
@ApiTags('fichiers')
@Controller('products/:slug')
export class ReleasesController {
  constructor(private readonly releases: ReleasesService) {}

  @Get('minecraft-versions')
  @ApiOperation({
    summary: 'Versions de Minecraft disponibles',
    description:
      'Celles pour lesquelles le plugin a au moins un fichier, de la plus récente à la plus ancienne : elles alimentent le sélecteur de version. Public.',
  })
  @ApiParam({ name: 'slug', type: String, example: 'tag' })
  @ApiResponse({ status: 200, type: [String], description: 'Ex. `["1.21.11", "1.21.4"]`.' })
  @ApiErrors(404, 429)
  minecraftVersions(@Param('slug') slug: string): Promise<string[]> {
    return this.releases.minecraftVersions(slug);
  }

  @Get('files')
  @ApiOperation({
    summary: 'Fichiers d’un plugin',
    description:
      'Du plus récent au plus ancien, chacun avec sa version, son édition, son changelog, sa taille et son SHA-256. Un plugin à deux jars (Tag, Crate) en renvoie deux par version. Public.',
  })
  @ApiParam({ name: 'slug', type: String, example: 'tag' })
  @ApiQuery({
    name: 'minecraft',
    required: false,
    type: String,
    example: '1.21.4',
    description: 'Ne garde que les fichiers compatibles avec cette version de Minecraft.',
  })
  @ApiResponse({ status: 200, type: [ReleaseFileApiResponse] })
  @ApiErrors(400, 404, 429)
  async files(@Param('slug') slug: string, @Query() query: FilesQuery): Promise<ReleaseFileResponse[]> {
    return (await this.releases.files(slug, query.minecraft)).map(toReleaseFileResponse);
  }
}
