import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.decorators.js';
import { MESSAGES } from './admin.constants.js';

/**
 * Rôle `admin` uniquement, **sans** exiger la 2FA : réservé aux deux routes qui la mettent en place
 * (`/admin/2fa/setup`, `/admin/2fa/verify`). Toutes les autres routes admin utilisent `AdminGuard`.
 * S'utilise après `SessionGuard` (qui pose `request.auth`).
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { auth } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (auth.user.role !== 'ADMIN') throw new ForbiddenException(MESSAGES.notAdmin);
    return true;
  }
}
