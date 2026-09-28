import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AdminUserDetail, AdminUserSummary } from '@fondamental/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminActionLogService } from './admin-action-log.service.js';
import { MESSAGES } from './admin.constants.js';
import type { UpdateUserDto } from './admin-users.dto.js';

const WITH_COUNTS = { _count: { select: { orders: true, licenses: true } } } as const;

function toSummary(user: {
  id: string;
  email: string;
  role: AdminUserSummary['role'];
  emailVerifiedAt: Date | null;
  blockedAt: Date | null;
  totpEnabledAt: Date | null;
  createdAt: Date;
  _count: { orders: number; licenses: number };
}): AdminUserSummary {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    blockedAt: user.blockedAt?.toISOString() ?? null,
    twoFactorEnabled: Boolean(user.totpEnabledAt),
    createdAt: user.createdAt.toISOString(),
    ordersCount: user._count.orders,
    licensesCount: user._count.licenses,
  };
}

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AdminActionLogService,
  ) {}

  /** Les 100 comptes les plus récents dont l'adresse contient `q` (ou tous si `q` est vide). */
  async search(q?: string): Promise<AdminUserSummary[]> {
    const users = await this.prisma.user.findMany({
      where: q ? { email: { contains: q.trim().toLowerCase(), mode: 'insensitive' } } : undefined,
      include: WITH_COUNTS,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return users.map(toSummary);
  }

  async detail(id: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        ...WITH_COUNTS,
        orders: { include: { product: true }, orderBy: { createdAt: 'desc' } },
        licenses: { include: { order: { include: { product: true } } }, orderBy: { claimedAt: 'desc' } },
      },
    });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: MESSAGES.userNotFound });
    return {
      ...toSummary(user),
      orders: user.orders.map((order) => ({
        id: order.id,
        status: order.status,
        productSlug: order.product.slug,
        userEmail: user.email,
        amountCents: order.amountCents,
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
      })),
      licenses: user.licenses.map((license) => ({
        key: license.licenseKey,
        productSlug: license.order?.product.slug ?? null,
        orderId: license.orderId,
        claimedAt: license.claimedAt.toISOString(),
      })),
    };
  }

  /**
   * Rôle et blocage. Un admin ne peut pas se modifier lui-même (il se retirerait l'accès). Bloquer
   * ferme toutes les sessions du compte ; le passer client ferme aussi ses sessions, pour qu'aucun
   * onglet admin ne reste ouvert.
   */
  async update(adminId: string, id: string, patch: UpdateUserDto): Promise<AdminUserDetail> {
    if (id === adminId && (patch.role !== undefined || patch.blocked !== undefined)) {
      throw new BadRequestException({ code: 'CANNOT_MODIFY_SELF', message: MESSAGES.cannotModifySelf });
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: MESSAGES.userNotFound });

    if (patch.role !== undefined && patch.role !== user.role) {
      await this.prisma.$transaction([
        this.prisma.user.update({ where: { id }, data: { role: patch.role } }),
        ...(patch.role === 'CUSTOMER' ? [this.prisma.session.deleteMany({ where: { userId: id } })] : []),
      ]);
      await this.auditLog.log(adminId, 'user.role', 'user', id, { before: user.role, after: patch.role });
    }

    if (patch.blocked !== undefined && patch.blocked !== Boolean(user.blockedAt)) {
      await this.prisma.$transaction([
        this.prisma.user.update({ where: { id }, data: { blockedAt: patch.blocked ? new Date() : null } }),
        ...(patch.blocked ? [this.prisma.session.deleteMany({ where: { userId: id } })] : []),
      ]);
      await this.auditLog.log(adminId, patch.blocked ? 'user.block' : 'user.unblock', 'user', id);
    }

    return this.detail(id);
  }
}
