import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { Env } from '../config/env.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest();

/**
 * Publication de versions, réservée à la CI des plugins : `Authorization: Bearer <RELEASES_TOKEN>`.
 * Sans `RELEASES_TOKEN` configuré, tout est refusé. Comparaison en temps constant (sur les empreintes,
 * pour que la longueur du jeton ne fuite pas non plus).
 */
@Injectable()
export class AdminTokenGuard implements CanActivate {
  private readonly expected: Buffer | null;

  constructor(config: ConfigService<Env, true>) {
    const token = config.get('RELEASES_TOKEN', { infer: true });
    this.expected = token ? sha256(token) : null;
  }

  canActivate(context: ExecutionContext): boolean {
    const header = context.switchToHttp().getRequest<Request>().headers.authorization;
    const provided = header?.match(/^Bearer (\S+)$/)?.[1];
    if (!this.expected || !provided || !timingSafeEqual(sha256(provided), this.expected)) {
      throw new UnauthorizedException('Jeton de publication invalide.');
    }
    return true;
  }
}
