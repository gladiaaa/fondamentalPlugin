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

export class EmailDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Adresse e-mail invalide.' })
  @MaxLength(254)
  email!: string;
}

export class RegisterDto extends EmailDto {
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, passwordRules.min)
  @MaxLength(PASSWORD_MAX_LENGTH, passwordRules.max)
  password!: string;
}

export class LoginDto extends EmailDto {
  // Pas de longueur minimale ici : la connexion ne doit pas révéler la règle des mots de passe.
  @IsString()
  @Length(1, PASSWORD_MAX_LENGTH)
  password!: string;
}

export class TokenDto {
  @IsString()
  @Length(20, 200)
  token!: string;
}

export class ResetPasswordDto extends TokenDto {
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, passwordRules.min)
  @MaxLength(PASSWORD_MAX_LENGTH, passwordRules.max)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @Length(1, PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, passwordRules.min)
  @MaxLength(PASSWORD_MAX_LENGTH, passwordRules.max)
  newPassword!: string;
}
