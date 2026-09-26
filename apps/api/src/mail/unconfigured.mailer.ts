import { type MailMessage, Mailer } from './mailer.js';

/** Aucune clé d'envoi configurée : n'envoie rien, et les routes qui en dépendent répondent 503. */
export class UnconfiguredMailer extends Mailer {
  readonly isConfigured = false;

  async send(_message: MailMessage): Promise<void> {
    throw new Error("Envoi d'e-mails non configuré (RESEND_API_KEY manquante)");
  }
}
