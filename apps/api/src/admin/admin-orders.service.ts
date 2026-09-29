import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AdminOrderDetail, AdminOrderSummary } from '@fondamental/shared';
import type { Env } from '../config/env.js';
import type { MailLocale } from '../auth/locale.js';
import { Mailer } from '../mail/mailer.js';
import { licenseKeyEmail } from '../mail/templates.js';
import { OrdersService } from '../orders/orders.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminActionLogService } from './admin-action-log.service.js';
import { MESSAGES } from './admin.constants.js';

function toSummary(order: {
  id: string;
  status: AdminOrderSummary['status'];
  amountCents: number;
  currency: string;
  createdAt: Date;
  product: { slug: string };
  user: { email: string } | null;
}): AdminOrderSummary {
  return {
    id: order.id,
    status: order.status,
    productSlug: order.product.slug,
    userEmail: order.user?.email ?? null,
    amountCents: order.amountCents,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
  };
}

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly mailer: Mailer,
    private readonly auditLog: AdminActionLogService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async search(status?: AdminOrderSummary['status'], email?: string): Promise<AdminOrderSummary[]> {
    const orders = await this.prisma.order.findMany({
      where: { status, user: email ? { email } : undefined },
      include: { user: true, product: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return orders.map(toSummary);
  }

  async detail(id: string): Promise<AdminOrderDetail> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { user: true, product: true, license: true },
    });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: MESSAGES.orderNotFound });
    return {
      ...toSummary(order),
      userId: order.userId,
      stripeCheckoutSessionId: order.stripeCheckoutSessionId,
      stripePaymentIntentId: order.stripePaymentIntentId,
      licenseKey: order.license?.licenseKey ?? null,
    };
  }

  /** Rembourse via Stripe et applique l'effet tout de suite (voir `OrdersService.refund`). */
  async refund(adminId: string, id: string): Promise<void> {
    await this.orders.refund(id);
    await this.auditLog.log(adminId, 'order.refund', 'order', id);
  }

  /** Renvoie l'e-mail avec la clé (modèle minimal, #26 le remplacera par un modèle soigné). */
  async resendEmail(adminId: string, id: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { user: true, product: true, license: true },
    });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: MESSAGES.orderNotFound });
    if (!order.license) throw new BadRequestException(MESSAGES.noLicenseYet);
    if (!order.user) throw new BadRequestException(MESSAGES.accountDeleted);
    if (!this.mailer.isConfigured) throw new ServiceUnavailableException(MESSAGES.mailUnavailable);

    const locale: MailLocale = order.user.locale === 'EN' ? 'en' : 'fr';
    await this.mailer.send({
      to: order.user.email,
      ...licenseKeyEmail(
        order.product.name,
        order.license.licenseKey,
        locale,
        `${this.config.get('SITE_URL', { infer: true })}/compte/licences`,
      ),
    });
    await this.auditLog.log(adminId, 'order.resend_email', 'order', id);
  }
}
