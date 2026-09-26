import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { PwnedPasswordsService } from '../../src/auth/pwned-passwords.service.js';
import { type MailMessage, Mailer } from '../../src/mail/mailer.js';

/** Origine du site en local : la seule que l'API accepte pour les requêtes qui modifient des données. */
export const ORIGIN = 'http://localhost:3000';

/** Mot de passe que le faux « Pwned Passwords » déclare compromis (aucun appel réseau dans les tests). */
export const COMPROMISED_PASSWORD = 'password123456';
export const STRONG_PASSWORD = 'correct-horse-battery-staple';

/** Boîte d'envoi en mémoire : les tests y lisent les e-mails que l'API aurait envoyés. */
export class InMemoryMailer extends Mailer {
  readonly isConfigured: boolean = true;
  readonly outbox: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.outbox.push(message);
  }

  clear(): void {
    this.outbox.length = 0;
  }

  /** Les e-mails reçus par une adresse, du plus ancien au plus récent. */
  to(email: string): MailMessage[] {
    return this.outbox.filter((mail) => mail.to === email);
  }

  /** Le jeton du lien contenu dans le dernier e-mail reçu par l'adresse. */
  lastToken(email: string): string {
    const mail = this.to(email).at(-1);
    const token = mail?.text.match(/[?&]token=([A-Za-z0-9_-]+)/)?.[1];
    if (!token) throw new Error(`Aucun lien avec jeton pour ${email} (${mail?.subject ?? 'aucun e-mail'})`);
    return token;
  }
}

export async function createTestApp(mailer: Mailer): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Mailer)
    .useValue(mailer)
    .overrideProvider(PwnedPasswordsService)
    .useValue({ isPwned: async (password: string) => password === COMPROMISED_PASSWORD })
    .compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app);
  await app.init();
  return app;
}

let nextIp = 0;

interface RequestOptions {
  /** Remplace l'en-tête Origin ; `null` le supprime. */
  origin?: string | null;
  /** En-tête X-CSRF-Token. */
  csrf?: string;
}

/**
 * Un « navigateur » de test : garde ses cookies d'une requête à l'autre et possède sa propre
 * adresse IP (via X-Forwarded-For, comme derrière nginx), pour que les limites de requêtes des
 * tests ne se mélangent pas.
 */
export function newBrowser(app: INestApplication) {
  nextIp += 1;
  const ip = `203.0.113.${(nextIp % 250) + 1}`;
  const agent = request.agent(app.getHttpServer());

  const prepare = (req: request.Test, { origin = ORIGIN, csrf }: RequestOptions) => {
    req.set('X-Forwarded-For', ip);
    if (origin) req.set('Origin', origin);
    if (csrf) req.set('X-CSRF-Token', csrf);
    return req;
  };

  return {
    ip,
    get: (url: string, options: RequestOptions = {}) => prepare(agent.get(url), options),
    post: (url: string, body: object = {}, options: RequestOptions = {}) =>
      prepare(agent.post(url), options).send(body),
    delete: (url: string, body: object = {}, options: RequestOptions = {}) =>
      prepare(agent.delete(url), options).send(body),
  };
}

export type Browser = ReturnType<typeof newBrowser>;
