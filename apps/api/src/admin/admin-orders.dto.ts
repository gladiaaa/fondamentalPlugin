import { IsEmail, IsIn, IsOptional } from 'class-validator';
import type { OrderStatus } from '@fondamental/shared';

const ORDER_STATUSES = ['PENDING', 'PAID', 'LICENSED', 'REFUNDED'] as const satisfies readonly OrderStatus[];

export class SearchOrdersDto {
  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: OrderStatus;

  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  email?: string;
}
