import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { ProductResponse } from '@fondamental/shared';
import { ApiErrors } from '../common/api-docs.js';
import { toProductResponse } from './catalog.mapper.js';
import { ProductApiResponse } from './catalog.responses.js';
import { CatalogService } from './catalog.service.js';

/** Catalogue public : aucun compte n'est nécessaire pour le consulter. */
@ApiTags('catalogue')
@Controller('products')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des plugins en vente', description: 'Dans l’ordre d’affichage. Public.' })
  @ApiResponse({ status: 200, type: [ProductApiResponse] })
  @ApiErrors(429)
  async list(): Promise<ProductResponse[]> {
    return (await this.catalog.listActive()).map(toProductResponse);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Un plugin', description: 'Public. 404 si le plugin n’existe pas ou n’est plus en vente.' })
  @ApiParam({ name: 'slug', type: String, example: 'tag' })
  @ApiResponse({ status: 200, type: ProductApiResponse })
  @ApiErrors(404, 429)
  async get(@Param('slug') slug: string): Promise<ProductResponse> {
    return toProductResponse(await this.catalog.getActive(slug));
  }
}
