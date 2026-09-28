import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { AdminUserDetail, AdminUserSummary } from '@fondamental/shared';
import { Auth, type AuthContext } from '../auth/auth.decorators.js';
import { SessionGuard } from '../auth/session.guard.js';
import { AdminGuard } from './admin.guard.js';
import { SearchUsersDto, UpdateUserDto } from './admin-users.dto.js';
import { AdminUsersService } from './admin-users.service.js';

@ApiExcludeController()
@Controller('admin/users')
@UseGuards(SessionGuard, AdminGuard)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  search(@Query() query: SearchUsersDto): Promise<AdminUserSummary[]> {
    return this.users.search(query.q);
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<AdminUserDetail> {
    return this.users.detail(id);
  }

  @Patch(':id')
  update(
    @Auth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<AdminUserDetail> {
    return this.users.update(auth.user.id, id, dto);
  }
}
