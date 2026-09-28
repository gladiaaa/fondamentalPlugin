import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { TwoFactorSetupResponse } from '@fondamental/shared';
import { Auth, type AuthContext } from '../auth/auth.decorators.js';
import { SessionGuard } from '../auth/session.guard.js';
import { AdminRoleGuard } from './admin-role.guard.js';
import { AdminTwoFactorService } from './admin-2fa.service.js';
import { VerifyTotpDto } from './admin-2fa.dto.js';
import { THROTTLE } from './admin.constants.js';

/**
 * Met en place et valide la 2FA (TOTP), obligatoire pour toute autre route `/api/admin/*` (`AdminGuard`).
 * Rôle admin exigé (`AdminRoleGuard`), mais pas encore la 2FA elle-même (ce sont ces routes qui la posent).
 */
@ApiExcludeController()
@Controller('admin/2fa')
@UseGuards(SessionGuard, AdminRoleGuard)
export class AdminTwoFactorController {
  constructor(private readonly twoFactor: AdminTwoFactorService) {}

  @Post('setup')
  async setup(@Auth() auth: AuthContext): Promise<TwoFactorSetupResponse> {
    return this.twoFactor.setup(auth.user.id, auth.user.email);
  }

  @Post('verify')
  @HttpCode(204)
  @Throttle({ default: THROTTLE.twoFactorVerify })
  async verify(@Auth() auth: AuthContext, @Body() dto: VerifyTotpDto): Promise<void> {
    await this.twoFactor.verify(auth.user.id, auth.sessionId, dto.code);
  }
}
