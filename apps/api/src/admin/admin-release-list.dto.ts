import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ListReleasesDto {
  /** Slug du plugin (`bedwars`, `tag`…) ; tous les plugins si absent. */
  @IsOptional()
  @Matches(/^[a-z0-9-]{1,64}$/)
  product?: string;
}

export class UpdateReleaseDto {
  /** `true` : retirée du site public ; `false` : de nouveau affichée. */
  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @IsIn(['RELEASE', 'BETA'])
  channel?: 'RELEASE' | 'BETA';

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  changelog?: string;
}
