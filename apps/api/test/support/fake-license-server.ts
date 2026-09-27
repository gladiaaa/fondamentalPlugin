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
export class FakeLicenseServer
  implements Pick<LicenseServerClient, 'isConfigured' | 'get' | 'create' | 'revoke' | 'releaseActivation'>
{
  isConfigured = true;
  private readonly keys = new Map<string, LicenseStatus>();
  /** Clés révoquées par `revoke`, dans l'ordre d'appel : les tests y vérifient l'effet du remboursement. */
  readonly revoked: string[] = [];
  /** `(clé, installationId)` libérés par `releaseActivation`, dans l'ordre d'appel. */
  readonly releasedActivations: Array<{ key: string; installationId: string }> = [];

  /** Déclare une clé existante sur le faux serveur (par défaut : valide, non révoquée). */
  set(key: string, status: Partial<LicenseStatus> = {}): void {
    this.keys.set(key, { product: 'tag', edition: 'PREMIUM', revoked: false, activations: [], ...status });
  }

  /** Retire une clé (simule une suppression côté serveur de licences, entre le rattachement et une lecture). */
  remove(key: string): void {
    this.keys.delete(key);
  }

  /** À appeler entre deux tests : remet le faux serveur à son état initial. */
  reset(): void {
    this.isConfigured = true;
    this.keys.clear();
    this.revoked.length = 0;
    this.releasedActivations.length = 0;
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

  async releaseActivation(key: string, installationId: string): Promise<void> {
    const status = this.keys.get(key);
    if (!status) throw new LicenseNotFoundError('Clé inconnue.');
    const activations = status.activations.filter(
      (activation) => (activation as { installationId?: unknown })?.installationId !== installationId,
    );
    if (activations.length === status.activations.length) throw new LicenseNotFoundError('Installation inconnue.');
    this.keys.set(key, { ...status, activations });
    this.releasedActivations.push({ key, installationId });
  }
}
