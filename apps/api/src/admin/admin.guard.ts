import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.decorators.js';
import { MESSAGES } from './admin.constants.js';

/**
 * Rôle `admin` **et** 2FA validée pour cette session : toutes les routes `/api/admin/*` sauf
 * `/admin/2fa/setup` et `/admin/2fa/verify` (voir `AdminRoleGuard`). S'utilise après `SessionGuard`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { auth } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (auth.user.role !== 'ADMIN') throw new ForbiddenException(MESSAGES.notAdmin);
    if (!auth.user.totpEnabledAt || !auth.twoFactorVerifiedAt) {
      throw new ForbiddenException({ code: 'TWO_FACTOR_REQUIRED', message: MESSAGES.twoFactorRequired });
    }
    return true;
  }
}
