import type { INestApplication } from '@nestjs/common';
import type { ProductResponse } from '@fondamental/shared';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, InMemoryMailer } from './support/app.js';

// Les 4 plugins viennent de la migration `catalogue`. Ces tests y ajoutent, puis retirent,
// leurs propres lignes (préfixe `e2e-`) : ils ne modifient jamais les vrais produits.
const TEST_SLUG = 'e2e-plugin';

describe('Catalogue (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp(new InMemoryMailer());
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prisma.product.deleteMany({ where: { slug: { startsWith: 'e2e-' } } });
  });

  function createProduct(overrides: Record<string, unknown> = {}) {
    return prisma.product.create({
      data: {
        slug: TEST_SLUG,
        name: 'Plugin de test',
        description: 'Pour les tests.',
        licenseProduct: 'e2e-license',
        distribution: 'SINGLE_JAR',
        requirements: { platform: 'Paper 1.21.4', java: 21, dependencies: [] },
        sortOrder: 999,
        ...overrides,
      },
    });
  }

  describe('GET /api/products', () => {
    it('renvoie les 4 plugins, sans compte, dans l’ordre d’affichage', async () => {
      const res = await request(app.getHttpServer()).get('/api/products').expect(200);
      const products = res.body as ProductResponse[];
      expect(products.map((p) => p.slug)).toEqual(['bedwars', 'tag', 'crate', 'pass']);
      expect(products.map((p) => p.name)).toEqual([
        'FondamentalBedwars',
        'FondamentalTag',
        'FondamentalCrate',
        'FondamentalPass',
      ]);
    });

    it('indique le nombre de jars et les prérequis de chaque plugin', async () => {
      const products = (await request(app.getHttpServer()).get('/api/products').expect(200)).body as ProductResponse[];
      const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));
      expect(bySlug['bedwars']?.distribution).toBe('SINGLE_JAR');
      expect(bySlug['pass']?.distribution).toBe('SINGLE_JAR');
      expect(bySlug['tag']?.distribution).toBe('FREE_PREMIUM_JARS');
      expect(bySlug['crate']?.distribution).toBe('FREE_PREMIUM_JARS');
      const fawe = bySlug['bedwars']?.requirements.dependencies.find((d) => d.name === 'FastAsyncWorldEdit');
      expect(fawe?.required).toBe(true);
      expect(bySlug['tag']?.requirements.java).toBe(21);
    });

    it('les prix ne sont pas décidés : aucun plugin n’est achetable pour l’instant', async () => {
      const products = (await request(app.getHttpServer()).get('/api/products').expect(200)).body as ProductResponse[];
      for (const product of products) {
        expect(product.price).toBeNull();
        expect(product.purchasable).toBe(false);
      }
    });

    it('ne montre pas les plugins retirés de la vente', async () => {
      await createProduct({ active: false });
      const products = (await request(app.getHttpServer()).get('/api/products').expect(200)).body as ProductResponse[];
      expect(products.map((p) => p.slug)).not.toContain(TEST_SLUG);
    });

    it('ne laisse fuiter aucun champ interne', async () => {
      await createProduct({ stripePriceId: 'price_secret_123', priceCents: 999 });
      const res = await request(app.getHttpServer()).get('/api/products').expect(200);
      const text = JSON.stringify(res.body);
      for (const forbidden of ['price_secret_123', 'e2e-license', 'tagcustom', 'maxActivations', 'stripePriceId', 'licenseProduct']) {
        expect(text).not.toContain(forbidden);
      }
    });
  });

  describe('GET /api/products/:slug', () => {
    it('renvoie un plugin', async () => {
      const res = await request(app.getHttpServer()).get('/api/products/tag').expect(200);
      expect(res.body).toMatchObject({ slug: 'tag', name: 'FondamentalTag', distribution: 'FREE_PREMIUM_JARS' });
    });

    it('404 pour un plugin inconnu', async () => {
      const res = await request(app.getHttpServer()).get('/api/products/nexiste-pas').expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it('404 pour un plugin retiré de la vente', async () => {
      await createProduct({ active: false });
      await request(app.getHttpServer()).get(`/api/products/${TEST_SLUG}`).expect(404);
    });

    it('achetable seulement avec un prix et un prix Stripe', async () => {
      await createProduct({ priceCents: 1999, stripePriceId: 'price_test_1' });
      const res = await request(app.getHttpServer()).get(`/api/products/${TEST_SLUG}`).expect(200);
      expect(res.body).toMatchObject({ price: { amountCents: 1999, currency: 'eur' }, purchasable: true });
    });

    it('un prix sans prix Stripe n’est pas achetable', async () => {
      await createProduct({ priceCents: 1999 });
      const res = await request(app.getHttpServer()).get(`/api/products/${TEST_SLUG}`).expect(200);
      expect(res.body).toMatchObject({ price: { amountCents: 1999 }, purchasable: false });
    });
  });
});
