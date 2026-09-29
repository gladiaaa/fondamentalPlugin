import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

/** Une installation (un serveur Minecraft) qui consomme une activation. Dates ISO 8601. */
export interface LicenseActivationStatus {
  installationId: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

/** Statut d'une clé sur le serveur de licences, sous une forme propre à l'API (voir `parseStatus`). */
export interface LicenseStatus {
  product: string;
  edition: string;
  revoked: boolean;
  /** Date ISO 8601 d'expiration, ou `null` pour une licence sans limite de durée. */
  expiresAt: string | null;
  maxActivations: number;
  activations: LicenseActivationStatus[];
}

/**
 * Réponse brute de `GET /api/v1/admin/licenses/:key` : la ligne de la table `licenses` du serveur de
 * licences, plus ses installations (`getLicenseStatus` dans license-server/src/license.js).
 */
interface RawLicenseStatus {
  product_id: unknown;
  edition: unknown;
  max_activations: unknown;
  revoked_at: unknown;
  expires_at: unknown;
  activations: unknown;
}

const isDate = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value));

/**
 * Traduit la réponse brute. Une forme inattendue lève `LicenseServerError` : surtout pas de valeur par
 * défaut, une clé révoquée passerait pour valide si `revoked_at` venait à manquer.
 */
function parseStatus(raw: RawLicenseStatus): LicenseStatus {
  const invalid = (field: string) => new LicenseServerError(`Serveur de licences : champ ${field} inattendu.`);
  if (typeof raw.product_id !== 'string') throw invalid('product_id');
  if (typeof raw.edition !== 'string') throw invalid('edition');
  if (typeof raw.max_activations !== 'number') throw invalid('max_activations');
  if (raw.revoked_at !== null && !isDate(raw.revoked_at)) throw invalid('revoked_at');
  if (raw.expires_at !== null && !isDate(raw.expires_at)) throw invalid('expires_at');
  if (!Array.isArray(raw.activations)) throw invalid('activations');
  return {
    product: raw.product_id,
    edition: raw.edition,
    revoked: raw.revoked_at !== null,
    expiresAt: raw.expires_at === null ? null : new Date(raw.expires_at).toISOString(),
    maxActivations: raw.max_activations,
    activations: raw.activations.map((activation: Record<string, unknown>) => {
      const { installation_id: id, first_seen: first, last_seen: last } = activation ?? {};
      if (typeof id !== 'string' || !isDate(first) || !isDate(last)) throw invalid('activations');
      return { installationId: id, firstSeenAt: new Date(first).toISOString(), lastSeenAt: new Date(last).toISOString() };
    }),
  };
}

/**
 * Ce qu'on envoie pour créer une licence (`POST /api/v1/admin/licenses`). `product` doit être l'un des
 * `licenseProduct` connus du serveur de licences (`bedwars`, `crate`, `tagcustom`… voir `Product` en base).
 */
export interface CreateLicenseInput {
  product: string;
  edition: string;
  /** Identifie l'acheteur côté serveur de licences (texte libre, ex. `email (userId)`). */
  customer: string;
  maxActivations: number;
}

/** Réponse de la création (`res.status(201).json({ key })` côté serveur de licences). */
export interface CreatedLicense {
  key: string;
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
    return parseStatus(await this.request<RawLicenseStatus>('GET', `/api/v1/admin/licenses/${encodeURIComponent(key)}`));
  }

  /** Crée une licence après un paiement. N'appelle jamais deux fois pour la même commande (voir #24). */
  async create(input: CreateLicenseInput): Promise<CreatedLicense> {
    return this.request<CreatedLicense>('POST', '/api/v1/admin/licenses', { body: input });
  }

  /** @throws LicenseNotFoundError si la clé n'existe pas, LicenseServerError pour toute autre erreur. */
  async revoke(key: string): Promise<void> {
    await this.request('POST', `/api/v1/admin/licenses/${encodeURIComponent(key)}/revoke`, {
      expectJson: false,
    });
  }

  /** Libère une installation (réinstallation de serveur). @throws LicenseNotFoundError si clé ou installation inconnue. */
  async releaseActivation(key: string, installationId: string): Promise<void> {
    await this.request(
      'DELETE',
      `/api/v1/admin/licenses/${encodeURIComponent(key)}/activations/${encodeURIComponent(installationId)}`,
      { expectJson: false },
    );
  }

  /** @throws LicenseNotFoundError sur 404, LicenseServerError pour toute autre erreur ou panne réseau. */
  private async request<T = void>(
    method: string,
    path: string,
    options: { body?: unknown; expectJson?: boolean } = {},
  ): Promise<T> {
    const { body, expectJson = true } = options;
    if (!this.baseUrl || !this.token) {
      throw new LicenseServerError('Serveur de licences non configuré.');
    }
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
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
    if (!expectJson) return undefined as T;
    return (await response.json()) as T;
  }
}
