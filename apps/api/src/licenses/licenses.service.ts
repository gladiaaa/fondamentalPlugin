import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { OwnedLicenseResponse } from '@fondamental/shared';
import { LicenseNotFoundError, LicenseServerClient } from './license-server-client.js';
import { MESSAGES } from './licenses.constants.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Erreur Prisma « valeur déjà utilisée » (contrainte d'unicité). */
const UNIQUE_VIOLATION = 'P2002';

/** Ne montre jamais la clé en entier dans un log : seuls ses 4 derniers caractères. */
const redact = (key: string) => `…${key.slice(-4)}`;

@Injectable()
export class LicensesService {
  private readonly logger = new Logger(LicensesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly licenseServer: LicenseServerClient,
  ) {}

  async list(userId: string): Promise<OwnedLicenseResponse[]> {
    const licenses = await this.prisma.license.findMany({
      where: { userId },
      orderBy: { claimedAt: 'desc' },
    });
    return licenses.map((license) => ({
      key: license.licenseKey,
      claimedAt: license.claimedAt.toISOString(),
    }));
  }

  /**
   * Rattache une clé existante au compte. Une clé inconnue, révoquée ou déjà rattachée (à ce compte ou à
   * un autre) reçoit **la même erreur** : on ne révèle jamais laquelle de ces trois raisons s'applique.
   */
  async claim(userId: string, key: string): Promise<void> {
    if (!this.licenseServer.isConfigured) {
      throw new ServiceUnavailableException({ code: 'LICENSE_SERVER_UNAVAILABLE', message: MESSAGES.serverUnavailable });
    }

    let status: Awaited<ReturnType<LicenseServerClient['get']>>;
    try {
      status = await this.licenseServer.get(key);
    } catch (error) {
      if (error instanceof LicenseNotFoundError) this.claimInvalid();
      // Panne du serveur de licences (pas la faute du client) : à distinguer d'une clé invalide.
      throw new ServiceUnavailableException({ code: 'LICENSE_SERVER_UNAVAILABLE', message: MESSAGES.serverUnavailable });
    }
    if (status.revoked) this.claimInvalid();

    try {
      await this.prisma.license.create({ data: { userId, licenseKey: key } });
    } catch (error) {
      // Déjà rattachée (à ce compte ou à un autre) : même réponse qu'une clé inconnue.
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) this.claimInvalid();
      throw error;
    }
    this.logger.log(`Licence rattachée (compte ${userId}, clé ${redact(key)})`);
  }

  private claimInvalid(): never {
    throw new BadRequestException({ code: 'LICENSE_CLAIM_INVALID', message: MESSAGES.claimInvalid });
  }
}
