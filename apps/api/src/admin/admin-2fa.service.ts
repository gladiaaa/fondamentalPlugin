import { BadRequestException, Injectable } from '@nestjs/common';
import type { TwoFactorSetupResponse } from '@fondamental/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { MESSAGES } from './admin.constants.js';
import { generateTotpSecret, totpUri, verifyTotp } from './totp.js';

@Injectable()
export class AdminTwoFactorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Génère un nouveau secret (en attente : `totpEnabledAt` ne change qu'au premier code validé).
   * Rappelable : un nouvel appel remplace simplement le secret en attente.
   */
  async setup(userId: string, email: string): Promise<TwoFactorSetupResponse> {
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
