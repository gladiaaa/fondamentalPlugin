import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { type Env, validateEnv } from './config/env.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),

    // Logs JSON structurés ; jamais de cookies, jetons ni mots de passe dans les logs.
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              '*.password',
              '*.token',
            ],
            censor: '[masqué]',
          },
          // Lisible en local, JSON sur le serveur.
          transport:
            config.get('APP_ENV', { infer: true }) === 'local'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),

    // Limite par défaut : 100 requêtes par minute et par IP. Les routes
    // sensibles (connexion, inscription…) auront des limites plus strictes.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    PrismaModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
