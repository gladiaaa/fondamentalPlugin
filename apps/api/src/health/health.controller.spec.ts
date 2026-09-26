import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const isHealthy = vi.fn<() => Promise<boolean>>();
  const status = vi.fn();
  const res = { status } as unknown as Response;
  let controller: HealthController;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: { isHealthy } },
        { provide: ConfigService, useValue: { get: () => 'dev-abc1234' } },
      ],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('renvoie 200 et la version quand la base répond', async () => {
    isHealthy.mockResolvedValue(true);
    await expect(controller.check(res)).resolves.toEqual({ ok: true, version: 'dev-abc1234', database: 'up' });
    expect(status).toHaveBeenCalledWith(HttpStatus.OK);
  });

  it('renvoie 503 quand la base ne répond pas', async () => {
    isHealthy.mockResolvedValue(false);
    await expect(controller.check(res)).resolves.toEqual({ ok: false, version: 'dev-abc1234', database: 'down' });
    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });
});
