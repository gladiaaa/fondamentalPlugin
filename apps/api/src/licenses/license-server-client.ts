import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

/**
 * Statut d'une clé sur le serveur de licences (`GET /api/v1/admin/licenses/:key`).
 *
 * ⚠️ Forme **provisoire** : le serveur de licences existant n'a pas encore été relu pour confirmer les
 * noms exacts des champs (voir #22). Elle n'est utilisée nulle part ailleurs que dans ce fichier et
 * `LicenseServerClient.get`, donc un écart avec la vraie réponse se corrige à un seul endroit.
 */
export interface LicenseStatus {
  product: string;
  edition: string;
  revoked: boolean;
  activations: unknown[];
}

export class LicenseServerError extends Error {}

/** La clé n'existe pas sur le serveur de licences. */
export class LicenseNotFoundError extends LicenseServerError {}

/**
 * Client de l'API admin du serveur de licences Fondamental. Ne fait jamais fuiter le jeton dans une
 * erreur ou un log : seul ce fichier le manipule.
 */
@Injectable()
export class LicenseServerClient {
  private readonly logger = new Logger(LicenseServerClient.name);
  private readonly baseUrl?: string;
  private readonly token?: string;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config.get('LICENSE_SERVER_URL', { infer: true });
    this.token = config.get('LICENSE_ADMIN_TOKEN', { infer: true });
  }

  get isConfigured(): boolean {
    return Boolean(this.baseUrl && this.token);
  }

  /** @throws LicenseNotFoundError si la clé n'existe pas, LicenseServerError pour toute autre erreur. */
  async get(key: string): Promise<LicenseStatus> {
    if (!this.baseUrl || !this.token) {
      throw new LicenseServerError('Serveur de licences non configuré.');
    }
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1/admin/licenses/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${this.token}` },
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error) {
      this.logger.warn(`Serveur de licences injoignable (${(error as Error).name})`);
      throw new LicenseServerError('Serveur de licences injoignable.');
    }
    if (response.status === 404) throw new LicenseNotFoundError('Clé inconnue.');
    if (!response.ok) {
      this.logger.warn(`Serveur de licences a répondu ${response.status}`);
      throw new LicenseServerError(`Serveur de licences : réponse ${response.status}.`);
    }
    return (await response.json()) as LicenseStatus;
  }
}
