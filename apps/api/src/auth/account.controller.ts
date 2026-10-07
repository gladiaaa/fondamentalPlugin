import { Body, Controller, Delete, Get, HttpCode, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AccountExport } from '@fondamental/shared';
import type { Response } from 'express';
import { ApiErrors, ApiSession } from '../common/api-docs.js';
import type { Env } from '../config/env.js';
import { THROTTLE } from './auth.constants.js';
import { Auth, type AuthContext } from './auth.decorators.js';
import { DeleteAccountDto } from './auth.dto.js';
import { AccountExportApiResponse } from './auth.responses.js';
import { AuthService } from './auth.service.js';
import { clearedSessionCookieOptions, isSecureEnv, sessionCookieName } from './session-cookie.js';
import { SessionGuard } from './session.guard.js';

/** « Mes données » (RGPD) : télécharger ce que la boutique détient, supprimer son compte. */
@ApiTags('compte')
@Controller('me')
@UseGuards(SessionGuard)
export class AccountController {
  private readonly secure: boolean;
  private readonly cookieName: string;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService<Env, true>,
  ) {
    this.secure = isSecureEnv(config.get('APP_ENV', { infer: true }));
    this.cookieName = sessionCookieName(this.secure);
  }

  @Get('export')
  @Throttle({ default: THROTTLE.exportAccount })
  @ApiOperation({
    summary: 'Télécharger mes données',
    description:
      'Toutes les données que la boutique détient sur le compte, en JSON (téléchargement `mes-donnees-fondamental.json`). Commandes payées, clés de licence et configurations enregistrées comprises. Jamais de mot de passe, d’empreinte ni de jeton de connexion.',
  })
  @ApiSession()
  @ApiResponse({ status: 200, type: AccountExportApiResponse })
  @ApiErrors(429)
  async exportData(
    @Auth() auth: AuthContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccountExport> {
    res.setHeader('Content-Disposition', 'attachment; filename="mes-donnees-fondamental.json"');
    res.setHeader('Cache-Control', 'no-store');
    return this.auth.exportAccount(auth.user, auth.sessionId);
  }

  @Delete()
  @HttpCode(204)
  @Throttle({ default: THROTTLE.deleteAccount })
  @ApiOperation({
    summary: 'Supprimer mon compte',
    description:
      'Définitif. Le mot de passe est redemandé (`CURRENT_PASSWORD_INVALID` s’il est faux : les échecs comptent pour le blocage). Ferme toutes les sessions, efface le cookie et envoie un e-mail de confirmation. Un compte sans mot de passe (`NO_PASSWORD`) ne peut pas être supprimé ainsi pour l’instant.',
  })
  @ApiSession()
  @ApiBody({ type: DeleteAccountDto })
  @ApiResponse({ status: 204, description: 'Compte supprimé.' })
  @ApiErrors(400, 429)
  async deleteAccount(
    @Auth() auth: AuthContext,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.deleteAccount(auth.user, dto.password);
    res.clearCookie(this.cookieName, clearedSessionCookieOptions(this.secure));
  }
}
