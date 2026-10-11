import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

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

  /** L'identifiant du **prix** Stripe (`price_…`), pas celui du produit (`prod_…`) : Stripe Checkout refuse ce dernier. */
  @IsOptional()
  @IsString()
  @Length(1, 64)
  @Matches(/^price_[A-Za-z0-9]+$/, {
    message: 'Identifiant de prix Stripe attendu (price_…), pas celui du produit (prod_…) : Stripe → Produit → Tarifs.',
  })
  stripePriceId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
