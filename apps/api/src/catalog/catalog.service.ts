import { Injectable, NotFoundException } from '@nestjs/common';
import type { Product } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Produits actifs, dans l'ordre d'affichage. */
  listActive(): Promise<Product[]> {
    return this.prisma.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  /** Un produit actif ; 404 s'il n'existe pas ou n'est plus en vente. */
  async getActive(slug: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({ where: { slug, active: true } });
    if (!product) throw new NotFoundException('Plugin introuvable.');
    return product;
  }
}
