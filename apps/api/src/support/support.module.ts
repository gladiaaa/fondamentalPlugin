import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module.js';
import { SupportController } from './support.controller.js';
import { SupportService } from './support.service.js';

@Module({
  imports: [MailModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
