import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { Mailer } from '../mail/mailer.js';
import { MESSAGES } from './support.constants.js';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private readonly supportEmail: string;

  constructor(
    private readonly mailer: Mailer,
    config: ConfigService<Env, true>,
  ) {
    this.supportEmail = config.get('SUPPORT_EMAIL', { infer: true });
  }

  /**
   * Transmet le message à l'équipe. Comme `register`/`forgot-password` : la réponse ne détaille jamais
   * si l'envoi à l'équipe a réussi (l'échec est journalisé, pas répercuté sur la réponse au client).
   */
  async contact(input: { subject: string; email: string; licenseKey?: string; message: string }): Promise<void> {
    if (!this.mailer.isConfigured) {
      throw new ServiceUnavailableException(MESSAGES.mailUnavailable);
    }
    const lines = [
      `De : ${input.email}`,
      input.licenseKey ? `Licence concernée : ${input.licenseKey}` : undefined,
      '',
      input.message,
    ].filter((line): line is string => line !== undefined);

    this.mailer
      .send({ to: this.supportEmail, subject: `[Support] ${input.subject}`, text: lines.join('\n') })
      .catch((error: Error) => {
        this.logger.error(`Envoi du message de support échoué : ${error.message}`);
      });
  }
}
