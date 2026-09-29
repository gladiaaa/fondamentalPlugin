import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LicensesModule } from '../licenses/licenses.module.js';
import { MailModule } from '../mail/mail.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { StripeClient } from './stripe-client.js';
import { StripeWebhookController } from './stripe-webhook.controller.js';

@Module({
  imports: [AuthModule, LicensesModule, MailModule],
  controllers: [OrdersController, StripeWebhookController],
  providers: [OrdersService, StripeClient],
  // `OrdersService` : réutilisé par le back-office (#32) pour le remboursement admin.
  exports: [OrdersService],
})
export class OrdersModule {}
