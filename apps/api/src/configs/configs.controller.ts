import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type {
  ConfigPluginResponse,
  ConfigSchemaResponse,
  RenderedConfigResponse,
  SavedConfigResponse,
} from '@fondamental/shared';
import { Auth, type AuthContext } from '../auth/auth.decorators.js';
import { SessionGuard } from '../auth/session.guard.js';
import { ApiErrors, ApiSession } from '../common/api-docs.js';
import { CreateConfigDto, RenderConfigDto, UpdateConfigDto, UpgradeConfigDto } from './configs.dto.js';
import {
  ConfigPluginApiResponse,
  ConfigSchemaApiResponse,
  RenderedConfigApiResponse,
  SavedConfigApiResponse,
} from './configs.responses.js';
import { ConfigsService } from './configs.service.js';

/** Schémas des fichiers de configuration (#30) : publics, comme le wiki. */
@ApiTags('configurations')
@Controller('configs')
export class ConfigsController {
  constructor(private readonly configs: ConfigsService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Fichiers configurables d’un plugin', description: 'Par version, la plus récente en premier. Public.' })
  @ApiParam({ name: 'slug', type: String, example: 'crate' })
  @ApiResponse({ status: 200, type: ConfigPluginApiResponse })
  @ApiErrors(404)
  plugin(@Param('slug') slug: string): ConfigPluginResponse {
    return this.configs.plugin(slug);
  }

  @Get(':slug/:version/:file')
  @ApiOperation({
    summary: 'Schéma d’un fichier',
    description: 'Champs du formulaire et valeurs livrées avec le plugin. Public.',
  })
  @ApiParam({ name: 'file', type: String, example: 'crates.yml' })
  @ApiResponse({ status: 200, type: ConfigSchemaApiResponse })
  @ApiErrors(404)
  schema(@Param('slug') slug: string, @Param('version') version: string, @Param('file') file: string): ConfigSchemaResponse {
    return this.configs.schema({ slug, version, file });
  }
}

/** Générateur réservé aux acheteurs : rendu du YAML et configurations enregistrées. */
@ApiTags('configurations')
@Controller('me/configs')
@UseGuards(SessionGuard)
export class MyConfigsController {
  constructor(private readonly configs: ConfigsService) {}

  @Post('render')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Générer un fichier',
    description:
      'Le YAML complet, à partir du fichier livré avec le plugin : seuls les champs envoyés changent, commentaires compris. ' +
      '`license.key` contient la clé de l’acheteur. `403 CONFIG_NOT_BUYER` sans licence de ce plugin.',
  })
  @ApiSession()
  @ApiErrors(400, 404, 403)
  @ApiResponse({ status: 200, type: RenderedConfigApiResponse })
  render(@Auth() auth: AuthContext, @Body() dto: RenderConfigDto): Promise<RenderedConfigResponse> {
    return this.configs.render(auth.user.id, dto, dto.values);
  }

  @Get()
  @ApiOperation({ summary: 'Mes configurations enregistrées', description: 'La plus récemment modifiée en premier.' })
  @ApiSession()
  @ApiResponse({ status: 200, type: [SavedConfigApiResponse] })
  list(@Auth() auth: AuthContext): Promise<SavedConfigResponse[]> {
    return this.configs.list(auth.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Enregistrer une configuration', description: '50 au plus par compte (`400 CONFIG_LIMIT`).' })
  @ApiSession()
  @ApiErrors(400, 404, 403)
  @ApiResponse({ status: 201, type: SavedConfigApiResponse })
  create(@Auth() auth: AuthContext, @Body() dto: CreateConfigDto): Promise<SavedConfigResponse> {
    return this.configs.create(auth.user.id, dto, dto.name, dto.values);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Une configuration enregistrée', description: 'Celle d’un autre compte répond 404, comme une inconnue.' })
  @ApiSession()
  @ApiErrors(404)
  @ApiResponse({ status: 200, type: SavedConfigApiResponse })
  get(@Auth() auth: AuthContext, @Param('id') id: string): Promise<SavedConfigResponse> {
    return this.configs.get(auth.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une configuration enregistrée', description: 'Nom et valeurs ; le plugin, la version et le fichier ne changent pas.' })
  @ApiSession()
  @ApiErrors(400, 404, 403)
  @ApiResponse({ status: 200, type: SavedConfigApiResponse })
  update(@Auth() auth: AuthContext, @Param('id') id: string, @Body() dto: UpdateConfigDto): Promise<SavedConfigResponse> {
    return this.configs.update(auth.user.id, id, dto.name, dto.values);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprimer une configuration enregistrée' })
  @ApiSession()
  @ApiErrors(404)
  async remove(@Auth() auth: AuthContext, @Param('id') id: string): Promise<void> {
    await this.configs.remove(auth.user.id, id);
  }

  @Post(':id/upgrade')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Passer à une autre version du plugin',
    description: 'Les valeurs encore valides sont gardées ; les autres reprennent celles du fichier de la nouvelle version.',
  })
  @ApiSession()
  @ApiErrors(400, 404, 403)
  @ApiResponse({ status: 200, type: SavedConfigApiResponse })
  upgrade(@Auth() auth: AuthContext, @Param('id') id: string, @Body() dto: UpgradeConfigDto): Promise<SavedConfigResponse> {
    return this.configs.upgrade(auth.user.id, id, dto.version);
  }
}
