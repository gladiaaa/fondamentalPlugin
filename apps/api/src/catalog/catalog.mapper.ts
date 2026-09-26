import type { ProductRequirements, ProductResponse } from '@fondamental/shared';
import type { Product } from '../generated/prisma/client.js';

/**
 * Ce que le site voit d'un produit. Volontairement une liste blanche : le produit du
 * serveur de licences, le prix Stripe et le nombre d'installations restent côté API.
 */
export function toProductResponse(product: Product): ProductResponse {
  const hasPrice = product.priceCents !== null;
  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    distribution: product.distribution,
    requirements: product.requirements as unknown as ProductRequirements,
    price: hasPrice ? { amountCents: product.priceCents as number, currency: product.currency } : null,
    // Achetable seulement s'il est actif, a un prix, et existe chez Stripe.
    purchasable: product.active && hasPrice && product.stripePriceId !== null,
  };
}
