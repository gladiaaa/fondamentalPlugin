import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { AdminTokenGuard } from './admin-token.guard.js';

const TOKEN = 'un-jeton-de-publication-de-test-assez-long-1234567890';

function guard(configured: string | undefined) {
  const config = { get: () => configured } as unknown as ConfigService<Env, true>;
  return new AdminTokenGuard(config);
}

function contextWith(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers: authorization ? { authorization } : {} }) }),
  } as unknown as ExecutionContext;
}

describe('AdminTokenGuard', () => {
  it('accepte le bon jeton', () => {
    expect(guard(TOKEN).canActivate(contextWith(`Bearer ${TOKEN}`))).toBe(true);
  });

  it.each([
    ['sans en-tête', undefined],
    ['avec un autre jeton', 'Bearer autre-jeton-autre-jeton-autre-jeton-1234'],
    ['avec le jeton tronqué', `Bearer ${TOKEN.slice(0, -1)}`],
    ['avec le jeton allongé', `Bearer ${TOKEN}x`],
    ['sans le mot Bearer', TOKEN],
    ['avec un autre schéma', `Basic ${TOKEN}`],
    ['avec « bearer » en minuscules', `bearer ${TOKEN}`],
    ['avec un jeton vide', 'Bearer '],
  ])('refuse %s', (_label, header) => {
    expect(() => guard(TOKEN).canActivate(contextWith(header))).toThrow(UnauthorizedException);
  });

  it('refuse TOUT quand aucun jeton n’est configuré, même en présentant un jeton ou une chaîne vide', () => {
    const unconfigured = guard(undefined);
    expect(() => unconfigured.canActivate(contextWith(`Bearer ${TOKEN}`))).toThrow(UnauthorizedException);
    expect(() => unconfigured.canActivate(contextWith('Bearer undefined'))).toThrow(UnauthorizedException);
    expect(() => unconfigured.canActivate(contextWith())).toThrow(UnauthorizedException);
  });
});
