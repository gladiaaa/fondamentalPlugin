import { Controller, Delete, Get, HttpCode, Param, Post, Body, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { LicenseDetailResponse, OwnedLicenseResponse } from '@fondamental/shared';
import { ApiErrors, ApiSession } from '../common/api-docs.js';
import { Auth, type AuthContext } from '../auth/auth.decorators.js';
import { SessionGuard } from '../auth/session.guard.js';
import { ClaimLicenseDto } from './licenses.dto.js';
import { LicenseDetailApiResponse, OwnedLicenseApiResponse } from './licenses.responses.js';
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
    description: 'Les clés rattachées au compte. Statut détaillé et installations : `GET /me/licenses/:id`.',
  })
  @ApiSession()
  @ApiResponse({ status: 200, type: [OwnedLicenseApiResponse] })
  list(@Auth() auth: AuthContext): Promise<OwnedLicenseResponse[]> {
    return this.licenses.list(auth.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: "Statut d'une licence",
    description:
      "Édition, révocation et installations actives. `:id` est l'identifiant interne donné par " +
      "`GET /me/licenses`, jamais la clé (#91). Une licence d'un autre compte répond la **même erreur** " +
      "(404) qu'une licence inconnue.",
  })
  @ApiSession()
  @ApiErrors(404, 503)
  @ApiResponse({ status: 200, type: LicenseDetailApiResponse })
  getDetail(@Auth() auth: AuthContext, @Param('id') id: string): Promise<LicenseDetailResponse> {
    return this.licenses.getDetail(auth.user.id, id);
  }

  @Delete(':id/activations/:installationId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Libérer une installation',
    description: 'Après une réinstallation de serveur, pour libérer un emplacement d’activation.',
  })
  @ApiSession()
  @ApiErrors(404, 503)
  async releaseActivation(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
    @Param('installationId') installationId: string,
  ): Promise<void> {
    await this.licenses.releaseActivation(auth.user.id, id, installationId);
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
