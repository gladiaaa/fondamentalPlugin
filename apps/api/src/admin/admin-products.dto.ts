import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Length(1, 5000)
  description?: string;

  /** En centimes. Pour retirer un produit de la vente, utiliser `active: false` plutôt que de toucher au prix. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  priceCents?: number;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  stripePriceId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
