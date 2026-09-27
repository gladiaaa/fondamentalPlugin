import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ClaimLicenseDto {
  @ApiProperty({
    type: String,
    minLength: 4,
    maxLength: 128,
    description: 'Clé telle qu’affichée par le plugin ou reçue par e-mail à l’achat.',
  })
  @IsString()
  @Length(4, 128)
  // Format exact non figé côté serveur de licences : lettres, chiffres et séparateurs usuels seulement.
  @Matches(/^[A-Za-z0-9._-]+$/, { message: 'Clé de licence invalide.' })
  key!: string;
}
