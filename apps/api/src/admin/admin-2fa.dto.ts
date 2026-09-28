import { IsString, Matches } from 'class-validator';

export class VerifyTotpDto {
  @IsString()
  @Matches(/^\d{3}\s?\d{3}$/, { message: 'Code invalide (6 chiffres).' })
  code!: string;
}
