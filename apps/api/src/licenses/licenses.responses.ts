import { ApiProperty } from '@nestjs/swagger';
import type { LicenseActivation, LicenseDetailResponse, OwnedLicenseResponse } from '@fondamental/shared';

export class LicenseProductApiResponse {
  @ApiProperty({ type: String })
  slug!: string;

  @ApiProperty({ type: String })
  name!: string;
}

export class OwnedLicenseApiResponse implements OwnedLicenseResponse {
  @ApiProperty({ type: String, format: 'uuid', description: 'À mettre dans les URL à la place de la clé (#91).' })
  id!: string;

  @ApiProperty({ type: LicenseProductApiResponse, nullable: true, description: 'Plugin de la clé ; vide si inconnu.' })
  product!: { slug: string; name: string } | null;

  @ApiProperty({ type: String })
  key!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  claimedAt!: string;
}

export class LicenseActivationApiResponse implements LicenseActivation {
  @ApiProperty({ type: String, description: 'À repasser à DELETE /me/licenses/:id/activations/:installationId.' })
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
