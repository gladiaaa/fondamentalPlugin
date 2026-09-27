import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LicensesModule } from '../licenses/licenses.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { StripeClient } from './stripe-client.js';
import { StripeWebhookController } from './stripe-webhook.controller.js';

@Module({
  imports: [AuthModule, LicensesModule],
  controllers: [OrdersController, StripeWebhookController],
  providers: [OrdersService, StripeClient],
})
export class OrdersModule {}
