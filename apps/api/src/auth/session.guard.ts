import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { MESSAGES } from './auth.constants.js';
import type { AuthenticatedRequest } from './auth.decorators.js';
import { isSecureEnv, readCookie, sessionCookieName } from './session-cookie.js';
import { SessionService } from './session.service.js';
import { safeEqual } from './tokens.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Protège une route : il faut une session valide. Sur les requêtes qui modifient des données,
 * le jeton `X-CSRF-Token` de la session est aussi exigé (seconde couche anti-CSRF, après `OriginGuard`).
 */
@Injectable()
export class SessionGuard implements CanActivate {
  private readonly cookieName: string;

  constructor(
    private readonly sessions: SessionService,
    config: ConfigService<Env, true>,
  ) {
    this.cookieName = sessionCookieName(isSecureEnv(config.get('APP_ENV', { infer: true })));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(request.headers.cookie, this.cookieName);
    const session = token ? await this.sessions.find(token) : null;
    if (!session) throw new UnauthorizedException(MESSAGES.notAuthenticated);

    if (!SAFE_METHODS.has(request.method)) {
      const header = request.headers['x-csrf-token'];
      if (typeof header !== 'string' || !safeEqual(header, session.csrfToken)) {
        throw new ForbiddenException(MESSAGES.csrf);
      }
    }

    request.auth = {
      user: session.user,
      sessionId: session.id,
      csrfToken: session.csrfToken,
      twoFactorVerifiedAt: session.twoFactorVerifiedAt,
    };
    return true;
  }
}
