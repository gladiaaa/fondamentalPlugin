import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { Env } from '../config/env.js';

/** Ce qu'il faut pour créer une session Stripe Checkout (`POST /api/checkout`, voir #23). */
export interface CreateCheckoutSessionInput {
  priceId: string;
  customerEmail: string;
  /** `orderId` : sert à retrouver la commande depuis le webhook sans dépendre de `metadata`. */
  clientReferenceId: string;
  successUrl: string;
  cancelUrl: string;
}

export class StripeWebhookSignatureError extends Error {}

/**
 * Client Stripe de l'API. Ne fait jamais fuiter la clé secrète dans une erreur ou un log :
 * seul ce fichier la manipule.
 */
@Injectable()
export class StripeClient {
  private readonly logger = new Logger(StripeClient.name);
  private readonly stripe?: Stripe;
  private readonly webhookSecret?: string;

  constructor(config: ConfigService<Env, true>) {
    const secretKey = config.get('STRIPE_SECRET_KEY', { infer: true });
    this.webhookSecret = config.get('STRIPE_WEBHOOK_SECRET', { infer: true });
    // Version figée : évite qu'une mise à jour de Stripe change silencieusement la forme des événements.
    this.stripe = secretKey ? new Stripe(secretKey, { apiVersion: '2026-08-26.dahlia' }) : undefined;
  }

  get isConfigured(): boolean {
    return Boolean(this.stripe && this.webhookSecret);
  }

  /**
   * Session Stripe Checkout pour un achat unique, avec la case de renonciation au droit de
   * rétractation (contenu numérique livré immédiatement, art. L221-28 13° du code de la consommation).
   */
  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) throw new Error('Stripe non configuré.');
    return this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: input.priceId, quantity: 1 }],
      customer_email: input.customerEmail,
      client_reference_id: input.clientReferenceId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      allow_promotion_codes: true,
      consent_collection: { terms_of_service: 'required' },
      custom_text: {
        terms_of_service_acceptance: {
          message:
            "En payant, vous acceptez nos CGV et renoncez expressément à votre droit de rétractation : le contenu numérique est livré immédiatement après le paiement.",
        },
      },
    });
  }

  /** @throws StripeWebhookSignatureError si la signature ou le corps ne correspondent pas au secret configuré. */
  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (!this.stripe || !this.webhookSecret) throw new Error('Stripe non configuré.');
    try {
      return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (error) {
      this.logger.warn(`Signature de webhook Stripe invalide (${(error as Error).message})`);
      throw new StripeWebhookSignatureError('Signature invalide.');
    }
  }
}
