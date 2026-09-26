import { ApiProperty } from '@nestjs/swagger';
import type {
  AccountExport,
  AccountExportSession,
  AuthUser,
  MessageResponse,
  SessionResponse,
} from '@fondamental/shared';

// Formes des réponses, pour la documentation OpenAPI. Les types de référence
// sont dans `@fondamental/shared` : `implements` garde les deux alignés.

export class AuthUserResponse implements AuthUser {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'email', example: 'ada@example.com' })
  email!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

export class SessionApiResponse implements SessionResponse {
  @ApiProperty({ type: AuthUserResponse })
  user!: AuthUserResponse;

  @ApiProperty({
    type: String,
    description:
      'À renvoyer dans l’en-tête `X-CSRF-Token` de chaque requête qui modifie des données tant qu’on est connecté. À garder en mémoire, jamais dans `localStorage` ni dans une URL.',
  })
  csrfToken!: string;
}

export class MessageApiResponse implements MessageResponse {
  @ApiProperty({ type: String })
  message!: string;
}

export class EmailVerifiedApiResponse {
  @ApiProperty({ type: Boolean, example: true })
  emailVerified!: true;
}

export class AccountExportSessionResponse implements AccountExportSession {
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ type: Boolean, description: '`true` pour la session qui a demandé l’export.' })
  current!: boolean;
}

export class AccountExportAccountResponse {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, format: 'email' })
  email!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  emailVerifiedAt!: string | null;

  @ApiProperty({
    type: Boolean,
    description: '`false` pour un compte qui n’utilise que la connexion par un service tiers.',
  })
  hasPassword!: boolean;
}

export class AccountExportApiResponse implements AccountExport {
  @ApiProperty({ type: String, format: 'date-time' })
  exportedAt!: string;

  @ApiProperty({ type: AccountExportAccountResponse })
  account!: AccountExportAccountResponse;

  @ApiProperty({ type: [AccountExportSessionResponse] })
  sessions!: AccountExportSessionResponse[];
}
