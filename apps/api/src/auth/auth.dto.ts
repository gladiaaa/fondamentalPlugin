import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './auth.constants.js';

/** Adresse normalisée : espaces retirés, minuscules. C'est la forme stockée en base. */
const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const passwordRules = {
  min: { message: `Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères.` },
  max: { message: `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.` },
};

/** Documentation d'un mot de passe qui doit respecter les règles (création ou changement). */
const newPasswordDoc = {
  type: String,
  minLength: PASSWORD_MIN_LENGTH,
  maxLength: PASSWORD_MAX_LENGTH,
  description: 'Refusé (`PASSWORD_COMPROMISED`) s’il figure dans des fuites de données connues.',
} as const;

export class EmailDto {
  @ApiProperty({ type: String, format: 'email', maxLength: 254, example: 'ada@example.com' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @MaxLength(254)
  email!: string;
}

export class RegisterDto extends EmailDto {
  @ApiProperty(newPasswordDoc)
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, passwordRules.min)
  @MaxLength(PASSWORD_MAX_LENGTH, passwordRules.max)
  password!: string;
}

export class LoginDto extends EmailDto {
  // Pas de longueur minimale ici : la connexion ne doit pas révéler la règle des mots de passe.
  @ApiProperty({ type: String, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @Length(1, PASSWORD_MAX_LENGTH)
  password!: string;
}

export class TokenDto {
  @ApiProperty({
    type: String,
    minLength: 20,
    maxLength: 200,
    description: 'Jeton lu dans l’adresse de la page ouverte depuis le lien de l’e-mail.',
  })
  @IsString()
  @Length(20, 200)
  token!: string;
}

export class ResetPasswordDto extends TokenDto {
  @ApiProperty(newPasswordDoc)
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, passwordRules.min)
  @MaxLength(PASSWORD_MAX_LENGTH, passwordRules.max)
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ type: String, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @Length(1, PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @ApiProperty(newPasswordDoc)
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, passwordRules.min)
  @MaxLength(PASSWORD_MAX_LENGTH, passwordRules.max)
  newPassword!: string;
}
