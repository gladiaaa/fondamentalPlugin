import { BadRequestException, Controller, Get, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as Sentry from '@sentry/node';
import request from 'supertest';
import { SentryExceptionsFilter } from './sentry-exceptions.filter.js';

// Un module ESM ne peut pas être « espionné » directement (vi.spyOn) : on le remplace entièrement.
vi.mock('@sentry/node', () => ({ captureException: vi.fn(() => 'id') }));
const captureException = Sentry.captureException as ReturnType<typeof vi.fn>;

@Controller()
class ThrowingController {
  @Get('http-error')
  httpError(): never {
    throw new BadRequestException('Corps invalide.');
  }

  @Get('crash')
  crash(): never {
    throw new Error('Erreur imprévue, jamais une HttpException.');
  }
}

@Module({
  controllers: [ThrowingController],
  providers: [{ provide: APP_FILTER, useClass: SentryExceptionsFilter }],
})
class TestModule {}

describe('SentryExceptionsFilter', () => {
  beforeEach(() => captureException.mockClear());

  it("ne remonte pas à Sentry une erreur HTTP 4xx (refus normal, pas un bug)", async () => {
    const app = await Test.createTestingModule({ imports: [TestModule] }).compile();
    const nest = app.createNestApplication();
    await nest.init();

    const res = await request(nest.getHttpServer()).get('/http-error');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Corps invalide.');
    expect(captureException).not.toHaveBeenCalled();
    await nest.close();
  });

  it('remonte à Sentry une erreur inattendue, sans en révéler le détail au client', async () => {
    const app = await Test.createTestingModule({ imports: [TestModule] }).compile();
    const nest = app.createNestApplication();
    await nest.init();

    const res = await request(nest.getHttpServer()).get('/crash');

    expect(res.status).toBe(500);
    expect(res.body.message).not.toContain('Erreur imprévue');
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    await nest.close();
  });
});
