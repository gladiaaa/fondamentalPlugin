import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SESSION_TTL_MS } from './auth.constants.js';
import { generateToken, hashToken } from './tokens.js';

export interface CreatedSession {
  /** Valeur du cookie : n'existe qu'ici et dans le navigateur, la base ne garde que son empreinte. */
  token: string;
  csrfToken: string;
  expiresAt: Date;
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string): Promise<CreatedSession> {
    const now = new Date();
    const token = generateToken();
    const csrfToken = generateToken();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    // Ménage au passage : les sessions expirées de ce compte n'ont plus d'utilité.
    await this.prisma.session.deleteMany({ where: { userId, expiresAt: { lte: now } } });
    await this.prisma.session.create({ data: { tokenHash: hashToken(token), csrfToken, userId, expiresAt } });
    return { token, csrfToken, expiresAt };
  }

  /** La session (avec son compte) si le jeton est valide, non expiré, et le compte non bloqué (#105). */
  find(token: string) {
    return this.prisma.session.findFirst({
      where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() }, user: { blockedAt: null } },
      include: { user: true },
    });
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  /** Ferme toutes les sessions du compte, sauf `exceptSessionId` (la session courante) si fourni. */
  async revokeAll(userId: string, exceptSessionId?: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    });
  }
}
