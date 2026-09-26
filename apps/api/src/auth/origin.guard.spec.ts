import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { SkipOriginCheck } from './auth.decorators.js';
import { allowedOrigins, OriginGuard, requestOrigin } from './origin.guard.js';

class Handlers {
  ordinary() {}

  @SkipOriginCheck()
  webhook() {}
}

function makeGuard(siteUrl: string, appEnv: 'local' | 'dev' | 'prod') {
  const config = { get: (key: string) => ({ SITE_URL: siteUrl, APP_ENV: appEnv })[key] };
  return new OriginGuard(config as unknown as ConfigService<never, true>, new Reflector());
}

/** Une méthode de `Handlers` (avec ses métadonnées de décorateur), sans la détacher de son objet. */
const method = (name: 'ordinary' | 'webhook') =>
  Object.getOwnPropertyDescriptor(Handlers.prototype, name)!.value as () => void;

function contextFor(
  httpMethod: string,
  headers: Record<string, string>,
  handler: () => void = method('ordinary'),
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ method: httpMethod, headers }) }),
    getHandler: () => handler,
    getClass: () => Handlers,
  } as unknown as ExecutionContext;
}

describe('allowedOrigins', () => {
  it('en production : uniquement le site', () => {
    expect([...allowedOrigins('https://fondamentalplugin.fr', 'prod')]).toEqual(['https://fondamentalplugin.fr']);
  });

  it('en local : aussi le serveur de développement du site', () => {
    const origins = allowedOrigins('http://localhost:3000', 'local');
    expect(origins.has('http://localhost:3000')).toBe(true);
    expect(origins.has('http://127.0.0.1:3000')).toBe(true);
  });

  it("ne dépend pas d'un éventuel chemin dans l'adresse du site", () => {
    expect([...allowedOrigins('https://dev.fondamentalplugin.fr/accueil', 'dev')]).toEqual([
      'https://dev.fondamentalplugin.fr',
    ]);
  });
});

describe('requestOrigin', () => {
  it("préfère l'en-tête Origin", () => {
    expect(requestOrigin({ origin: 'https://a.example', referer: 'https://b.example/x' })).toBe('https://a.example');
  });

  it("se rabat sur l'origine du Referer", () => {
    expect(requestOrigin({ referer: 'https://b.example/chemin?x=1' })).toBe('https://b.example');
  });

  it('ignore un Referer illisible ou absent', () => {
    expect(requestOrigin({ referer: 'pas une url' })).toBeUndefined();
    expect(requestOrigin({})).toBeUndefined();
  });
});

describe('OriginGuard', () => {
  const prod = makeGuard('https://fondamentalplugin.fr', 'prod');

  it.each(['GET', 'HEAD', 'OPTIONS'])('laisse passer %s sans contrôle', (httpMethod) => {
    expect(prod.canActivate(contextFor(httpMethod, {}))).toBe(true);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])("%s : accepte l'origine du site", (httpMethod) => {
    expect(prod.canActivate(contextFor(httpMethod, { origin: 'https://fondamentalplugin.fr' }))).toBe(true);
  });

  it.each([
    ['sans origine', {}],
    ['autre site', { origin: 'https://evil.example' }],
    ['origine « null »', { origin: 'null' }],
    ['sous-domaine du site', { origin: 'https://dev.fondamentalplugin.fr' }],
    ['même nom, autre schéma', { origin: 'http://fondamentalplugin.fr' }],
    ['même nom, autre port', { origin: 'https://fondamentalplugin.fr:8443' }],
    ['préfixe trompeur', { origin: 'https://fondamentalplugin.fr.evil.example' }],
  ])('POST refusé : %s', (_nom, headers) => {
    expect(() => prod.canActivate(contextFor('POST', headers))).toThrow(ForbiddenException);
  });

  it('accepte le Referer du site quand Origin est absent', () => {
    expect(prod.canActivate(contextFor('POST', { referer: 'https://fondamentalplugin.fr/compte' }))).toBe(true);
  });

  it("@SkipOriginCheck dispense une route (webhook serveur à serveur), pas les autres", () => {
    expect(prod.canActivate(contextFor('POST', {}, method('webhook')))).toBe(true);
    expect(() => prod.canActivate(contextFor('POST', {}, method('ordinary')))).toThrow(ForbiddenException);
  });
});
