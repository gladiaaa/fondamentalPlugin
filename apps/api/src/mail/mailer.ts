export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  /** Version HTML (#26), envoyée avec le texte brut quand elle existe. */
  html?: string;
}

/**
 * Envoi d'e-mails. Classe abstraite : elle sert aussi de jeton d'injection,
 * ce qui permet de la remplacer dans les tests.
 */
export abstract class Mailer {
  /** `false` si aucun envoi n'est possible (clé manquante) : les routes qui en dépendent répondent 503. */
  abstract readonly isConfigured: boolean;
  abstract send(message: MailMessage): Promise<void>;
}
