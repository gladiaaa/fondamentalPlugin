import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { AdminLicenseResponse, RecreatedLicenseResponse } from '@fondamental/shared';
import { LicenseNotFoundError, LicenseServerClient } from '../licenses/license-server-client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminActionLogService } from './admin-action-log.service.js';
import { MESSAGES } from './admin.constants.js';


@Injectable()
export class AdminLicensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly licenseServer: LicenseServerClient,
    private readonly auditLog: AdminActionLogService,
  ) {}

  /** Vue admin : contrairement à `/me/licenses/:key`, aucun filtre par compte. */
  async status(key: string): Promise<AdminLicenseResponse> {
    const status = await this.getStatusOrThrow(key);
    const owned = await this.prisma.license.findUnique({ where: { licenseKey: key } });
    return {
      key,
      edition: status.edition,
      revoked: status.revoked,
      expiresAt: status.expiresAt,
      maxActivations: status.maxActivations,
      activations: status.activations,
      ownerUserId: owned?.userId ?? null,
      claimedAt: owned?.claimedAt.toISOString() ?? null,
    };
  }

  /** Révoque sans remboursement (litige, clé fuitée). Retire aussi la ligne du compte, si elle existe. */
  async revoke(adminId: string, key: string): Promise<void> {
    if (!this.licenseServer.isConfigured) this.serverUnavailable();
    try {
      await this.licenseServer.revoke(key);
    } catch (error) {
      if (error instanceof LicenseNotFoundError) this.notFound();
      this.serverUnavailable();
    }
    await this.prisma.license.deleteMany({ where: { licenseKey: key } });
    await this.auditLog.log(adminId, 'license.revoke', 'license', key);
  }

  /** Révoque l'ancienne clé et en crée une nouvelle pour la même commande (clé fuitée ou perdue). */
  async recreate(adminId: string, key: string): Promise<RecreatedLicenseResponse> {
    const owned = await this.prisma.license.findUnique({
      where: { licenseKey: key },
      include: { user: true, order: { include: { product: true } } },
    });
    if (!owned) this.notFound();
    if (!owned.order) throw new BadRequestException(MESSAGES.licenseNoOrder);
    if (!this.licenseServer.isConfigured) this.serverUnavailable();

    try {
      await this.licenseServer.revoke(key);
    } catch (error) {
      // Déjà révoquée : sans conséquence, on continue quand même à en recréer une.
      if (!(error instanceof LicenseNotFoundError)) this.serverUnavailable();
    }
    const created = await this.licenseServer.create({
      product: owned.order.product.licenseProduct,
      edition: 'PREMIUM',
      customer: `${owned.user.email} (${owned.userId})`,
      maxActivations: owned.order.product.maxActivations,
    });
    await this.prisma.license.update({ where: { id: owned.id }, data: { licenseKey: created.key } });
    await this.auditLog.log(adminId, 'license.recreate', 'license', key, { newKey: created.key });
    return { key: created.key };
  }

  private async getStatusOrThrow(key: string): ReturnType<LicenseServerClient['get']> {
    if (!this.licenseServer.isConfigured) this.serverUnavailable();
    try {
      return await this.licenseServer.get(key);
    } catch (error) {
      if (error instanceof LicenseNotFoundError) this.notFound();
      this.serverUnavailable();
    }
  }

  private notFound(): never {
    throw new NotFoundException({ code: 'LICENSE_NOT_FOUND', message: MESSAGES.licenseNotFound });
  }

  private serverUnavailable(): never {
    throw new ServiceUnavailableException({
      code: 'LICENSE_SERVER_UNAVAILABLE',
      message: MESSAGES.licenseServerUnavailable,
    });
  }
}
