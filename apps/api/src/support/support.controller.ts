import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { MessageResponse } from '@fondamental/shared';
import { ApiErrors } from '../common/api-docs.js';
import { ContactSupportDto } from './support.dto.js';
import { MessageApiResponse } from './support.responses.js';
import { MESSAGES, THROTTLE } from './support.constants.js';
import { SupportService } from './support.service.js';

@ApiTags('support')
@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  @HttpCode(202)
  @Throttle({ default: THROTTLE.contact })
  @ApiOperation({
    summary: 'Écrire à l’équipe',
    description:
      'Public (sans compte). La réponse ne détaille jamais si le message est bien arrivé à l’équipe, ' +
      'comme les autres routes qui envoient un e-mail (voir `/auth/register`).',
  })
  @ApiResponse({ status: 202, type: MessageApiResponse })
  @ApiErrors(400, 403, 429, 503)
  async contact(@Body() dto: ContactSupportDto): Promise<MessageResponse> {
    await this.support.contact(dto);
    return { message: MESSAGES.accepted };
  }
}
