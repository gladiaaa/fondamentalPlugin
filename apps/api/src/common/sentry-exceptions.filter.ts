import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

/**
 * Remonte à Sentry les erreurs **inattendues** seulement : une erreur qui n'est pas une `HttpException`
 * (bug non prévu), ou une `HttpException` 5xx (panne réelle, jamais une 4xx : mot de passe faux, corps
 * invalide… ce sont des refus normaux, pas des bugs, et ça noierait Sentry sous du bruit).
 *
 * Sans `SENTRY_DSN` configuré (voir `config/sentry.ts`), `Sentry.captureException` ne fait rien : ce
 * filtre reste actif dans tous les environnements, y compris les tests, sans jamais rien envoyer.
 */
@Catch()
export class SentryExceptionsFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    const isServerError = !(exception instanceof HttpException) || exception.getStatus() >= 500;
    if (isServerError) Sentry.captureException(exception);
    super.catch(exception, host);
  }
}
