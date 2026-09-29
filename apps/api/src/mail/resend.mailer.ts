import { type MailMessage, Mailer } from './mailer.js';

/** Envoi via l'API HTTP de Resend (https://resend.com/docs/api-reference/emails/send-email). */
export class ResendMailer extends Mailer {
  readonly isConfigured = true;

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {
    super();
  }

  async send(message: MailMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      // Le statut seulement : le corps de la réponse peut contenir l'adresse du destinataire.
      throw new Error(`Resend a répondu ${response.status}`);
    }
  }
}
