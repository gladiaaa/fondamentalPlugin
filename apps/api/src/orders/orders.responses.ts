import { ApiProperty } from '@nestjs/swagger';
import type { CheckoutResponse, InvoiceLinkResponse, MyOrder, OrderResponse, OrderStatus } from '@fondamental/shared';

const ORDER_STATUSES = ['PENDING', 'PAID', 'LICENSED', 'REFUNDED'] as const satisfies readonly OrderStatus[];

export class OrderApiResponse implements OrderResponse {
  @ApiProperty({ type: String, enum: ORDER_STATUSES })
  status!: OrderStatus;

  @ApiProperty({ type: String })
  productSlug!: string;

  @ApiProperty({ type: String, nullable: true })
  licenseKey!: string | null;
}

class MyOrderProductApiResponse {
  @ApiProperty({ type: String, example: 'tag' })
  slug!: string;

  @ApiProperty({ type: String, example: 'FondamentalTag' })
  name!: string;
}

export class MyOrderApiResponse implements MyOrder {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: MyOrderProductApiResponse })
  product!: MyOrderProductApiResponse;

  @ApiProperty({ type: Number, description: 'Montant réellement payé, en centimes (code promo compris).' })
  amountCents!: number;

  @ApiProperty({ type: String, example: 'eur' })
  currency!: string;

  @ApiProperty({ type: String, enum: ['PAID', 'LICENSED', 'REFUNDED'] })
  status!: MyOrder['status'];
}

export class InvoiceLinkApiResponse implements InvoiceLinkResponse {
  @ApiProperty({ type: String, description: 'Facture Stripe (page hébergée par Stripe, téléchargeable en PDF).' })
  url!: string;
}

export class CheckoutApiResponse implements CheckoutResponse {
  @ApiProperty({ type: String, description: 'Adresse Stripe Checkout à laquelle rediriger le client.' })
  url!: string;
}
