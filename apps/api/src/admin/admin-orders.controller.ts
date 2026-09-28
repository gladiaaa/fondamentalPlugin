import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { AdminOrderDetail, AdminOrderSummary } from '@fondamental/shared';
import { Auth, type AuthContext } from '../auth/auth.decorators.js';
import { SessionGuard } from '../auth/session.guard.js';
import { AdminGuard } from './admin.guard.js';
import { SearchOrdersDto } from './admin-orders.dto.js';
import { AdminOrdersService } from './admin-orders.service.js';

@ApiExcludeController()
@Controller('admin/orders')
@UseGuards(SessionGuard, AdminGuard)
export class AdminOrdersController {
  constructor(private readonly orders: AdminOrdersService) {}

  @Get()
  search(@Query() query: SearchOrdersDto): Promise<AdminOrderSummary[]> {
    return this.orders.search(query.status, query.email);
  }

  @Get(':id')
  detail(@Param('id') id: string): Promise<AdminOrderDetail> {
    return this.orders.detail(id);
  }

  @Post(':id/refund')
  @HttpCode(204)
  async refund(@Auth() auth: AuthContext, @Param('id') id: string): Promise<void> {
    await this.orders.refund(auth.user.id, id);
  }

  @Post(':id/resend-email')
  @HttpCode(202)
  async resendEmail(@Auth() auth: AuthContext, @Param('id') id: string): Promise<void> {
    await this.orders.resendEmail(auth.user.id, id);
  }
}
