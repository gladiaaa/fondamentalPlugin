import { ApiProperty } from '@nestjs/swagger';
import type { MessageResponse } from '@fondamental/shared';

export class MessageApiResponse implements MessageResponse {
  @ApiProperty({ type: String })
  message!: string;
}
