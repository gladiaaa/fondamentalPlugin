import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { AdminLicenseResponse, RecreatedLicenseResponse } from '@fondamental/shared';
import { Auth, type AuthContext } from '../auth/auth.decorators.js';
import { SessionGuard } from '../auth/session.guard.js';
import { AdminGuard } from './admin.guard.js';
import { AdminLicensesService } from './admin-licenses.service.js';

@ApiExcludeController()
@Controller('admin/licenses')
@UseGuards(SessionGuard, AdminGuard)
export class AdminLicensesController {
  constructor(private readonly licenses: AdminLicensesService) {}

  @Get(':key')
  status(@Param('key') key: string): Promise<AdminLicenseResponse> {
    return this.licenses.status(key);
  }

  @Post(':key/revoke')
  @HttpCode(204)
  async revoke(@Auth() auth: AuthContext, @Param('key') key: string): Promise<void> {
    await this.licenses.revoke(auth.user.id, key);
  }

  @Post(':key/recreate')
  recreate(@Auth() auth: AuthContext, @Param('key') key: string): Promise<RecreatedLicenseResponse> {
    return this.licenses.recreate(auth.user.id, key);
  }
}
