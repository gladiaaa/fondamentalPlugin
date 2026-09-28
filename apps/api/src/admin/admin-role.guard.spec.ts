import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import type { AuthContext } from '../auth/auth.decorators.js';
import { AdminRoleGuard } from './admin-role.guard.js';

function contextWith(role: 'ADMIN' | 'CUSTOMER'): ExecutionContext {
  const auth = { user: { role } } as unknown as AuthContext;
  return { switchToHttp: () => ({ getRequest: () => ({ auth }) }) } as unknown as ExecutionContext;
}

describe('AdminRoleGuard', () => {
  const guard = new AdminRoleGuard();

  it('autorise le rôle admin, même sans 2FA (ce sont ces routes qui la mettent en place)', () => {
    expect(guard.canActivate(contextWith('ADMIN'))).toBe(true);
  });

  it('refuse un compte client', () => {
    expect(() => guard.canActivate(contextWith('CUSTOMER'))).toThrow(ForbiddenException);
  });
});
