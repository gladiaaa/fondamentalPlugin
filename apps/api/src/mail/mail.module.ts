import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { LogMailer } from './log.mailer.js';
import { Mailer } from './mailer.js';
import { ResendMailer } from './resend.mailer.js';
import { UnconfiguredMailer } from './unconfigured.mailer.js';

@Module({
  providers: [
    {
      provide: Mailer,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): Mailer => {
        const apiKey = config.get('RESEND_API_KEY', { infer: true });
        if (apiKey) return new ResendMailer(apiKey, config.get('MAIL_FROM', { infer: true }));
        if (config.get('APP_ENV', { infer: true }) === 'local') return new LogMailer();
        new Logger('Mail').warn("RESEND_API_KEY absente : l'inscription et la réinitialisation répondront 503");
        return new UnconfiguredMailer();
      },
    },
  ],
  exports: [Mailer],
})
export class MailModule {}
