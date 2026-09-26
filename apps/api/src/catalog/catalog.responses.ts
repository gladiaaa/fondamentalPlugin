import { ApiProperty } from '@nestjs/swagger';
import type {
  ProductDependency,
  ProductDistribution,
  ProductPrice,
  ProductRequirements,
  ProductResponse,
} from '@fondamental/shared';

// Formes des réponses, pour la documentation OpenAPI (types de référence : @fondamental/shared).

export class ProductDependencyApiResponse implements ProductDependency {
  @ApiProperty({ type: String, example: 'FastAsyncWorldEdit' })
  name!: string;

  @ApiProperty({ type: Boolean, description: '`true` : le plugin ne démarre pas sans lui.' })
  required!: boolean;

  @ApiProperty({ type: String, description: 'Pourquoi il est utile (texte affichable).' })
  note!: string;
}

export class ProductRequirementsApiResponse implements ProductRequirements {
  @ApiProperty({ type: String, example: 'Paper 1.21.4+' })
  platform!: string;

  @ApiProperty({ type: Number, example: 21, description: 'Version minimale de Java.' })
  java!: number;

  @ApiProperty({ type: [ProductDependencyApiResponse] })
  dependencies!: ProductDependencyApiResponse[];
}

export class ProductPriceApiResponse implements ProductPrice {
  @ApiProperty({ type: Number, example: 1999, description: 'En centimes (1999 = 19,99).' })
  amountCents!: number;

  @ApiProperty({ type: String, example: 'eur', description: 'Code ISO 4217 en minuscules.' })
  currency!: string;
}

export class ProductApiResponse implements ProductResponse {
  @ApiProperty({ type: String, example: 'tag', description: 'Identifiant dans les adresses du site.' })
  slug!: string;

  @ApiProperty({ type: String, example: 'FondamentalTag' })
  name!: string;

  @ApiProperty({ type: String })
  description!: string;

  @ApiProperty({
    type: String,
    enum: ['SINGLE_JAR', 'FREE_PREMIUM_JARS'],
    description:
      '`SINGLE_JAR` : un seul jar, la clé de licence décide de l’édition. `FREE_PREMIUM_JARS` : deux jars, `free` et `premium`.',
  })
  distribution!: ProductDistribution;

  @ApiProperty({ type: ProductRequirementsApiResponse })
  requirements!: ProductRequirementsApiResponse;

  @ApiProperty({
    type: ProductPriceApiResponse,
    nullable: true,
    description: '`null` tant que le prix n’est pas fixé.',
  })
  price!: ProductPriceApiResponse | null;

  @ApiProperty({
    type: Boolean,
    description: '`false` : ne pas proposer l’achat (prix ou paiement pas encore configurés).',
  })
  purchasable!: boolean;
}
