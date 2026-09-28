import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  type RawBodyRequest,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import type Stripe from 'stripe';
import { SkipOriginCheck } from '../auth/auth.decorators.js';
import { StripeWebhookSignatureError, StripeClient } from './stripe-client.js';
import { OrdersService } from './orders.service.js';

/**
 * Serveur à serveur (Stripe), pas de compte : authentifié par la signature du corps brut, pas par une
 * session. Exclu de la documentation publique, comme `/admin/releases`.
 */
@ApiExcludeController()
@Controller('stripe')
@SkipOriginCheck()
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripe: StripeClient,
    private readonly orders: OrdersService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: true }> {
    if (!this.stripe.isConfigured) throw new ServiceUnavailableException('Stripe non configuré.');
    if (!signature || !req.rawBody) throw new BadRequestException('Signature manquante.');

    let event: Stripe.Event;
    try {
      event = this.stripe.constructWebhookEvent(req.rawBody, signature);
    } catch (error) {
      if (error instanceof StripeWebhookSignatureError) throw new BadRequestException(error.message);
      throw error;
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.orders.handleCheckoutCompleted(event.data.object);
        break;
      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        if (paymentIntentId) await this.orders.handleChargeRefunded(paymentIntentId);
        break;
      }
      default:
        this.logger.debug(`Événement Stripe ignoré : ${event.type}`);
    }
    return { received: true };
  }
}
