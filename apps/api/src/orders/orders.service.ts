import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import type { CheckoutResponse, OrderResponse } from '@fondamental/shared';
import type { Env } from '../config/env.js';
import { LicenseServerClient } from '../licenses/license-server-client.js';
import type { MailLocale } from '../auth/locale.js';
import { Mailer } from '../mail/mailer.js';
import { type MailContent, licenseKeyEmail, refundEmail } from '../mail/templates.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MESSAGES } from './orders.constants.js';
import { StripeClient } from './stripe-client.js';

/** Erreur Prisma « valeur déjà utilisée » (contrainte d'unicité). */
const UNIQUE_VIOLATION = 'P2002';

/** Ne montre jamais la clé en entier dans un log : seuls ses 4 derniers caractères. */
const redact = (key: string) => `…${key.slice(-4)}`;

/** Langue des e-mails du client (`FR`/`EN` en base). */
const mailLocale = (locale: string): MailLocale => (locale === 'EN' ? 'en' : 'fr');

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeClient,
    private readonly licenseServer: LicenseServerClient,
    private readonly config: ConfigService<Env, true>,
    private readonly mailer: Mailer,
  ) {}

  /**
   * E-mail au client sans jamais bloquer ni faire échouer le paiement (#26) : la licence est déjà créée
   * et visible dans le compte ; un envoi raté se rattrape depuis le back-office (« Renvoyer l'e-mail »).
   */
  private notify(to: string, content: MailContent): void {
    if (!this.mailer.isConfigured) {
      this.logger.warn('E-mail non envoyé : envoi non configuré (RESEND_API_KEY)');
      return;
    }
    this.mailer.send({ to, ...content }).catch((error: Error) => {
      this.logger.error(`Envoi d'e-mail échoué : ${error.message}`);
    });
  }

  private link(path: string): string {
    return `${this.config.get('SITE_URL', { infer: true })}${path}`;
  }

  /** Crée la commande (`pending`) et la session Stripe Checkout, renvoie l'URL vers laquelle rediriger. */
  async checkout(userId: string, userEmail: string, productSlug: string): Promise<CheckoutResponse> {
    if (!this.stripe.isConfigured) this.paymentUnavailable();

    const product = await this.prisma.product.findUnique({ where: { slug: productSlug } });
    if (!product?.active || !product.priceCents || !product.stripePriceId) {
      throw new BadRequestException({ code: 'PRODUCT_NOT_PURCHASABLE', message: MESSAGES.productNotPurchasable });
    }

    const siteUrl = this.config.get('SITE_URL', { infer: true });
    // Stripe exige l'id de la session dans `client_reference_id`, donc la commande existe déjà (avec un
    // id temporaire forcément unique) avant même d'appeler Stripe.
    const order = await this.prisma.order.create({
      data: {
        userId,
        productId: product.id,
        stripeCheckoutSessionId: `pending-${randomUUID()}`,
        amountCents: product.priceCents,
        currency: product.currency,
      },
    });

    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.createCheckoutSession({
        priceId: product.stripePriceId,
        customerEmail: userEmail,
        clientReferenceId: order.id,
        successUrl: `${siteUrl}/merci?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${siteUrl}/plugins/${product.slug}`,
      });
    } catch {
      // La commande reste avec son id temporaire, jamais reprise par le webhook : sans conséquence.
      this.logger.warn(`Création de la session Stripe Checkout échouée (commande ${order.id})`);
      this.paymentUnavailable();
    }
    if (!session.url) this.paymentUnavailable();

    await this.prisma.order.update({ where: { id: order.id }, data: { stripeCheckoutSessionId: session.id } });
    return { url: session.url };
  }

  /** Lu par la page /merci jusqu'à ce que la clé soit prête. */
  async getBySessionId(userId: string, sessionId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
      include: { product: true, license: true },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: MESSAGES.orderNotFound });
    }
    return {
      status: order.status,
      productSlug: order.product.slug,
      licenseKey: order.license?.licenseKey ?? null,
    };
  }

  /**
   * `checkout.session.completed` ou `checkout.session.async_payment_succeeded` (#96). Idempotent :
   * rejouer le même événement ne crée jamais une deuxième licence (voir #24). Si le serveur de licences
   * est en panne, l'appelant doit répondre 500 pour que Stripe réessaie ; la commande reste `paid`,
   * prête à reprendre sans avoir déjà encaissé deux fois.
   *
   * Livre dès que la session n'est plus `unpaid` : `paid`, ou `no_payment_required` (code promo à
   * 100 %). Un paiement différé (SEPA, virement) arrive d'abord `unpaid` dans `completed`, puis
   * `paid` dans `async_payment_succeeded`.
   */
  async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    if (session.payment_status === 'unpaid') return;
    const orderId = session.client_reference_id;
    if (!orderId) {
      this.logger.warn(`checkout.session.completed sans client_reference_id (session ${session.id})`);
      return;
    }
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { product: true, user: true } });
    if (!order) {
      this.logger.warn(`checkout.session.completed : commande introuvable (${orderId})`);
      return;
    }
    if (order.status === 'LICENSED') return; // déjà traité (rejeu du webhook)

    if (order.status === 'PENDING') {
      const paymentIntentId =
        typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID', stripeCheckoutSessionId: session.id, stripePaymentIntentId: paymentIntentId },
      });
    }

    // Pas encore fait ici : e-mail avec la clé (suite de #26, une fois ce module posé).
    const created = await this.licenseServer.create({
      product: order.product.licenseProduct,
      edition: 'PREMIUM',
      customer: `${session.customer_email ?? 'inconnu'} (${order.userId})`,
      maxActivations: order.product.maxActivations,
    });
    try {
      await this.prisma.$transaction([
        this.prisma.license.create({
          data: { userId: order.userId, licenseKey: created.key, orderId: order.id, productId: order.productId },
        }),
        this.prisma.order.update({ where: { id: order.id }, data: { status: 'LICENSED' } }),
      ]);
    } catch (error) {
      if ((error as { code?: string }).code !== UNIQUE_VIOLATION) throw error;
      // Deux livraisons simultanées du même événement : l'autre a déjà rattaché sa clé à la commande
      // (`licenses.order_id` est unique). Celle-ci n'appartient à personne : on la révoque.
      await this.licenseServer.revoke(created.key);
      this.logger.warn(`Clé en double révoquée pour la commande ${order.id} (clé ${redact(created.key)})`);
      return;
    }
    this.logger.log(`Licence créée pour la commande ${order.id}`);
    this.notify(
      order.user.email,
      licenseKeyEmail(order.product.name, created.key, mailLocale(order.user.locale), this.link('/compte/licences')),
    );
  }

  /** `charge.refunded` : révoque la licence puis marque la commande `refunded`. */
  async handleChargeRefunded(paymentIntentId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
      include: { license: true, user: true, product: true },
    });
    if (!order) {
      this.logger.warn(`charge.refunded : commande introuvable (payment_intent ${paymentIntentId})`);
      return;
    }
    if (order.status === 'REFUNDED') return; // déjà traité

    if (order.license) {
      // Révoque d'abord côté serveur de licences : si ça échoue, on relève une exception (Stripe réessaie)
      // sans avoir touché à notre base, donc sans risque de marquer « remboursé » une licence encore active.
      await this.licenseServer.revoke(order.license.licenseKey);
      await this.prisma.license.delete({ where: { id: order.license.id } });
    }
    await this.prisma.order.update({ where: { id: order.id }, data: { status: 'REFUNDED' } });
    this.notify(order.user.email, refundEmail(order.product.name, mailLocale(order.user.locale), this.link('/support')));
  }

  /**
   * Rembourse une commande depuis le back-office (#32) : rembourse chez Stripe, puis applique
   * immédiatement l'effet (révocation, commande → `refunded`) au lieu d'attendre le webhook — un admin
   * veut un résultat tout de suite. Si le webhook `charge.refunded` arrive quand même ensuite,
   * `handleChargeRefunded` le retrouve déjà `refunded` et ne fait rien (idempotent).
   */
  async refund(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: MESSAGES.orderNotFound });
    if (order.status === 'REFUNDED') return; // déjà remboursée
    if (!order.stripePaymentIntentId) {
      throw new BadRequestException({ code: 'ORDER_NOT_PAID', message: MESSAGES.orderNotPaid });
    }
    if (!this.stripe.isConfigured) this.paymentUnavailable();
    await this.stripe.refund(order.stripePaymentIntentId);
    await this.handleChargeRefunded(order.stripePaymentIntentId);
  }

  private paymentUnavailable(): never {
    throw new ServiceUnavailableException({ code: 'PAYMENT_UNAVAILABLE', message: MESSAGES.paymentUnavailable });
  }
}
