import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ type: String, description: 'Identifiant du plugin dans les adresses du site (`bedwars`, `tag`…).' })
  @IsString()
  @Length(1, 64)
  @Matches(/^[a-z0-9-]+$/, { message: 'Identifiant de produit invalide.' })
  productSlug!: string;
}
