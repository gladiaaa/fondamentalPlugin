import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  // Logs mis en attente jusqu'à ce que le logger pino soit prêt.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureApp(app);
  const port = app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
}
await bootstrap();
