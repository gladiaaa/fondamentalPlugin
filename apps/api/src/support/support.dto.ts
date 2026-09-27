import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { EmailDto } from '../auth/auth.dto.js';

export class ContactSupportDto extends EmailDto {
  @ApiProperty({ type: String, minLength: 1, maxLength: 200 })
  @IsString()
  @Length(1, 200)
  subject!: string;

  @ApiPropertyOptional({
    type: String,
    minLength: 4,
    maxLength: 128,
    description: 'Facultatif : la clé concernée, si le message porte sur une licence.',
  })
  @IsOptional()
  @IsString()
  @Length(4, 128)
  // Même format que le rattachement d'une clé existante (voir ClaimLicenseDto).
  @Matches(/^[A-Za-z0-9._-]+$/, { message: 'Clé de licence invalide.' })
  licenseKey?: string;

  @ApiProperty({ type: String, minLength: 1, maxLength: 5000 })
  @IsString()
  @Length(1, 5000)
  message!: string;
}
