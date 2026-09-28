import { Injectable } from '@nestjs/common';
import type { AdminActionEntry, AdminStatsResponse } from '@fondamental/shared';
import { PrismaService } from '../prisma/prisma.service.js';

const DAY_MS = 86_400_000;
const ORDER_STATUSES = ['PENDING', 'PAID', 'LICENSED', 'REFUNDED'] as const;

export function toActionEntry(action: {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: unknown;
  createdAt: Date;
  admin: { email: string };
}): AdminActionEntry {
  return {
    id: action.id,
    adminEmail: action.admin.email,
    action: action.action,
    targetType: action.targetType,
    targetId: action.targetId,
    metadata: action.metadata,
    createdAt: action.createdAt.toISOString(),
  };
}

/** `2026-09-28` (UTC) : clé d'un jour du graphique. */
const day = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Agrégé en mémoire : quelques centaines de commandes au plus pour une boutique de plugins, ce qui reste
   * bien plus lisible que des `groupBy`. À revoir (requêtes agrégées) si le volume change d'ordre de grandeur.
   */
  async stats(now = new Date()): Promise<AdminStatsResponse> {
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 29 * DAY_MS);

    const [sold, statusCounts, products, releases, users, actions] = await Promise.all([
      // Chiffre d'affaires : commandes payées ou livrées, jamais les remboursées.
      this.prisma.order.findMany({
        where: { status: { in: ['PAID', 'LICENSED'] } },
        select: { productId: true, currency: true, amountCents: true, createdAt: true },
      }),
      Promise.all(ORDER_STATUSES.map((status) => this.prisma.order.count({ where: { status } }))),
      this.prisma.product.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, slug: true, name: true } }),
      this.prisma.release.findMany({ select: { productId: true, files: { select: { downloadCount: true } } } }),
      Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
        this.prisma.user.count({ where: { role: 'ADMIN' } }),
        this.prisma.user.count({ where: { blockedAt: { not: null } } }),
      ]),
      this.prisma.adminAction.findMany({ include: { admin: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    const revenue = new Map<string, { totalCents: number; last30DaysCents: number }>();
    const byProduct = new Map<string, { sales: number; revenueCents: number }>();
    const perDay = new Map<string, { sales: number; revenueCents: number }>();
    for (let i = 0; i < 30; i++) perDay.set(day(new Date(since.getTime() + i * DAY_MS)), { sales: 0, revenueCents: 0 });

    for (const order of sold) {
      const recent = order.createdAt >= since;
      const r = revenue.get(order.currency) ?? { totalCents: 0, last30DaysCents: 0 };
      r.totalCents += order.amountCents;
      if (recent) r.last30DaysCents += order.amountCents;
      revenue.set(order.currency, r);

      const p = byProduct.get(order.productId) ?? { sales: 0, revenueCents: 0 };
      p.sales += 1;
      p.revenueCents += order.amountCents;
      byProduct.set(order.productId, p);

      const point = recent ? perDay.get(day(order.createdAt)) : undefined;
      if (point) {
        point.sales += 1;
        point.revenueCents += order.amountCents;
      }
    }

    const downloads = new Map<string, number>();
    for (const release of releases) {
      const total = release.files.reduce((sum, file) => sum + file.downloadCount, 0);
      downloads.set(release.productId, (downloads.get(release.productId) ?? 0) + total);
    }

    const [pending, paid, licensed, refunded] = statusCounts;
    return {
      revenue: [...revenue].map(([currency, r]) => ({ currency, ...r })),
      orders: { licensed, paid, pending, refunded },
      products: products.map((product) => ({
        slug: product.slug,
        name: product.name,
        sales: byProduct.get(product.id)?.sales ?? 0,
        revenueCents: byProduct.get(product.id)?.revenueCents ?? 0,
        downloads: downloads.get(product.id) ?? 0,
      })),
      salesLast30Days: [...perDay].map(([date, point]) => ({ date, ...point })),
      users: { total: users[0], verified: users[1], admins: users[2], blocked: users[3] },
      recentActions: actions.map(toActionEntry),
    };
  }
}
