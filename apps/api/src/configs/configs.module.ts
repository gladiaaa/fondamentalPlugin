import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LicensesModule } from '../licenses/licenses.module.js';
import { ConfigsController, MyConfigsController } from './configs.controller.js';
import { ConfigsService } from './configs.service.js';

@Module({
  imports: [AuthModule, LicensesModule],
  controllers: [ConfigsController, MyConfigsController],
  providers: [ConfigsService],
})
export class ConfigsModule {}
