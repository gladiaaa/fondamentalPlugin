import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module.js';
import { OriginGuard } from './auth/origin.guard.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { type Env, validateEnv } from './config/env.js';
import { LOG_REDACT } from './config/logging.js';
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
          redact: LOG_REDACT,
          // Lisible en local, JSON sur le serveur.
          transport:
            config.get('APP_ENV', { infer: true }) === 'local'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),

    // Limite par défaut : 100 requêtes par minute et par IP. Les routes sensibles
    // (connexion, inscription…) déclarent des limites plus strictes avec @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    PrismaModule,
    AuthModule,
    CatalogModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Anti-CSRF : toute requête qui modifie des données doit venir de notre site.
    { provide: APP_GUARD, useClass: OriginGuard },
  ],
})
export class AppModule {}
