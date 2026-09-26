import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';

/**
 * Refuse les mots de passe qui apparaissent dans des fuites de données connues
 * (API « Pwned Passwords » de Have I Been Pwned).
 *
 * Confidentialité (k-anonymat) : seuls les 5 premiers caractères de l'empreinte SHA-1
 * quittent le serveur ; la comparaison du reste se fait ici.
 * Si le service ne répond pas, on accepte le mot de passe : une panne chez eux ne doit pas
 * empêcher de s'inscrire, et le contrôle reste un filet de sécurité en plus de la longueur minimale.
 */
@Injectable()
export class PwnedPasswordsService {
  private readonly logger = new Logger(PwnedPasswordsService.name);

  async isPwned(password: string): Promise<boolean> {
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    try {
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        // Padding : réponses de taille uniforme, sans lien avec le nombre de résultats.
        headers: { 'Add-Padding': 'true', 'User-Agent': 'fondamentalplugin-api' },
        signal: AbortSignal.timeout(2_000),
      });
      if (!response.ok) {
        this.logger.warn(`Pwned Passwords a répondu ${response.status} : contrôle ignoré`);
        return false;
      }
      return matchesRange(await response.text(), suffix);
    } catch (error) {
      this.logger.warn(`Pwned Passwords injoignable : contrôle ignoré (${(error as Error).name})`);
      return false;
    }
  }
}

/** Cherche le suffixe dans la réponse (`SUFFIXE:NOMBRE` par ligne). Les lignes de padding ont un nombre à 0. */
export function matchesRange(body: string, suffix: string): boolean {
  for (const line of body.split('\n')) {
    const [candidate, count] = line.trim().split(':');
    if (candidate === suffix && Number(count) > 0) return true;
  }
  return false;
}
