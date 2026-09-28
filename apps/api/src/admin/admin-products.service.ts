import { Injectable, NotFoundException } from '@nestjs/common';
import type { AdminProductResponse } from '@fondamental/shared';
import type { Product } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminActionLogService } from './admin-action-log.service.js';
import type { UpdateProductDto } from './admin-products.dto.js';

function toResponse(product: Product): AdminProductResponse {
  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    currency: product.currency,
    stripePriceId: product.stripePriceId,
    active: product.active,
  };
}

@Injectable()
export class AdminProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AdminActionLogService,
  ) {}

  async list(): Promise<AdminProductResponse[]> {
    const products = await this.prisma.product.findMany({ orderBy: { sortOrder: 'asc' } });
    return products.map(toResponse);
  }

  async get(slug: string): Promise<AdminProductResponse> {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product) throw new NotFoundException('Produit introuvable.');
    return toResponse(product);
  }

  /** Se reflète immédiatement sur `GET /api/products` (aucun cache entre les deux). */
  async update(adminId: string, slug: string, patch: UpdateProductDto): Promise<AdminProductResponse> {
    const before = await this.prisma.product.findUnique({ where: { slug } });
    if (!before) throw new NotFoundException('Produit introuvable.');
    const after = await this.prisma.product.update({ where: { slug }, data: patch });
    await this.auditLog.log(adminId, 'product.update', 'product', slug, {
      before: { priceCents: before.priceCents, active: before.active, description: before.description },
      after: patch,
    });
    return toResponse(after);
  }
}
