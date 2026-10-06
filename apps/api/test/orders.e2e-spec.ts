import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { FakeLicenseServer } from './support/fake-license-server.js';
import { FakeStripeClient, VALID_SIGNATURE } from './support/fake-stripe-client.js';
import { createTestApp, InMemoryMailer, newBrowser, STRONG_PASSWORD } from './support/app.js';

const EMAIL = 'ada@example.com';
const TEST_SLUG = 'e2e-orders-plugin';

describe('Commandes : achat Stripe (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let licenseServer: FakeLicenseServer;
  let stripe: FakeStripeClient;
  const mailer = new InMemoryMailer();

  beforeAll(async () => {
    licenseServer = new FakeLicenseServer();
    stripe = new FakeStripeClient();
    app = await createTestApp(mailer, licenseServer, stripe);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    mailer.clear();
    // Une commande ne se supprime jamais avec le compte (`onDelete: Restrict`, voir schema.prisma) :
    // il faut nettoyer les commandes (et les licences qu'elles ont créées) avant les comptes.
    await prisma.order.deleteMany();
    await prisma.license.deleteMany();
    await prisma.user.deleteMany();
    await prisma.product.deleteMany({ where: { slug: { startsWith: 'e2e-' } } });
    licenseServer.reset();
    stripe.isConfigured = true;
    stripe.createsSession = true;
    stripe.invoice = 'prete';
  });

  async function loggedInUser(email = EMAIL, password = STRONG_PASSWORD) {
    const b = newBrowser(app);
    await b.post('/api/auth/register', { email, password }).expect(202);
    await b.post('/api/auth/verify-email', { token: mailer.lastToken(email) }).expect(200);
    const res = await b.post('/api/auth/login', { email, password }).expect(200);
    return { b, csrf: res.body.csrfToken as string };
  }

  function createProduct(overrides: Record<string, unknown> = {}) {
    return prisma.product.create({
      data: {
        slug: TEST_SLUG,
        name: 'Plugin de test',
        description: 'Pour les tests.',
        licenseProduct: 'e2e-orders-license',
        distribution: 'SINGLE_JAR',
        requirements: { platform: 'Paper 1.21.4', java: 21, dependencies: [] },
        priceCents: 1999,
        stripePriceId: 'price_e2e_test',
        sortOrder: 999,
        ...overrides,
      },
    });
  }

  /**
   * Envoie un événement Stripe au webhook, signé avec la signature acceptée par `FakeStripeClient`.
   * Un paramètre par défaut se déclenche même sur un `undefined` explicite : `withSignature` distingue
   * donc « pas d'argument » (signe avec `VALID_SIGNATURE`) de « explicitement sans signature ».
   */
  function sendWebhook(app: INestApplication, event: unknown, withSignature: string | false = VALID_SIGNATURE) {
    const req = request(app.getHttpServer()).post('/api/stripe/webhook').type('json').send(JSON.stringify(event));
    return withSignature ? req.set('stripe-signature', withSignature) : req;
  }

  /** Reçus d'achat (e-mail avec la clé, #26) reçus par le client. */
  const receipts = () => mailer.to(EMAIL).filter((mail) => mail.subject.startsWith('Votre clé de licence'));

  it('checkout.session.completed payé : le client reçoit un seul e-mail avec sa clé, en texte et en HTML', async () => {
    const { session } = await paidOrder('pi_test_mail');
    const order = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: session.id } });
    const license = await prisma.license.findUnique({ where: { orderId: order!.id } });

    const mails = receipts();
    expect(mails).toHaveLength(1);
    expect(mails[0]?.subject).toContain('Plugin de test');
    expect(mails[0]?.text).toContain(license!.licenseKey);
    expect(mails[0]?.html).toContain(license!.licenseKey);
    expect(mails[0]?.text).toContain('/compte/licences');
  });

  it('paiement différé encore unpaid : aucun e-mail de clé', async () => {
    await createProduct();
    const { b, csrf } = await loggedInUser();
    await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(201);
    await sendWebhook(app, checkoutEvent('checkout.session.completed', stripe.lastSession!, 'unpaid', 'pi_test_mail_2')).expect(200);
    expect(receipts()).toHaveLength(0);
  });

  /** Événement Checkout (`completed`, `async_payment_succeeded`…) pour une session créée par le test. */
  function checkoutEvent(
    type: string,
    session: { id: string; client_reference_id: string | null },
    paymentStatus: 'paid' | 'unpaid' | 'no_payment_required',
    paymentIntent: string | null,
    amountTotal?: number,
  ) {
    return {
      type,
      data: {
        object: {
          id: session.id,
          client_reference_id: session.client_reference_id,
          payment_status: paymentStatus,
          payment_intent: paymentIntent,
          customer_email: EMAIL,
          amount_total: amountTotal,
        },
      },
    };
  }

  /** Achat complet et payé : commande `licensed` avec sa licence. */
  async function paidOrder(paymentIntent: string) {
    await createProduct();
    const { b, csrf } = await loggedInUser();
    await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(201);
    const session = stripe.lastSession!;
    await sendWebhook(app, checkoutEvent('checkout.session.completed', session, 'paid', paymentIntent)).expect(200);
    return { b, csrf, session };
  }

  describe('POST /api/checkout', () => {
    it('exige une session et le jeton anti-CSRF', async () => {
      await createProduct();
      await newBrowser(app).post('/api/checkout', { productSlug: TEST_SLUG }).expect(401);
      const { b, csrf } = await loggedInUser();
      await b.post('/api/checkout', { productSlug: TEST_SLUG }).expect(403); // sans jeton
      await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(201);
    });

    it('crée la commande (pending) et renvoie l’URL Stripe Checkout', async () => {
      const product = await createProduct();
      const { b, csrf } = await loggedInUser();
      const res = await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(201);
      expect(res.body.url).toBe(stripe.lastSession?.url);

      const order = await prisma.order.findFirst({ where: { productId: product.id } });
      expect(order?.status).toBe('PENDING');
      expect(order?.stripeCheckoutSessionId).toBe(stripe.lastSession?.id);
      expect(order?.amountCents).toBe(1999);
    });

    it.each([
      ['produit inconnu', 'e2e-inconnu', {}],
      ['produit désactivé', TEST_SLUG, { active: false }],
      ['prix pas fixé', TEST_SLUG, { priceCents: null }],
      ['pas de prix Stripe', TEST_SLUG, { stripePriceId: null }],
    ])('refuse (400) : %s', async (_nom, slug, overrides) => {
      if (slug === TEST_SLUG) await createProduct(overrides);
      const { b, csrf } = await loggedInUser();
      const res = await b.post('/api/checkout', { productSlug: slug }, { csrf }).expect(400);
      expect(res.body.code).toBe('PRODUCT_NOT_PURCHASABLE');
    });

    it('sans Stripe configuré, refuse (503) sans créer de commande', async () => {
      const product = await createProduct();
      stripe.isConfigured = false;
      const { b, csrf } = await loggedInUser();
      const res = await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(503);
      expect(res.body.code).toBe('PAYMENT_UNAVAILABLE');
      expect(await prisma.order.count({ where: { productId: product.id } })).toBe(0);
    });

    it('si Stripe échoue à créer la session, répond 503 (la commande reste, jamais reprise)', async () => {
      await createProduct();
      stripe.createsSession = false;
      const { b, csrf } = await loggedInUser();
      const res = await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(503);
      expect(res.body.code).toBe('PAYMENT_UNAVAILABLE');
    });
  });

  describe('GET /api/orders/by-session/:sessionId', () => {
    it('exige une session', async () => {
      await newBrowser(app).get('/api/orders/by-session/inconnue').expect(401);
    });

    it('renvoie le statut de la commande du compte connecté', async () => {
      await createProduct();
      const { b, csrf } = await loggedInUser();
      const checkout = await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(201);
      const sessionId = stripe.lastSession!.id;

      const res = await b.get(`/api/orders/by-session/${sessionId}`).expect(200);
      expect(res.body).toEqual({ status: 'PENDING', productSlug: TEST_SLUG, licenseKey: null });
      void checkout;
    });

    it('refuse (404) une session inconnue ou celle d’un autre compte', async () => {
      await createProduct();
      const ada = await loggedInUser();
      await ada.b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf: ada.csrf }).expect(201);
      const sessionId = stripe.lastSession!.id;

      await ada.b.get('/api/orders/by-session/inconnue').expect(404);
      const grace = await loggedInUser('grace@example.com', STRONG_PASSWORD);
      await grace.b.get(`/api/orders/by-session/${sessionId}`).expect(404);
    });
  });

  describe('POST /api/stripe/webhook', () => {
    it('refuse (400) sans signature ou avec une signature invalide', async () => {
      await sendWebhook(app, { type: 'checkout.session.completed' }, false).expect(400);
      await sendWebhook(app, { type: 'checkout.session.completed' }, 'fausse-signature').expect(400);
    });

    it('refuse (400) sans corps (donc sans corps brut à vérifier), même avec une signature', async () => {
      await request(app.getHttpServer()).post('/api/stripe/webhook').set('stripe-signature', VALID_SIGNATURE).expect(400);
    });

    it('sans Stripe configuré, refuse (503)', async () => {
      stripe.isConfigured = false;
      await sendWebhook(app, { type: 'checkout.session.completed' }).expect(503);
    });

    it('checkout.session.completed payé : commande → licensed, licence créée et rattachée', async () => {
      await createProduct();
      const { b, csrf } = await loggedInUser();
      await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(201);
      const session = stripe.lastSession!;

      await sendWebhook(app, {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: session.id,
            client_reference_id: session.client_reference_id,
            payment_status: 'paid',
            payment_intent: 'pi_test_1',
            customer_email: EMAIL,
          },
        },
      }).expect(200);

      const order = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: session.id } });
      expect(order?.status).toBe('LICENSED');
      expect(order?.stripePaymentIntentId).toBe('pi_test_1');

      const license = await prisma.license.findUnique({ where: { orderId: order!.id } });
      expect(license).not.toBeNull();

      const orderStatus = await b.get(`/api/orders/by-session/${session.id}`).expect(200);
      expect(orderStatus.body.status).toBe('LICENSED');
      expect(orderStatus.body.licenseKey).toBe(license?.licenseKey);
    });

    it('rejeu du même événement : aucune deuxième licence', async () => {
      await createProduct();
      const { b, csrf } = await loggedInUser();
      await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(201);
      const session = stripe.lastSession!;
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: session.id,
            client_reference_id: session.client_reference_id,
            payment_status: 'paid',
            payment_intent: 'pi_test_2',
            customer_email: EMAIL,
          },
        },
      };

      await sendWebhook(app, event).expect(200);
      await sendWebhook(app, event).expect(200);

      const order = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: session.id } });
      expect(await prisma.license.count({ where: { orderId: order!.id } })).toBe(1);
      // Un seul reçu, même si Stripe rejoue l'événement (#26).
      expect(receipts()).toHaveLength(1);
    });

    it('checkout.session.completed sans commande correspondante : accusé de réception, ignoré', async () => {
      await sendWebhook(app, {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_inconnue',
            // UUID syntaxiquement valide mais qui n'existe pas : un vrai id de commande introuvable
            // (commande supprimée entre-temps, par exemple), pas un id malformé.
            client_reference_id: '00000000-0000-0000-0000-000000000000',
            payment_status: 'paid',
          },
        },
      }).expect(200);
    });

    it('charge.refunded : révoque la licence et passe la commande à refunded', async () => {
      await createProduct();
      const { b, csrf } = await loggedInUser();
      await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(201);
      const session = stripe.lastSession!;

      await sendWebhook(app, {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: session.id,
            client_reference_id: session.client_reference_id,
            payment_status: 'paid',
            payment_intent: 'pi_test_refund',
            customer_email: EMAIL,
          },
        },
      }).expect(200);
      const order = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: session.id } });
      const license = await prisma.license.findUnique({ where: { orderId: order!.id } });

      await sendWebhook(app, {
        type: 'charge.refunded',
        data: { object: { id: 'ch_test_refund', payment_intent: 'pi_test_refund', refunded: true } },
      }).expect(200);

      expect(licenseServer.revoked).toContain(license?.licenseKey);
      expect(await prisma.license.findUnique({ where: { id: license!.id } })).toBeNull();
      expect((await prisma.order.findUnique({ where: { id: order!.id } }))?.status).toBe('REFUNDED');
      const refund = mailer.to(EMAIL).filter((mail) => mail.subject.startsWith('Remboursement'));
      expect(refund).toHaveLength(1);
      expect(refund[0]?.html).toContain('/support');
    });

    it('charge.refunded partiel : la licence reste valide, la commande reste licensed', async () => {
      const { session } = await paidOrder('pi_test_partiel');
      const order = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: session.id } });

      await sendWebhook(app, {
        type: 'charge.refunded',
        data: { object: { id: 'ch_test_partiel', payment_intent: 'pi_test_partiel', refunded: false } },
      }).expect(200);

      expect(licenseServer.revoked).toHaveLength(0);
      expect(await prisma.license.count({ where: { orderId: order!.id } })).toBe(1);
      expect((await prisma.order.findUnique({ where: { id: order!.id } }))?.status).toBe('LICENSED');
    });

    it('paiement différé : rien à la complétion (unpaid), licence à async_payment_succeeded', async () => {
      await createProduct();
      const { b, csrf } = await loggedInUser();
      await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(201);
      const session = stripe.lastSession!;

      await sendWebhook(app, checkoutEvent('checkout.session.completed', session, 'unpaid', 'pi_test_sepa')).expect(200);
      let order = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: session.id } });
      expect(order?.status).toBe('PENDING');
      expect(await prisma.license.count({ where: { orderId: order!.id } })).toBe(0);

      await sendWebhook(
        app,
        checkoutEvent('checkout.session.async_payment_succeeded', session, 'paid', 'pi_test_sepa'),
      ).expect(200);
      order = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: session.id } });
      expect(order?.status).toBe('LICENSED');
      expect(order?.stripePaymentIntentId).toBe('pi_test_sepa');
      expect(await prisma.license.count({ where: { orderId: order!.id } })).toBe(1);
    });

    it('paiement différé échoué : accusé de réception, commande laissée pending, aucune licence', async () => {
      await createProduct();
      const { b, csrf } = await loggedInUser();
      await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(201);
      const session = stripe.lastSession!;

      await sendWebhook(app, checkoutEvent('checkout.session.completed', session, 'unpaid', 'pi_test_ko')).expect(200);
      await sendWebhook(app, checkoutEvent('checkout.session.async_payment_failed', session, 'unpaid', 'pi_test_ko')).expect(
        200,
      );

      const order = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: session.id } });
      expect(order?.status).toBe('PENDING');
      expect(await prisma.license.count({ where: { orderId: order!.id } })).toBe(0);
    });

    it('code promo à 100 % (no_payment_required) : licence créée, sans paiement Stripe', async () => {
      await createProduct();
      const { b, csrf } = await loggedInUser();
      await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(201);
      const session = stripe.lastSession!;

      await sendWebhook(app, checkoutEvent('checkout.session.completed', session, 'no_payment_required', null)).expect(200);

      const order = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: session.id } });
      expect(order?.status).toBe('LICENSED');
      expect(order?.stripePaymentIntentId).toBeNull();
      expect(await prisma.license.count({ where: { orderId: order!.id } })).toBe(1);
    });

    it('livraison simultanée du même événement : la clé en trop est révoquée, une seule licence', async () => {
      await createProduct();
      const { b, csrf } = await loggedInUser();
      await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(201);
      const session = stripe.lastSession!;
      const order = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: session.id } });

      // Pendant l'appel au serveur de licences, l'autre livraison rattache sa clé à la commande.
      licenseServer.beforeCreate = async () => {
        await prisma.license.create({ data: { userId: order!.userId, licenseKey: 'CLE-AUTRE-LIVRAISON', orderId: order!.id } });
      };
      await sendWebhook(app, checkoutEvent('checkout.session.completed', session, 'paid', 'pi_test_double')).expect(200);

      const licenses = await prisma.license.findMany({ where: { orderId: order!.id } });
      expect(licenses.map((l) => l.licenseKey)).toEqual(['CLE-AUTRE-LIVRAISON']);
      expect(licenseServer.revoked).toHaveLength(1);
      expect(licenseServer.revoked[0]).not.toBe('CLE-AUTRE-LIVRAISON');
    });

    it('événement non géré : accusé de réception (200), rien à faire', async () => {
      await sendWebhook(app, { type: 'customer.created', data: { object: {} } }).expect(200);
    });

    it('code promo : la commande garde le montant réellement payé, pas le prix du catalogue', async () => {
      await createProduct();
      const { b, csrf } = await loggedInUser();
      await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(201);
      const session = stripe.lastSession!;
      await sendWebhook(app, checkoutEvent('checkout.session.completed', session, 'paid', 'pi_test_promo', 999)).expect(200);

      const order = await prisma.order.findUnique({ where: { stripeCheckoutSessionId: session.id } });
      expect(order?.amountCents).toBe(999);
    });
  });

  describe('GET /api/me/orders', () => {
    it('exige une session', async () => {
      await newBrowser(app).get('/api/me/orders').expect(401);
    });

    it('liste les commandes payées du compte, sans les paiements abandonnés', async () => {
      const { b, csrf } = await paidOrder('pi_test_liste');
      await b.post('/api/checkout', { productSlug: TEST_SLUG }, { csrf }).expect(201); // abandonné : reste pending

      const res = await b.get('/api/me/orders').expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        product: { slug: TEST_SLUG, name: 'Plugin de test' },
        amountCents: 1999,
        currency: 'eur',
        status: 'LICENSED',
      });
    });

    it('ne montre jamais les commandes d’un autre compte', async () => {
      await paidOrder('pi_test_autre');
      const grace = await loggedInUser('grace@example.com', STRONG_PASSWORD);
      expect((await grace.b.get('/api/me/orders').expect(200)).body).toEqual([]);
    });
  });

  describe('GET /api/me/orders/:id/invoice', () => {
    async function myOrderId(b: Awaited<ReturnType<typeof paidOrder>>['b']) {
      return (await b.get('/api/me/orders').expect(200)).body[0].id as string;
    }

    it('renvoie l’adresse de la facture Stripe', async () => {
      const { b, session } = await paidOrder('pi_test_facture');
      const res = await b.get(`/api/me/orders/${await myOrderId(b)}/invoice`).expect(200);
      expect(res.body).toEqual({ url: `https://invoice.stripe.test/${session.id}` });
    });

    it('même erreur (404) pour la commande d’un autre compte, une commande inconnue ou un identifiant invalide', async () => {
      const { b } = await paidOrder('pi_test_facture_autre');
      const id = await myOrderId(b);
      const grace = await loggedInUser('grace@example.com', STRONG_PASSWORD);
      for (const path of [id, '00000000-0000-4000-8000-000000000000', 'pas-un-uuid']) {
        const res = await grace.b.get(`/api/me/orders/${path}/invoice`).expect(404);
        expect(res.body.code).toBe('ORDER_NOT_FOUND');
      }
    });

    it('facture pas encore créée par Stripe : 404 INVOICE_NOT_FOUND', async () => {
      const { b } = await paidOrder('pi_test_facture_absente');
      stripe.invoice = 'absente';
      const res = await b.get(`/api/me/orders/${await myOrderId(b)}/invoice`).expect(404);
      expect(res.body.code).toBe('INVOICE_NOT_FOUND');
    });

    it('Stripe en panne ou non configuré : 503', async () => {
      const { b } = await paidOrder('pi_test_facture_panne');
      const id = await myOrderId(b);
      stripe.invoice = 'panne';
      expect((await b.get(`/api/me/orders/${id}/invoice`).expect(503)).body.code).toBe('PAYMENT_UNAVAILABLE');
      stripe.isConfigured = false;
      await b.get(`/api/me/orders/${id}/invoice`).expect(503);
    });
  });
});
