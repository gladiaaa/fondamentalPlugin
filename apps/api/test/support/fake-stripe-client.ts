import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import type { CreateCheckoutSessionInput, StripeClient } from '../../src/orders/stripe-client.js';
import { StripeWebhookSignatureError } from '../../src/orders/stripe-client.js';

/** Signature acceptée par `FakeStripeClient.constructWebhookEvent` : toute autre valeur est refusée. */
export const VALID_SIGNATURE = 'signature-de-test-valide';

/**
 * Faux client Stripe pour les tests e2e : pas d'appel réseau, comportement dicté par le test.
 * Remplace `StripeClient` via `overrideProvider`.
 */
export class FakeStripeClient
  implements Pick<StripeClient, 'isConfigured' | 'createCheckoutSession' | 'constructWebhookEvent'>
{
  isConfigured = true;
  /** `false` : `createCheckoutSession` échoue, comme une panne Stripe. */
  createsSession = true;
  /** La dernière session créée, pour que le test connaisse son id sans le deviner. */
  lastSession?: Stripe.Checkout.Session;

  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<Stripe.Checkout.Session> {
    if (!this.createsSession) throw new Error('Stripe indisponible (simulé).');
    const session = {
      id: `cs_test_${randomUUID()}`,
      url: `https://checkout.stripe.test/${randomUUID()}`,
      client_reference_id: input.clientReferenceId,
    } as Stripe.Checkout.Session;
    this.lastSession = session;
    return session;
  }

  /** Accepte tout corps si la signature vaut `VALID_SIGNATURE`, comme un vrai secret correct le ferait. */
  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (signature !== VALID_SIGNATURE) throw new StripeWebhookSignatureError('Signature invalide.');
    return JSON.parse(rawBody.toString('utf8')) as Stripe.Event;
  }
}
