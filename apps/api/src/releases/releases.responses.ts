import { ApiProperty } from '@nestjs/swagger';
import type { ReleaseChannel, ReleaseEdition, ReleaseFileResponse, ReleaseInfo } from '@fondamental/shared';

// Formes des réponses, pour la documentation OpenAPI (types de référence : @fondamental/shared).

export class ReleaseInfoApiResponse implements ReleaseInfo {
  @ApiProperty({ type: String, example: '2.2.0', description: 'Texte libre : ne pas la traiter comme un numéro.' })
  version!: string;

  @ApiProperty({ type: String, enum: ['RELEASE', 'BETA'] })
  channel!: ReleaseChannel;

  @ApiProperty({ type: String, description: 'Notes de version, en texte brut (peut être vide).' })
  changelog!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  releasedAt!: string;
}

export class ReleaseFileApiResponse implements ReleaseFileResponse {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({
    type: String,
    enum: ['UNIVERSAL', 'FREE', 'PREMIUM'],
    description:
      '`UNIVERSAL` : jar unique, la clé de licence décide de l’édition. `FREE` / `PREMIUM` : les deux jars de Tag et Crate.',
  })
  edition!: ReleaseEdition;

  @ApiProperty({ type: String, enum: ['PAPER'] })
  platform!: 'PAPER';

  @ApiProperty({ type: String, example: 'fondamentaltag-free-2.2.0-obf.jar' })
  fileName!: string;

  @ApiProperty({ type: Number, description: 'Taille en octets.' })
  sizeBytes!: number;

  @ApiProperty({ type: String, description: 'SHA-256 en hexadécimal, à afficher pour la vérification du fichier.' })
  sha256!: string;

  @ApiProperty({ type: [String], example: ['1.21.11', '1.21.4'], description: 'De la plus récente à la plus ancienne.' })
  minecraftVersions!: string[];

  @ApiProperty({ type: Number })
  downloadCount!: number;

  @ApiProperty({ type: String, example: '/api/downloads/8f1b3c1e-0000-4000-8000-000000000001' })
  downloadUrl!: string;

  @ApiProperty({ type: ReleaseInfoApiResponse })
  release!: ReleaseInfoApiResponse;
}
