import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LicensesModule } from '../licenses/licenses.module.js';
import { MailModule } from '../mail/mail.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { AdminActionLogService } from './admin-action-log.service.js';
import { AdminGuard } from './admin.guard.js';
import { AdminRoleGuard } from './admin-role.guard.js';
import { AdminTwoFactorController } from './admin-2fa.controller.js';
import { AdminTwoFactorService } from './admin-2fa.service.js';
import { AdminLicensesController } from './admin-licenses.controller.js';
import { AdminLicensesService } from './admin-licenses.service.js';
import { AdminOrdersController } from './admin-orders.controller.js';
import { AdminOrdersService } from './admin-orders.service.js';
import { AdminProductsController } from './admin-products.controller.js';
import { AdminProductsService } from './admin-products.service.js';
import { AdminReleaseListController } from './admin-release-list.controller.js';
import { AdminReleaseListService } from './admin-release-list.service.js';
import { AdminStatsController } from './admin-stats.controller.js';
import { AdminStatsService } from './admin-stats.service.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminUsersService } from './admin-users.service.js';

@Module({
  imports: [AuthModule, LicensesModule, OrdersModule, MailModule],
  controllers: [
    AdminTwoFactorController,
    AdminOrdersController,
    AdminLicensesController,
    AdminProductsController,
    AdminUsersController,
    AdminReleaseListController,
    AdminStatsController,
  ],
  providers: [
    AdminActionLogService,
    AdminRoleGuard,
    AdminGuard,
    AdminTwoFactorService,
    AdminOrdersService,
    AdminLicensesService,
    AdminProductsService,
    AdminUsersService,
    AdminReleaseListService,
    AdminStatsService,
  ],
})
export class AdminModule {}
