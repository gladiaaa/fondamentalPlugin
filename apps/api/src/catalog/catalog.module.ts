import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService],
  // Le paiement (#23) et les licences (#22) retrouvent les produits par ce service.
  exports: [CatalogService],
})
export class CatalogModule {}
