import { ApiProperty } from '@nestjs/swagger';
import type { CheckoutResponse, OrderResponse, OrderStatus } from '@fondamental/shared';

const ORDER_STATUSES = ['PENDING', 'PAID', 'LICENSED', 'REFUNDED'] as const satisfies readonly OrderStatus[];

export class OrderApiResponse implements OrderResponse {
  @ApiProperty({ type: String, enum: ORDER_STATUSES })
  status!: OrderStatus;

  @ApiProperty({ type: String })
  productSlug!: string;

  @ApiProperty({ type: String, nullable: true })
  licenseKey!: string | null;
}

export class CheckoutApiResponse implements CheckoutResponse {
  @ApiProperty({ type: String, description: 'Adresse Stripe Checkout à laquelle rediriger le client.' })
  url!: string;
}
