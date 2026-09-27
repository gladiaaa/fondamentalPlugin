import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;

/** Ce qu'un nettoyage a supprimé. */
export interface PurgeResult {
  sessions: number;
  emailTokens: number;
}

/**
 * Supprime ce qui n'a plus d'utilité : sessions expirées, liens d'e-mail périmés ou utilisés depuis plus
 * d'un jour (un lien utilisé récemment reste, il sert au délai minimal entre deux e-mails).
 * Ne touche jamais une session ou un lien encore valable.
 */
@Injectable()
export class CleanupService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CleanupService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap(): void {
    // Pas de tâche de fond pendant les tests : ils appellent `purgeExpired` eux-mêmes.
    if (process.env['NODE_ENV'] === 'test') return;
    this.timer = setInterval(() => void this.run(), HOUR_MS);
    this.timer.unref(); // ne retient pas le processus à l'arrêt
    void this.run();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  async purgeExpired(now: Date = new Date()): Promise<PurgeResult> {
    const sessions = await this.prisma.session.deleteMany({ where: { expiresAt: { lte: now } } });
    const emailTokens = await this.prisma.emailToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lte: now } }, { usedAt: { lte: new Date(now.getTime() - DAY_MS) } }],
      },
    });
    return { sessions: sessions.count, emailTokens: emailTokens.count };
  }

  /** Une erreur (base indisponible) est journalisée : elle ne doit jamais faire tomber l'API. */
  private async run(): Promise<void> {
    try {
      const { sessions, emailTokens } = await this.purgeExpired();
      if (sessions + emailTokens > 0) {
        this.logger.log(`Nettoyage : ${sessions} session(s) et ${emailTokens} lien(s) d'e-mail supprimés`);
      }
    } catch (error) {
      this.logger.warn(`Nettoyage impossible : ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
