import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Journal des actions sensibles du back-office (qui, quoi, quand) : jamais un simple log applicatif,
 * toujours consultable en base (voir #32). `metadata` ne doit jamais contenir de secret.
 */
@Injectable()
export class AdminActionLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(adminId: string, action: string, targetType: string, targetId: string, metadata?: object): Promise<void> {
    await this.prisma.adminAction.create({
      data: { adminId, action, targetType, targetId, metadata: metadata ?? undefined },
    });
  }
}
