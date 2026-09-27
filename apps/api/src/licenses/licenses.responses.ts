import { ApiProperty } from '@nestjs/swagger';
import type { OwnedLicenseResponse } from '@fondamental/shared';

export class OwnedLicenseApiResponse implements OwnedLicenseResponse {
  @ApiProperty({ type: String })
  key!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  claimedAt!: string;
}
