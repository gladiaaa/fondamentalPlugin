import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import type { AuthContext } from '../auth/auth.decorators.js';
import { AdminGuard } from './admin.guard.js';

function contextWith(auth: Partial<AuthContext>): ExecutionContext {
  const full = {
    user: { role: 'CUSTOMER', totpEnabledAt: null },
    twoFactorVerifiedAt: null,
    ...auth,
  };
  return { switchToHttp: () => ({ getRequest: () => ({ auth: full }) }) } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('autorise : rôle admin, 2FA activée sur le compte, validée pour cette session', () => {
    const ctx = contextWith({
      user: { role: 'ADMIN', totpEnabledAt: new Date() } as AuthContext['user'],
      twoFactorVerifiedAt: new Date(),
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('refuse un compte non admin, même avec 2FA activée et validée', () => {
    const ctx = contextWith({
      user: { role: 'CUSTOMER', totpEnabledAt: new Date() } as AuthContext['user'],
      twoFactorVerifiedAt: new Date(),
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("refuse un admin dont le compte n'a jamais activé la 2FA", () => {
    const ctx = contextWith({
      user: { role: 'ADMIN', totpEnabledAt: null } as AuthContext['user'],
      twoFactorVerifiedAt: null,
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('refuse un admin dont le compte a activé la 2FA mais pas cette session (nouvelle connexion)', () => {
    const ctx = contextWith({
      user: { role: 'ADMIN', totpEnabledAt: new Date() } as AuthContext['user'],
      twoFactorVerifiedAt: null,
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('le refus 2FA porte le code TWO_FACTOR_REQUIRED', () => {
    const ctx = contextWith({ user: { role: 'ADMIN', totpEnabledAt: null } as AuthContext['user'] });
    try {
      guard.canActivate(ctx);
      throw new Error('devait lever');
    } catch (error) {
      expect((error as { getResponse: () => { code?: string } }).getResponse().code).toBe('TWO_FACTOR_REQUIRED');
    }
  });
});
