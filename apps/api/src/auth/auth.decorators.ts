import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../generated/prisma/client.js';

/** Ce que `SessionGuard` attache à la requête. */
export interface AuthContext {
  user: User;
  sessionId: string;
  csrfToken: string;
}
export type AuthenticatedRequest = Request & { auth: AuthContext };

/** Le compte et la session de la requête (route protégée par `SessionGuard`). */
export const Auth = createParamDecorator((_data: unknown, context: ExecutionContext): AuthContext => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
});

export const SKIP_ORIGIN_CHECK = 'skipOriginCheck';
/**
 * Dispense une route du contrôle d'origine. Réservé aux appels de serveur à serveur qui
 * n'ont pas d'en-tête `Origin` (webhook Stripe) et qui s'authentifient autrement (signature).
 */
export const SkipOriginCheck = () => SetMetadata(SKIP_ORIGIN_CHECK, true);
