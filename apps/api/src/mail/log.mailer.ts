import { Logger } from '@nestjs/common';
import { type MailMessage, Mailer } from './mailer.js';

/**
 * Développement local uniquement : affiche l'e-mail (donc ses liens) dans les logs
 * au lieu de l'envoyer. Jamais utilisé sur dev ni prod : ce sont des secrets.
 */
export class LogMailer extends Mailer {
  readonly isConfigured = true;
  private readonly logger = new Logger('Mail');

  async send(message: MailMessage): Promise<void> {
    this.logger.log(`E-mail (non envoyé, mode local) à ${message.to} : ${message.subject}\n${message.text}`);
  }
}
