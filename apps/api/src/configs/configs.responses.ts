import { ApiProperty } from '@nestjs/swagger';
import type {
  ConfigField,
  ConfigFileSummary,
  ConfigPluginResponse,
  ConfigSchemaResponse,
  ConfigValues,
  RenderedConfigResponse,
  SavedConfigResponse,
} from '@fondamental/shared';

// Formes des réponses, pour la documentation OpenAPI. Les types de référence sont dans
// `@fondamental/shared` (`ConfigField` y décrit le format des champs d'un schéma).

export class ConfigFileSummaryApiResponse implements ConfigFileSummary {
  @ApiProperty({ type: String, example: 'crates.yml' })
  file!: string;

  @ApiProperty({ type: String, example: 'Crates' })
  label!: string;

  @ApiProperty({ type: String })
  description!: string;
}

class ConfigVersionApiResponse {
  @ApiProperty({ type: String, example: '1.2.1' })
  version!: string;

  @ApiProperty({ type: [ConfigFileSummaryApiResponse] })
  files!: ConfigFileSummary[];
}

export class ConfigPluginApiResponse implements ConfigPluginResponse {
  @ApiProperty({ type: String, example: 'crate' })
  slug!: string;

  @ApiProperty({ type: [ConfigVersionApiResponse], description: 'La plus récente en premier.' })
  versions!: Array<{ version: string; files: ConfigFileSummary[] }>;
}

export class ConfigSchemaApiResponse extends ConfigFileSummaryApiResponse implements ConfigSchemaResponse {
  @ApiProperty({ type: String })
  slug!: string;

  @ApiProperty({ type: String })
  version!: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    description: 'Champs du formulaire (`ConfigField` dans `@fondamental/shared` : text, number, boolean, select, textList, section, map, list, oneOf, license).',
  })
  fields!: ConfigField[];

  @ApiProperty({ type: Object, description: 'Valeurs livrées avec le plugin, dans la forme du YAML.' })
  defaults!: ConfigValues;
}

export class SavedConfigApiResponse implements SavedConfigResponse {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  slug!: string;

  @ApiProperty({ type: String })
  version!: string;

  @ApiProperty({ type: String })
  file!: string;

  @ApiProperty({ type: Object })
  values!: ConfigValues;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class RenderedConfigApiResponse implements RenderedConfigResponse {
  @ApiProperty({ type: String, example: 'config.yml' })
  file!: string;

  @ApiProperty({ type: String, description: 'Contenu du fichier, prêt à déposer dans plugins/<Plugin>/.' })
  yaml!: string;
}
