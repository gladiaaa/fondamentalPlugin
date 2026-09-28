import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { type Env, validateEnv } from './config/env.js';
import { initSentry } from './config/sentry.js';

async function bootstrap() {
  // Avant tout le reste (recommandation Sentry) : sans SENTRY_DSN, ne fait rien.
  initSentry(validateEnv(process.env));
  // Logs mis en attente jusqu'à ce que le logger pino soit prêt. rawBody : le webhook Stripe (#24)
  // a besoin du corps brut pour vérifier la signature ; les autres routes gardent le JSON normal.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  configureApp(app);
  const port = app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
}
await bootstrap();
