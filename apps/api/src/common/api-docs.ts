import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiProperty, ApiPropertyOptional, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import type { ApiError } from '@fondamental/shared';

// Documentation OpenAPI : les types sont toujours déclarés explicitement (`type: …`)
// pour que `openapi.json` soit identique quel que soit l'outil qui compile le code.

/** Nom des schémas de sécurité déclarés dans `openapi.ts`. */
export const SESSION_SCHEME = 'session';
export const CSRF_SCHEME = 'csrf';

const ERROR_CODES = [
  'EMAIL_NOT_VERIFIED',
  'PASSWORD_COMPROMISED',
  'INVALID_LINK',
  'CURRENT_PASSWORD_INVALID',
  'NO_PASSWORD',
  'SAME_PASSWORD',
] as const satisfies readonly NonNullable<ApiError['code']>[];

/** Corps de toutes les erreurs de l'API (voir `ApiError` dans `@fondamental/shared`). */
export class ApiErrorResponse implements ApiError {
  @ApiProperty({ type: Number, example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    description: 'Texte affichable. Un tableau (un texte par champ invalide) pour les erreurs de validation.',
  })
  message!: string | string[];

  @ApiPropertyOptional({ type: String, example: 'Bad Request' })
  error?: string;

  @ApiPropertyOptional({
    type: String,
    enum: ERROR_CODES,
    description: 'Présent pour les erreurs que le site doit distinguer.',
  })
  code?: ApiError['code'];
}

const ERROR_DESCRIPTIONS: Record<number, string> = {
  400: 'Requête invalide (validation, lien expiré, mot de passe refusé…). Voir `code`.',
  401: 'Pas de session, ou identifiants incorrects.',
  403: 'Origine refusée, jeton CSRF absent ou faux, ou adresse non confirmée (`EMAIL_NOT_VERIFIED`).',
  404: 'Ressource introuvable (ou pas accessible à ce compte).',
  429: 'Trop de requêtes : réessayer plus tard.',
  503: 'Service momentanément indisponible (envoi d’e-mails, base de données).',
};

/** Déclare les erreurs possibles d'une route. */
export const ApiErrors = (...statuses: number[]) =>
  applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({ status, type: ApiErrorResponse, description: ERROR_DESCRIPTIONS[status] ?? 'Erreur.' }),
    ),
  );

/**
 * Route qui exige une session : cookie de session, et pour les requêtes qui modifient
 * des données l'en-tête `X-CSRF-Token`.
 */
export const ApiSession = () =>
  applyDecorators(ApiCookieAuth(SESSION_SCHEME), ApiSecurity(CSRF_SCHEME), ApiErrors(401, 403));
