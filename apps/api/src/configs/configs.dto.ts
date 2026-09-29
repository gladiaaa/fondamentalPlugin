import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString, Length, Matches } from 'class-validator';
import { FILE, SLUG, VERSION } from './configs.constants.js';

const VALUES_DESCRIPTION =
  'Valeurs du formulaire, dans la forme du YAML. Validées contre le schéma du fichier (`GET /configs/:slug/:version/:file`) : ' +
  'un champ inconnu ou invalide répond `400 CONFIG_INVALID` avec un message par champ. La clé de licence est toujours ' +
  'celle de l’acheteur, jamais une valeur envoyée.';

export class RenderConfigDto {
  @ApiProperty({ type: String, example: 'crate' })
  @IsString()
  @Matches(SLUG)
  slug!: string;

  @ApiProperty({ type: String, example: '1.2.1' })
  @IsString()
  @Matches(VERSION)
  version!: string;

  @ApiProperty({ type: String, example: 'crates.yml' })
  @IsString()
  @Matches(FILE)
  file!: string;

  @ApiProperty({ type: Object, description: VALUES_DESCRIPTION })
  @IsObject()
  values!: Record<string, unknown>;
}

export class CreateConfigDto extends RenderConfigDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 64, example: 'Crates du lobby' })
  @IsString()
  @Length(1, 64)
  name!: string;
}

export class UpdateConfigDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 64 })
  @IsString()
  @Length(1, 64)
  name!: string;

  @ApiProperty({ type: Object, description: VALUES_DESCRIPTION })
  @IsObject()
  values!: Record<string, unknown>;
}

export class UpgradeConfigDto {
  @ApiProperty({ type: String, example: '1.3.0', description: 'Version cible du plugin.' })
  @IsString()
  @Matches(VERSION)
  version!: string;
}
