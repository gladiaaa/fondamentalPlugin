import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { AdminProductResponse } from '@fondamental/shared';
import { Auth, type AuthContext } from '../auth/auth.decorators.js';
import { SessionGuard } from '../auth/session.guard.js';
import { AdminGuard } from './admin.guard.js';
import { UpdateProductDto } from './admin-products.dto.js';
import { AdminProductsService } from './admin-products.service.js';

@ApiExcludeController()
@Controller('admin/products')
@UseGuards(SessionGuard, AdminGuard)
export class AdminProductsController {
  constructor(private readonly products: AdminProductsService) {}

  /** Tous les produits, y compris ceux retirés de la vente, dans l'ordre du catalogue (#105). */
  @Get()
  list(): Promise<AdminProductResponse[]> {
    return this.products.list();
  }

  @Get(':slug')
  get(@Param('slug') slug: string): Promise<AdminProductResponse> {
    return this.products.get(slug);
  }

  @Patch(':slug')
  update(
    @Auth() auth: AuthContext,
    @Param('slug') slug: string,
    @Body() dto: UpdateProductDto,
  ): Promise<AdminProductResponse> {
    return this.products.update(auth.user.id, slug, dto);
  }
}
