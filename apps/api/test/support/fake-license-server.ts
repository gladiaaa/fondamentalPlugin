import { randomUUID } from 'node:crypto';
import {
  type CreateLicenseInput,
  type CreatedLicense,
  LicenseNotFoundError,
  type LicenseServerClient,
  type LicenseActivationStatus,
  type LicenseStatus,
} from '../../src/licenses/license-server-client.js';

/** Installation de test : seules les dates changent d'un test à l'autre, on les fixe. */
export function activation(installationId: string): LicenseActivationStatus {
  return { installationId, firstSeenAt: '2026-09-01T10:00:00.000Z', lastSeenAt: '2026-09-28T08:00:00.000Z' };
}

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
  /** Appelé au début de `create` : simule ce qui se passe ailleurs pendant l'appel (livraison concurrente). */
  beforeCreate?: () => Promise<void>;

  /** Déclare une clé existante sur le faux serveur (par défaut : valide, non révoquée). */
  set(key: string, status: Partial<LicenseStatus> = {}): void {
    this.keys.set(key, {
      product: 'tag',
      edition: 'PREMIUM',
      revoked: false,
      expiresAt: null,
      maxActivations: 1,
      activations: [],
      ...status,
    });
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
    this.beforeCreate = undefined;
  }

  async get(key: string): Promise<LicenseStatus> {
    const status = this.keys.get(key);
    if (!status) throw new LicenseNotFoundError('Clé inconnue.');
    return status;
  }

  async create(input: CreateLicenseInput): Promise<CreatedLicense> {
    await this.beforeCreate?.();
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
    const activations = status.activations.filter((activation) => activation.installationId !== installationId);
    if (activations.length === status.activations.length) throw new LicenseNotFoundError('Installation inconnue.');
    this.keys.set(key, { ...status, activations });
    this.releasedActivations.push({ key, installationId });
  }
}
