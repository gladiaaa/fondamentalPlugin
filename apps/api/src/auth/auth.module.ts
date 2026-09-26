import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';
import { PwnedPasswordsService } from './pwned-passwords.service.js';
import { SessionGuard } from './session.guard.js';
import { SessionService } from './session.service.js';

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, PwnedPasswordsService, SessionService, SessionGuard],
  // Les autres modules protègent leurs routes avec `@UseGuards(SessionGuard)` (en important AuthModule).
  exports: [SessionService, SessionGuard],
})
export class AuthModule {}
