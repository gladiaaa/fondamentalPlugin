import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { currentTotpCode } from '../src/admin/totp.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { FakeLicenseServer } from './support/fake-license-server.js';
import { FakeStripeClient } from './support/fake-stripe-client.js';
import { createTestApp, InMemoryMailer, newBrowser, STRONG_PASSWORD } from './support/app.js';

const ADMIN_EMAIL = 'admin@example.com';
const CUSTOMER_EMAIL = 'ada@example.com';
const TEST_SLUG = 'e2e-panel-plugin';

/** Routes du panel admin (#105) : utilisateurs, versions publiées, tableau de bord, journal. */
describe('Panel admin : utilisateurs, versions, tableau de bord (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const mailer = new InMemoryMailer();

  beforeAll(async () => {
    app = await createTestApp(mailer, new FakeLicenseServer(), new FakeStripeClient());
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    mailer.clear();
    await prisma.adminAction.deleteMany();
    await prisma.order.deleteMany();
    await prisma.license.deleteMany();
    await prisma.user.deleteMany();
    await prisma.product.deleteMany({ where: { slug: { startsWith: 'e2e-' } } });
  });

  async function loggedInUser(email: string, password = STRONG_PASSWORD) {
    const b = newBrowser(app);
    await b.post('/api/auth/register', { email, password }).expect(202);
    await b.post('/api/auth/verify-email', { token: mailer.lastToken(email) }).expect(200);
    const res = await b.post('/api/auth/login', { email, password }).expect(200);
    return { b, csrf: res.body.csrfToken as string, userId: res.body.user.id as string };
  }

  /** Compte admin, 2FA mise en place et validée pour la session. */
  async function loggedInAdmin(email = ADMIN_EMAIL) {
    const { b, csrf, userId } = await loggedInUser(email);
    await prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
    const setup = await b.post('/api/admin/2fa/setup', {}, { csrf }).expect(201);
    await b.post('/api/admin/2fa/verify', { code: currentTotpCode(setup.body.secret as string) }, { csrf }).expect(204);
    return { b, csrf, userId };
  }

  function createProduct(overrides: Record<string, unknown> = {}) {
    return prisma.product.create({
      data: {
        slug: TEST_SLUG,
        name: 'Plugin du panel',
        description: 'Pour les tests.',
        licenseProduct: 'e2e-panel-license',
        distribution: 'SINGLE_JAR',
        requirements: { platform: 'Paper 1.21.4', java: 21, dependencies: [] },
        priceCents: 999,
        stripePriceId: 'price_e2e_panel',
        sortOrder: 999,
        ...overrides,
      },
    });
  }

  function seedOrder(userId: string, productId: string, overrides: Record<string, unknown> = {}) {
    return prisma.order.create({
      data: {
        userId,
        productId,
        stripeCheckoutSessionId: `cs_e2e_${randomUUID()}`,
        stripePaymentIntentId: `pi_e2e_${randomUUID()}`,
        amountCents: 999,
        currency: 'eur',
        status: 'LICENSED',
        ...overrides,
      },
    });
  }

  async function seedRelease(productId: string, version = 'e2e-1.0.0') {
    return prisma.release.create({
      data: {
        productId,
        version,
        changelog: 'Notes',
        files: {
          create: {
            edition: 'UNIVERSAL',
            fileName: `plugin-${version}.jar`,
            sizeBytes: 3,
            sha256: 'a'.repeat(64),
            storagePath: `${TEST_SLUG}/${version}/plugin-${version}.jar`,
            downloadCount: 7,
          },
        },
      },
      include: { files: true },
    });
  }

  // ─── Accès ──────────────────────────────────────────────────────

  describe('Accès refusé sans rôle admin ni 2FA', () => {
    const routes: Array<['get' | 'patch', string]> = [
      ['get', '/api/admin/users'],
      ['get', `/api/admin/users/${randomUUID()}`],
      ['patch', `/api/admin/users/${randomUUID()}`],
      ['get', '/api/admin/releases'],
      ['patch', `/api/admin/releases/${randomUUID()}`],
      ['get', '/api/admin/stats'],
      ['get', '/api/admin/actions'],
      ['get', '/api/admin/products'],
    ];

    /** Une route du tableau, avec le jeton anti-CSRF pour PATCH (sinon le refus viendrait du CSRF, pas du rôle). */
    const call = (b: ReturnType<typeof newBrowser>, method: 'get' | 'patch', url: string, csrf?: string) =>
      method === 'get' ? b.get(url) : b.patch(url, {}, { csrf });

    it.each(routes)('%s %s : 401 sans session', async (method, url) => {
      await call(newBrowser(app), method, url).expect(401);
    });

    it.each(routes)('%s %s : 403 pour un client', async (method, url) => {
      const { b, csrf } = await loggedInUser(CUSTOMER_EMAIL);
      await call(b, method, url, csrf).expect(403);
    });

    it.each(routes)('%s %s : 403 pour un admin sans 2FA validée', async (method, url) => {
      const { b, csrf, userId } = await loggedInUser(ADMIN_EMAIL);
      await prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
      const res = await call(b, method, url, csrf).expect(403);
      expect(res.body.code).toBe('TWO_FACTOR_REQUIRED');
    });
  });

  // ─── Utilisateurs ───────────────────────────────────────────────

  describe('Utilisateurs', () => {
    it('GET /admin/users : recherche par morceau d’adresse, sans tenir compte de la casse', async () => {
      const { b } = await loggedInAdmin();
      await loggedInUser(CUSTOMER_EMAIL);
      await loggedInUser('grace@example.com');

      const all = await b.get('/api/admin/users').expect(200);
      expect(all.body.map((u: { email: string }) => u.email).sort()).toEqual(
        [ADMIN_EMAIL, CUSTOMER_EMAIL, 'grace@example.com'].sort(),
      );

      const found = await b.get('/api/admin/users?q=ADA').expect(200);
      expect(found.body).toHaveLength(1);
      expect(found.body[0]).toMatchObject({ email: CUSTOMER_EMAIL, role: 'CUSTOMER', blockedAt: null });
      expect(found.body[0]).not.toHaveProperty('passwordHash');
      expect(found.body[0]).not.toHaveProperty('totpSecret');
    });

    it('GET /admin/users/:id : commandes et licences du compte', async () => {
      const { b } = await loggedInAdmin();
      const { userId } = await loggedInUser(CUSTOMER_EMAIL);
      const product = await createProduct();
      const order = await seedOrder(userId, product.id);
      await prisma.license.create({ data: { userId, licenseKey: 'KEY-PANEL-1', orderId: order.id } });

      const res = await b.get(`/api/admin/users/${userId}`).expect(200);
      expect(res.body).toMatchObject({ email: CUSTOMER_EMAIL, ordersCount: 1, licensesCount: 1 });
      expect(res.body.orders[0]).toMatchObject({ id: order.id, productSlug: TEST_SLUG, status: 'LICENSED' });
      expect(res.body.licenses[0]).toMatchObject({ key: 'KEY-PANEL-1', productSlug: TEST_SLUG, orderId: order.id });
    });

    it('id inconnu : 404 ; id malformé : 400', async () => {
      const { b } = await loggedInAdmin();
      const res = await b.get(`/api/admin/users/${randomUUID()}`).expect(404);
      expect(res.body.code).toBe('USER_NOT_FOUND');
      await b.get('/api/admin/users/pas-un-uuid').expect(400);
    });

    it('bloquer : ferme les sessions, refuse la connexion (ACCOUNT_BLOCKED), journalisé ; débloquer rétablit', async () => {
      const admin = await loggedInAdmin();
      const customer = await loggedInUser(CUSTOMER_EMAIL);
      await customer.b.get('/api/auth/me').expect(200);

      const res = await admin.b.patch(`/api/admin/users/${customer.userId}`, { blocked: true }, { csrf: admin.csrf });
      expect(res.status).toBe(200);
      expect(res.body.blockedAt).not.toBeNull();

      // Session ouverte : plus acceptée.
      await customer.b.get('/api/auth/me').expect(401);
      // Nouvelle connexion : refusée avec un code explicite (mot de passe correct).
      const login = await newBrowser(app)
        .post('/api/auth/login', { email: CUSTOMER_EMAIL, password: STRONG_PASSWORD })
        .expect(403);
      expect(login.body.code).toBe('ACCOUNT_BLOCKED');
      // Mauvais mot de passe : réponse habituelle, rien n'apprend que le compte est bloqué.
      await newBrowser(app).post('/api/auth/login', { email: CUSTOMER_EMAIL, password: 'MauvaisMotDePasse123' }).expect(401);

      const actions = await prisma.adminAction.findMany({ where: { targetId: customer.userId } });
      expect(actions.map((a) => a.action)).toEqual(['user.block']);

      await admin.b.patch(`/api/admin/users/${customer.userId}`, { blocked: false }, { csrf: admin.csrf }).expect(200);
      await newBrowser(app).post('/api/auth/login', { email: CUSTOMER_EMAIL, password: STRONG_PASSWORD }).expect(200);
    });

    it('nommer admin puis repasser client : le rôle change, les sessions du compte rétrogradé sont fermées', async () => {
      const admin = await loggedInAdmin();
      const other = await loggedInUser(CUSTOMER_EMAIL);

      const promoted = await admin.b
        .patch(`/api/admin/users/${other.userId}`, { role: 'ADMIN' }, { csrf: admin.csrf })
        .expect(200);
      expect(promoted.body.role).toBe('ADMIN');
      // Nouvel admin : doit encore mettre en place sa 2FA avant toute autre route admin.
      const denied = await other.b.get('/api/admin/stats').expect(403);
      expect(denied.body.code).toBe('TWO_FACTOR_REQUIRED');

      await admin.b.patch(`/api/admin/users/${other.userId}`, { role: 'CUSTOMER' }, { csrf: admin.csrf }).expect(200);
      await other.b.get('/api/auth/me').expect(401);
      const actions = await prisma.adminAction.findMany({ where: { targetId: other.userId }, orderBy: { createdAt: 'asc' } });
      expect(actions.map((a) => a.action)).toEqual(['user.role', 'user.role']);
    });

    it('un admin ne peut ni se bloquer ni changer son propre rôle (400 CANNOT_MODIFY_SELF)', async () => {
      const admin = await loggedInAdmin();
      for (const patch of [{ blocked: true }, { role: 'CUSTOMER' }]) {
        const res = await admin.b.patch(`/api/admin/users/${admin.userId}`, patch, { csrf: admin.csrf }).expect(400);
        expect(res.body.code).toBe('CANNOT_MODIFY_SELF');
      }
      await admin.b.get('/api/admin/stats').expect(200);
    });

    it('champ inconnu ou rôle invalide : 400', async () => {
      const admin = await loggedInAdmin();
      const { userId } = await loggedInUser(CUSTOMER_EMAIL);
      await admin.b.patch(`/api/admin/users/${userId}`, { role: 'SUPERADMIN' }, { csrf: admin.csrf }).expect(400);
      await admin.b.patch(`/api/admin/users/${userId}`, { emailVerifiedAt: null }, { csrf: admin.csrf }).expect(400);
    });
  });

  // ─── Versions publiées ──────────────────────────────────────────

  describe('Versions publiées', () => {
    it('GET /admin/releases : versions et fichiers, filtrables par plugin', async () => {
      const { b } = await loggedInAdmin();
      const product = await createProduct();
      await seedRelease(product.id);

      const res = await b.get(`/api/admin/releases?product=${TEST_SLUG}`).expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ productSlug: TEST_SLUG, version: 'e2e-1.0.0', hiddenAt: null });
      expect(res.body[0].files[0]).toMatchObject({ fileName: 'plugin-e2e-1.0.0.jar', downloadCount: 7 });
      expect(res.body[0].files[0]).not.toHaveProperty('storagePath');
    });

    it('masquer : disparaît du site public et ne se télécharge plus ; réafficher rétablit ; journalisé', async () => {
      const admin = await loggedInAdmin();
      const product = await createProduct();
      const release = await seedRelease(product.id);
      const fileId = release.files[0]!.id;
      const publicFiles = () => newBrowser(app).get(`/api/products/${TEST_SLUG}/files`).expect(200);

      expect((await publicFiles()).body).toHaveLength(1);

      const hidden = await admin.b
        .patch(`/api/admin/releases/${release.id}`, { hidden: true }, { csrf: admin.csrf })
        .expect(200);
      expect(hidden.body.hiddenAt).not.toBeNull();
      expect((await publicFiles()).body).toHaveLength(0);
      await newBrowser(app).get(`/api/downloads/${fileId}`).expect(404);

      await admin.b.patch(`/api/admin/releases/${release.id}`, { hidden: false }, { csrf: admin.csrf }).expect(200);
      expect((await publicFiles()).body).toHaveLength(1);

      const actions = await prisma.adminAction.findMany({ where: { targetId: release.id } });
      expect(actions.map((a) => a.action)).toEqual(['release.update', 'release.update']);
    });

    it('canal et changelog modifiables ; version inconnue : 404', async () => {
      const admin = await loggedInAdmin();
      const product = await createProduct();
      const release = await seedRelease(product.id);

      const res = await admin.b
        .patch(`/api/admin/releases/${release.id}`, { channel: 'BETA', changelog: '- Corrigé' }, { csrf: admin.csrf })
        .expect(200);
      expect(res.body).toMatchObject({ channel: 'BETA', changelog: '- Corrigé' });

      const missing = await admin.b
        .patch(`/api/admin/releases/${randomUUID()}`, { hidden: true }, { csrf: admin.csrf })
        .expect(404);
      expect(missing.body.code).toBe('RELEASE_NOT_FOUND');
    });
  });

  // ─── Produits, tableau de bord, journal ─────────────────────────

  describe('Produits, tableau de bord et journal', () => {
    it('GET /admin/products : liste aussi les produits retirés de la vente', async () => {
      const { b } = await loggedInAdmin();
      await createProduct({ active: false });
      const res = await b.get('/api/admin/products').expect(200);
      expect(res.body.find((p: { slug: string }) => p.slug === TEST_SLUG)).toMatchObject({ active: false });
    });

    it('GET /admin/stats : chiffre d’affaires hors remboursements, ventes et téléchargements par plugin', async () => {
      const admin = await loggedInAdmin();
      const { userId } = await loggedInUser(CUSTOMER_EMAIL);
      const product = await createProduct();
      await seedOrder(userId, product.id, { status: 'LICENSED', amountCents: 999 });
      await seedOrder(userId, product.id, { status: 'PAID', amountCents: 500 });
      await seedOrder(userId, product.id, { status: 'REFUNDED', amountCents: 999 });
      await seedOrder(userId, product.id, { status: 'PENDING', amountCents: 999, stripePaymentIntentId: null });
      // Vente ancienne : dans le total, pas dans les 30 derniers jours.
      await seedOrder(userId, product.id, { amountCents: 100, createdAt: new Date(Date.now() - 60 * 86_400_000) });
      await seedRelease(product.id);

      const res = await admin.b.get('/api/admin/stats').expect(200);
      expect(res.body.revenue).toEqual([{ currency: 'eur', totalCents: 1599, last30DaysCents: 1499 }]);
      expect(res.body.orders).toEqual({ licensed: 2, paid: 1, pending: 1, refunded: 1 });
      expect(res.body.products.find((p: { slug: string }) => p.slug === TEST_SLUG)).toEqual({
        slug: TEST_SLUG,
        name: 'Plugin du panel',
        sales: 3,
        revenueCents: 1599,
        downloads: 7,
      });
      expect(res.body.salesLast30Days).toHaveLength(30);
      const today = new Date().toISOString().slice(0, 10);
      expect(res.body.salesLast30Days.at(-1)).toEqual({ date: today, sales: 2, revenueCents: 1499 });
      expect(res.body.users).toMatchObject({ total: 2, admins: 1, blocked: 0 });
    });

    it('GET /admin/actions : journal avec l’e-mail de l’admin, filtrable par cible', async () => {
      const admin = await loggedInAdmin();
      const { userId } = await loggedInUser(CUSTOMER_EMAIL);
      await admin.b.patch(`/api/admin/users/${userId}`, { blocked: true }, { csrf: admin.csrf }).expect(200);
      await createProduct();
      await admin.b.patch(`/api/admin/products/${TEST_SLUG}`, { priceCents: 1299 }, { csrf: admin.csrf }).expect(200);

      const all = await admin.b.get('/api/admin/actions').expect(200);
      expect(all.body.map((a: { action: string }) => a.action)).toEqual(['product.update', 'user.block']);
      expect(all.body[0]).toMatchObject({ adminEmail: ADMIN_EMAIL, targetType: 'product', targetId: TEST_SLUG });

      const filtered = await admin.b.get(`/api/admin/actions?targetType=user&targetId=${userId}`).expect(200);
      expect(filtered.body).toHaveLength(1);
      await admin.b.get('/api/admin/actions?limit=0').expect(400);
    });
  });
});
