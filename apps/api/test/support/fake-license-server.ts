import { randomUUID } from 'node:crypto';
import {
  type CreateLicenseInput,
  type CreatedLicense,
  LicenseNotFoundError,
  type LicenseServerClient,
  type LicenseStatus,
} from '../../src/licenses/license-server-client.js';

/**
 * Faux serveur de licences pour les tests e2e : pas d'appel réseau, comportement dicté par le test
 * (`set`/`unset`/`configured`). Remplace `LicenseServerClient` via `overrideProvider` dans les tests.
 */
export class FakeLicenseServer implements Pick<LicenseServerClient, 'isConfigured' | 'get' | 'create' | 'revoke'> {
  isConfigured = true;
  private readonly keys = new Map<string, LicenseStatus>();
  /** Clés révoquées par `revoke`, dans l'ordre d'appel : les tests y vérifient l'effet du remboursement. */
  readonly revoked: string[] = [];

  /** Déclare une clé existante sur le faux serveur (par défaut : valide, non révoquée). */
  set(key: string, status: Partial<LicenseStatus> = {}): void {
    this.keys.set(key, { product: 'tag', edition: 'PREMIUM', revoked: false, activations: [], ...status });
  }

  async get(key: string): Promise<LicenseStatus> {
    const status = this.keys.get(key);
    if (!status) throw new LicenseNotFoundError('Clé inconnue.');
    return status;
  }

  async create(input: CreateLicenseInput): Promise<CreatedLicense> {
    const key = `FAKE-${randomUUID()}`;
    this.set(key, { product: input.product, edition: input.edition });
    return { key };
  }

  async revoke(key: string): Promise<void> {
    const status = this.keys.get(key);
    if (!status) throw new LicenseNotFoundError('Clé inconnue.');
    this.keys.set(key, { ...status, revoked: true });
    this.revoked.push(key);
  }
}
