import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { ApiHealthResponse } from '@fondamental/shared';
import type { Response } from 'express';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Point de contrôle vérifié après chaque déploiement : 200 si tout va bien,
// 503 si la base ne répond pas (le déploiement revient alors en arrière).
@ApiTags('santé')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  @ApiOperation({ summary: "État de l'API et de sa base" })
  async check(@Res({ passthrough: true }) res: Response): Promise<ApiHealthResponse> {
    const databaseUp = await this.prisma.isHealthy();
    res.status(databaseUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return {
      ok: databaseUp,
      version: this.config.get('APP_VERSION', { infer: true }),
      database: databaseUp ? 'up' : 'down',
    };
  }
}
