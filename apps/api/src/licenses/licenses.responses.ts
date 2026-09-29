import { ApiProperty } from '@nestjs/swagger';
import type { LicenseActivation, LicenseDetailResponse, OwnedLicenseResponse } from '@fondamental/shared';

export class OwnedLicenseApiResponse implements OwnedLicenseResponse {
  @ApiProperty({ type: String })
  key!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  claimedAt!: string;
}

export class LicenseActivationApiResponse implements LicenseActivation {
  @ApiProperty({ type: String, description: 'À repasser à DELETE /me/licenses/:key/activations/:installationId.' })
  installationId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  firstSeenAt!: string;

  @ApiProperty({ type: String, format: 'date-time', description: 'Dernière vérification de la licence par ce serveur.' })
  lastSeenAt!: string;
}

export class LicenseDetailApiResponse extends OwnedLicenseApiResponse implements LicenseDetailResponse {
  @ApiProperty({ type: String })
  edition!: string;

  @ApiProperty({ type: Boolean })
  revoked!: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true, description: 'Vide : licence sans limite de durée.' })
  expiresAt!: string | null;

  @ApiProperty({ type: Number, description: "Nombre d'installations simultanées permises." })
  maxActivations!: number;

  @ApiProperty({ type: [LicenseActivationApiResponse] })
  activations!: LicenseActivation[];
}
