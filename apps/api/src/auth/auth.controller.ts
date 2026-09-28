import { Body, Controller, Get, Headers, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser, MessageResponse, SessionResponse } from '@fondamental/shared';
import type { Request, Response } from 'express';
import { ApiErrors, ApiSession, SESSION_SCHEME } from '../common/api-docs.js';
import type { Env } from '../config/env.js';
import type { User } from '../generated/prisma/client.js';
import { MESSAGES, THROTTLE } from './auth.constants.js';
import { Auth, type AuthContext } from './auth.decorators.js';
import { ChangePasswordDto, EmailDto, LoginDto, RegisterDto, ResetPasswordDto, TokenDto } from './auth.dto.js';
import { EmailVerifiedApiResponse, MessageApiResponse, SessionApiResponse } from './auth.responses.js';
import { AuthService } from './auth.service.js';
import {
  clearedSessionCookieOptions,
  isSecureEnv,
  readCookie,
  sessionCookieName,
  sessionCookieOptions,
} from './session-cookie.js';
import { SessionGuard } from './session.guard.js';

function publicUser(user: User): AuthUser {
  return { id: user.id, email: user.email, createdAt: user.createdAt.toISOString(), role: user.role };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly secure: boolean;
  private readonly cookieName: string;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService<Env, true>,
  ) {
    this.secure = isSecureEnv(config.get('APP_ENV', { infer: true }));
    this.cookieName = sessionCookieName(this.secure);
  }

  // ─── Inscription et confirmation de l'adresse ──────────────────

  @Post('register')
  @HttpCode(202)
  @Throttle({ default: THROTTLE.register })
  @ApiOperation({
    summary: 'Créer un compte',
    description:
      'Envoie un e-mail de confirmation. La réponse est **identique** que l’adresse soit déjà inscrite ou non : ne jamais dire « adresse déjà utilisée ». ' +
      'La langue des e-mails du compte est choisie une fois pour toutes ici, d’après `Accept-Language` (français par défaut).',
  })
  @ApiResponse({ status: 202, type: MessageApiResponse })
  @ApiErrors(400, 403, 429, 503)
  async register(
    @Body() dto: RegisterDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<MessageResponse> {
    await this.auth.register(dto.email, dto.password, acceptLanguage);
    return { message: MESSAGES.registerAccepted };
  }

  /** Appelée par la page du site ouverte depuis le lien de l'e-mail (POST : un simple aperçu du lien ne le consomme pas). */
  @Post('verify-email')
  @HttpCode(200)
  @Throttle({ default: THROTTLE.verifyEmail })
  @ApiOperation({
    summary: 'Confirmer l’adresse e-mail',
    description:
      'Appelée par la page `/verifier-email?token=…` du site. Le lien est valable 24 h et à usage unique.',
  })
  @ApiResponse({ status: 200, type: EmailVerifiedApiResponse })
  @ApiErrors(400, 403, 429)
  async verifyEmail(@Body() dto: TokenDto): Promise<{ emailVerified: true }> {
    await this.auth.verifyEmail(dto.token);
    return { emailVerified: true };
  }

  @Post('resend-verification')
  @HttpCode(202)
  @Throttle({ default: THROTTLE.resendVerification })
  @ApiOperation({
    summary: 'Renvoyer le lien de confirmation',
    description: 'Une minute minimum entre deux envois. Réponse identique que l’adresse existe ou non.',
  })
  @ApiResponse({ status: 202, type: MessageApiResponse })
  @ApiErrors(400, 403, 429, 503)
  async resendVerification(@Body() dto: EmailDto): Promise<MessageResponse> {
    await this.auth.resendVerification(dto.email);
    return { message: MESSAGES.registerAccepted };
  }

  // ─── Session ───────────────────────────────────────────────────

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: THROTTLE.login })
  @ApiOperation({
    summary: 'Se connecter',
    description:
      'Ouvre la session : un cookie `HttpOnly` est posé et le `csrfToken` est renvoyé. **Refusé tant que l’adresse n’est pas confirmée** (403, `EMAIL_NOT_VERIFIED`). Compte bloqué 15 min après 5 échecs, avec la même erreur 401 qu’un mauvais mot de passe.',
  })
  @ApiResponse({ status: 200, type: SessionApiResponse })
  @ApiErrors(400, 401, 403, 429)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<SessionResponse> {
    const { user, session } = await this.auth.login(dto.email, dto.password);
    res.cookie(this.cookieName, session.token, sessionCookieOptions(this.secure, session.expiresAt));
    return { user: publicUser(user), csrfToken: session.csrfToken };
  }

  /** Sans `SessionGuard` : se déconnecter doit toujours fonctionner, même avec une session déjà expirée. */
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Se déconnecter',
    description: 'Fonctionne même avec une session déjà expirée. Efface le cookie.',
  })
  @ApiCookieAuth(SESSION_SCHEME)
  @ApiResponse({ status: 204, description: 'Déconnecté.' })
  @ApiErrors(403)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = readCookie(req.headers.cookie, this.cookieName);
    if (token) await this.auth.logout(token);
    res.clearCookie(this.cookieName, clearedSessionCookieOptions(this.secure));
  }

  @Post('logout-all')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Se déconnecter partout', description: 'Ferme toutes les sessions du compte.' })
  @ApiSession()
  @ApiResponse({ status: 204, description: 'Toutes les sessions sont fermées.' })
  async logoutAll(@Auth() auth: AuthContext, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logoutAll(auth.user.id);
    res.clearCookie(this.cookieName, clearedSessionCookieOptions(this.secure));
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @ApiOperation({
    summary: 'Compte connecté',
    description:
      'À appeler au chargement du site : `401` signifie simplement « visiteur non connecté ». Renvoie aussi un `csrfToken` à jour.',
  })
  @ApiSession()
  @ApiResponse({ status: 200, type: SessionApiResponse })
  me(@Auth() auth: AuthContext): SessionResponse {
    return { user: publicUser(auth.user), csrfToken: auth.csrfToken };
  }

  // ─── Mot de passe ──────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(202)
  @Throttle({ default: THROTTLE.forgotPassword })
  @ApiOperation({
    summary: 'Mot de passe oublié',
    description: 'Envoie un lien valable 30 min, à usage unique. Réponse identique que le compte existe ou non.',
  })
  @ApiResponse({ status: 202, type: MessageApiResponse })
  @ApiErrors(400, 403, 429, 503)
  async forgotPassword(@Body() dto: EmailDto): Promise<MessageResponse> {
    await this.auth.forgotPassword(dto.email);
    return { message: MESSAGES.resetAccepted };
  }

  @Post('reset-password')
  @HttpCode(204)
  @Throttle({ default: THROTTLE.resetPassword })
  @ApiOperation({
    summary: 'Choisir un nouveau mot de passe',
    description:
      'Appelée par la page `/reinitialiser-mot-de-passe?token=…`. Ferme toutes les sessions, débloque le compte et confirme l’adresse.',
  })
  @ApiResponse({ status: 204, description: 'Mot de passe changé.' })
  @ApiErrors(400, 403, 429)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.auth.resetPassword(dto.token, dto.password);
  }

  @Post('change-password')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  @Throttle({ default: THROTTLE.changePassword })
  @ApiOperation({
    summary: 'Changer son mot de passe',
    description: 'Ferme les **autres** sessions du compte ; la session courante reste ouverte.',
  })
  @ApiSession()
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 204, description: 'Mot de passe changé.' })
  @ApiErrors(400, 429)
  async changePassword(@Auth() auth: AuthContext, @Body() dto: ChangePasswordDto): Promise<void> {
    await this.auth.changePassword(auth.user, auth.sessionId, dto.currentPassword, dto.newPassword);
  }
}
