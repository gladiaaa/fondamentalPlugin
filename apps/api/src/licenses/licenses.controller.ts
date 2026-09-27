import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { OwnedLicenseResponse } from '@fondamental/shared';
import { ApiErrors, ApiSession } from '../common/api-docs.js';
import { Auth, type AuthContext } from '../auth/auth.decorators.js';
import { SessionGuard } from '../auth/session.guard.js';
import { ClaimLicenseDto } from './licenses.dto.js';
import { OwnedLicenseApiResponse } from './licenses.responses.js';
import { LicensesService } from './licenses.service.js';
import { THROTTLE } from './licenses.constants.js';

@ApiTags('licences')
@Controller('me/licenses')
@UseGuards(SessionGuard)
export class LicensesController {
  constructor(private readonly licenses: LicensesService) {}

  @Get()
  @ApiOperation({
    summary: 'Mes licences',
    description: 'Les clés rattachées au compte. Statut détaillé et installations : à venir avec #25.',
  })
  @ApiSession()
  @ApiResponse({ status: 200, type: [OwnedLicenseApiResponse] })
  list(@Auth() auth: AuthContext): Promise<OwnedLicenseResponse[]> {
    return this.licenses.list(auth.user.id);
  }

  @Post('claim')
  @HttpCode(204)
  @Throttle({ default: THROTTLE.claim })
  @ApiOperation({
    summary: 'Rattacher une clé de licence existante',
    description:
      'Pour les clés créées avant la boutique (anciens clients, clés faites à la main). Une clé inconnue, ' +
      'révoquée ou déjà rattachée à un compte (le vôtre ou un autre) répond la **même erreur**.',
  })
  @ApiSession()
  @ApiErrors(400, 503)
  async claim(@Auth() auth: AuthContext, @Body() dto: ClaimLicenseDto): Promise<void> {
    await this.licenses.claim(auth.user.id, dto.key);
  }
}
