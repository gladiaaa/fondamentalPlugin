import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

// L'API complète, configurée comme en production, contre une vraie base.
describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health : 200, base joignable', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ ok: true, database: 'up' });
    expect(typeof res.body.version).toBe('string');
  });

  it('envoie les en-têtes de sécurité (helmet)', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('les routes hors /api ne sont pas servies par l’API', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });

  it('route inconnue : 404 en JSON', async () => {
    const res = await request(app.getHttpServer()).get('/api/inexistant').expect(404);
    expect(res.body).toMatchObject({ statusCode: 404 });
  });
});
