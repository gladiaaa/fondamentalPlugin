import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import type { Env } from './config/env.js';

// Réglages communs à l'API en production et dans les tests e2e,
// pour que les tests vérifient exactement ce qui tourne en ligne.
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.useLogger(app.get(Logger));
  // Toutes les routes sous /api : nginx y envoie les requêtes, le reste va au site.
  app.setGlobalPrefix('api');
  // Derrière nginx sur la même machine : l'IP réelle du client vient de X-Forwarded-For.
  (app as NestExpressApplication).set('trust proxy', 'loopback');
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // retire les champs non déclarés…
      forbidNonWhitelisted: true, // …et refuse la requête qui en contient
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  // Documentation interactive de l'API, jamais en production.
  if (config.get('APP_ENV', { infer: true }) !== 'prod') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('API Fondamental Plugin')
        .setVersion(config.get('APP_VERSION', { infer: true }))
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document);
  }
}
