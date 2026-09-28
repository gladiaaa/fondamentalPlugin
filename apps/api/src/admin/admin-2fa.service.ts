import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { TwoFactorSetupResponse, TwoFactorStatusResponse } from '@fondamental/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { MESSAGES } from './admin.constants.js';
import { generateTotpSecret, totpUri, verifyTotp } from './totp.js';

@Injectable()
export class AdminTwoFactorService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ce que le panel doit afficher : mise en place (première fois) ou simple code (chaque session). */
  async status(userId: string, twoFactorVerifiedAt: Date | null): Promise<TwoFactorStatusResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { enabled: Boolean(user.totpEnabledAt), verifiedForSession: Boolean(twoFactorVerifiedAt) };
  }

  /**
   * Génère un nouveau secret (en attente : `totpEnabledAt` ne change qu'au premier code validé).
   * Rappelable tant que la 2FA n'est pas activée. Une fois activée, seulement depuis une session où elle
   * a été validée : sinon un mot de passe volé suffirait à remplacer le secret, donc à contourner la 2FA.
   */
  async setup(userId: string, email: string, twoFactorVerifiedAt: Date | null): Promise<TwoFactorSetupResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.totpEnabledAt && !twoFactorVerifiedAt) {
      throw new ForbiddenException({ code: 'TWO_FACTOR_ALREADY_ENABLED', message: MESSAGES.totpAlreadyEnabled });
    }
    const secret = generateTotpSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } });
    return { secret, otpauthUrl: totpUri(secret, email) };
  }

  /**
   * Valide un code pour **cette** session (2FA exigée par session, pas une fois pour toutes, #32).
   * Active définitivement la 2FA du compte au premier succès.
   */
  async verify(userId: string, sessionId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.totpSecret) throw new BadRequestException(MESSAGES.totpSetupRequired);
    if (!verifyTotp(user.totpSecret, code)) {
      throw new BadRequestException({ code: 'TOTP_INVALID_CODE', message: MESSAGES.totpInvalidCode });
    }
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.updateMany({ where: { id: userId, totpEnabledAt: null }, data: { totpEnabledAt: now } }),
      this.prisma.session.update({ where: { id: sessionId }, data: { twoFactorVerifiedAt: now } }),
    ]);
  }
}
