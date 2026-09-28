import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { AdminActionEntry, AdminStatsResponse } from '@fondamental/shared';
import { SessionGuard } from '../auth/session.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminGuard } from './admin.guard.js';
import { ListActionsDto } from './admin-stats.dto.js';
import { AdminStatsService, toActionEntry } from './admin-stats.service.js';

/** Tableau de bord et journal des actions admin (#105). Lecture seule. */
@ApiExcludeController()
@Controller('admin')
@UseGuards(SessionGuard, AdminGuard)
export class AdminStatsController {
  constructor(
    private readonly statsService: AdminStatsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('stats')
  stats(): Promise<AdminStatsResponse> {
    return this.statsService.stats();
  }

  /** Journal, du plus récent au plus ancien ; filtrable par cible (`targetType` + `targetId`). */
  @Get('actions')
  async actions(@Query() query: ListActionsDto): Promise<AdminActionEntry[]> {
    const actions = await this.prisma.adminAction.findMany({
      where: { targetType: query.targetType, targetId: query.targetId },
      include: { admin: true },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 50,
    });
    return actions.map(toActionEntry);
  }
}
