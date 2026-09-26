import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Env } from '../config/env.js';
import { MESSAGES } from './auth.constants.js';
import { SKIP_ORIGIN_CHECK } from './auth.decorators.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Origines autorisées à appeler l'API : le site, et en local le serveur de développement du site. */
export function allowedOrigins(siteUrl: string, appEnv: Env['APP_ENV']): Set<string> {
  const origins = new Set([new URL(siteUrl).origin]);
  if (appEnv === 'local') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }
  return origins;
}

/** Origine de la requête : l'en-tête `Origin`, à défaut celle du `Referer`. */
export function requestOrigin(headers: Request['headers']): string | undefined {
  if (typeof headers.origin === 'string') return headers.origin;
  if (typeof headers.referer === 'string') {
    try {
      return new URL(headers.referer).origin;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Protection CSRF, première couche (globale) : toute requête qui modifie des données doit
 * venir de notre site. Les navigateurs envoient `Origin` sur ces requêtes et un site tiers
 * ne peut pas le falsifier. Sans `Origin` ni `Referer`, on refuse.
 * La seconde couche (jeton `X-CSRF-Token`) est dans `SessionGuard`.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowed: Set<string>;

  constructor(
    config: ConfigService<Env, true>,
    private readonly reflector: Reflector,
  ) {
    this.allowed = allowedOrigins(config.get('SITE_URL', { infer: true }), config.get('APP_ENV', { infer: true }));
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;
    if (this.reflector.getAllAndOverride<boolean>(SKIP_ORIGIN_CHECK, [context.getHandler(), context.getClass()])) {
      return true;
    }
    const origin = requestOrigin(request.headers);
    if (!origin || !this.allowed.has(origin)) throw new ForbiddenException(MESSAGES.origin);
    return true;
  }
}
