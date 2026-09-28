import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchUsersDto {
  /** Morceau d'adresse e-mail, sans tenir compte de la casse. */
  @IsOptional()
  @IsString()
  @MaxLength(254)
  q?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsIn(['CUSTOMER', 'ADMIN'])
  role?: 'CUSTOMER' | 'ADMIN';

  /** `true` : bloque le compte et ferme ses sessions ; `false` : le débloque. */
  @IsOptional()
  @IsBoolean()
  blocked?: boolean;
}
