import type { Product } from '../generated/prisma/client.js';
import { toProductResponse } from './catalog.mapper.js';

const REQUIREMENTS = { platform: 'Paper 1.21.4', java: 21, dependencies: [] };

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: '8f1b3c1e-0000-4000-8000-000000000001',
    slug: 'tag',
    name: 'FondamentalTag',
    description: 'Des tags.',
    licenseProduct: 'tagcustom',
    distribution: 'FREE_PREMIUM_JARS',
    requirements: REQUIREMENTS,
    priceCents: 1999,
    currency: 'eur',
    stripePriceId: 'price_test_123',
    maxActivations: 5,
    active: true,
    sortOrder: 20,
    createdAt: new Date('2026-09-26T00:00:00Z'),
    updatedAt: new Date('2026-09-26T00:00:00Z'),
    ...overrides,
  };
}

describe('toProductResponse', () => {
  it('ne montre que les champs publics', () => {
    expect(Object.keys(toProductResponse(product())).sort()).toEqual(
      ['description', 'distribution', 'name', 'price', 'purchasable', 'requirements', 'slug'].sort(),
    );
  });

  it('ne laisse fuiter ni le produit de licence, ni le prix Stripe, ni le nombre d’installations', () => {
    const json = JSON.stringify(toProductResponse(product()));
    expect(json).not.toContain('tagcustom');
    expect(json).not.toContain('price_test_123');
    expect(json).not.toContain('maxActivations');
  });

  it('donne le prix en centimes avec sa devise', () => {
    expect(toProductResponse(product()).price).toEqual({ amountCents: 1999, currency: 'eur' });
  });

  it('achetable : actif, avec un prix et un prix Stripe', () => {
    expect(toProductResponse(product()).purchasable).toBe(true);
  });

  it.each([
    ['sans prix', { priceCents: null }],
    ['sans prix Stripe', { stripePriceId: null }],
    ['inactif', { active: false }],
  ])('pas achetable : %s', (_label, overrides) => {
    expect(toProductResponse(product(overrides)).purchasable).toBe(false);
  });

  it('un prix vide donne price = null (et non 0)', () => {
    expect(toProductResponse(product({ priceCents: null })).price).toBeNull();
  });

  it('un prix de 0 reste un prix (produit gratuit), pas une absence de prix', () => {
    expect(toProductResponse(product({ priceCents: 0 })).price).toEqual({ amountCents: 0, currency: 'eur' });
  });
});
