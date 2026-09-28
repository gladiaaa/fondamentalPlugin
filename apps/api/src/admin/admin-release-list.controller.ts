import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { AdminReleaseResponse } from '@fondamental/shared';
import { Auth, type AuthContext } from '../auth/auth.decorators.js';
import { SessionGuard } from '../auth/session.guard.js';
import { AdminGuard } from './admin.guard.js';
import { ListReleasesDto, UpdateReleaseDto } from './admin-release-list.dto.js';
import { AdminReleaseListService } from './admin-release-list.service.js';

/**
 * Versions publiées, vues du back-office (#105). Distinct de `/admin/releases/:product/:version`
 * (publication par la CI des plugins, jeton `RELEASES_TOKEN`) : ici, session admin + 2FA.
 */
@ApiExcludeController()
@Controller('admin/releases')
@UseGuards(SessionGuard, AdminGuard)
export class AdminReleaseListController {
  constructor(private readonly releases: AdminReleaseListService) {}

  @Get()
  list(@Query() query: ListReleasesDto): Promise<AdminReleaseResponse[]> {
    return this.releases.list(query.product);
  }

  @Patch(':id')
  update(
    @Auth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReleaseDto,
  ): Promise<AdminReleaseResponse> {
    return this.releases.update(auth.user.id, id, dto);
  }
}
