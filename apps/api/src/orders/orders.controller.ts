import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CheckoutResponse, OrderResponse } from '@fondamental/shared';
import { ApiErrors, ApiSession } from '../common/api-docs.js';
import { Auth, type AuthContext } from '../auth/auth.decorators.js';
import { SessionGuard } from '../auth/session.guard.js';
import { CheckoutDto } from './orders.dto.js';
import { THROTTLE } from './orders.constants.js';
import { CheckoutApiResponse, OrderApiResponse } from './orders.responses.js';
import { OrdersService } from './orders.service.js';

@ApiTags('commandes')
@Controller()
@UseGuards(SessionGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('checkout')
  @Throttle({ default: THROTTLE.checkout })
  @ApiOperation({
    summary: 'Acheter un plugin',
    description: 'Crée la commande et une session Stripe Checkout. Le client doit être redirigé vers `url`.',
  })
  @ApiSession()
  @ApiErrors(400, 503)
  @ApiResponse({ status: 201, type: CheckoutApiResponse })
  async checkout(@Auth() auth: AuthContext, @Body() dto: CheckoutDto): Promise<CheckoutResponse> {
    return this.orders.checkout(auth.user.id, auth.user.email, dto.productSlug);
  }

  @Get('orders/by-session/:sessionId')
  @ApiOperation({
    summary: "Statut d'une commande",
    description: "Pour la page /merci, jusqu'à ce que la clé soit prête (le webhook Stripe est asynchrone).",
  })
  @ApiSession()
  @ApiErrors(404)
  @ApiResponse({ status: 200, type: OrderApiResponse })
  async bySessionId(@Auth() auth: AuthContext, @Param('sessionId') sessionId: string): Promise<OrderResponse> {
    return this.orders.getBySessionId(auth.user.id, sessionId);
  }
}
