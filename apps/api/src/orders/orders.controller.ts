import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CheckoutResponse, InvoiceLinkResponse, MyOrder, OrderResponse } from '@fondamental/shared';
import { ApiErrors, ApiSession } from '../common/api-docs.js';
import { Auth, type AuthContext } from '../auth/auth.decorators.js';
import { SessionGuard } from '../auth/session.guard.js';
import { CheckoutDto } from './orders.dto.js';
import { THROTTLE } from './orders.constants.js';
import { CheckoutApiResponse, InvoiceLinkApiResponse, MyOrderApiResponse, OrderApiResponse } from './orders.responses.js';
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

  @Get('me/orders')
  @ApiOperation({
    summary: 'Mes commandes',
    description: 'Les commandes payées du compte, la plus récente d’abord. Les paiements abandonnés n’y figurent pas.',
  })
  @ApiSession()
  @ApiResponse({ status: 200, type: [MyOrderApiResponse] })
  async myOrders(@Auth() auth: AuthContext): Promise<MyOrder[]> {
    return this.orders.listMine(auth.user.id);
  }

  @Get('me/orders/:id/invoice')
  @ApiOperation({
    summary: 'Facture d’une commande',
    description:
      'L’adresse de la facture Stripe, lue à la demande. Une commande d’un autre compte répond la **même erreur** ' +
      '(404 `ORDER_NOT_FOUND`) qu’une commande inconnue. `INVOICE_NOT_FOUND` : Stripe n’a pas encore créé la facture.',
  })
  @ApiSession()
  @ApiErrors(404, 503)
  @ApiResponse({ status: 200, type: InvoiceLinkApiResponse })
  async invoice(@Auth() auth: AuthContext, @Param('id') id: string): Promise<InvoiceLinkResponse> {
    return this.orders.invoiceUrl(auth.user.id, id);
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
