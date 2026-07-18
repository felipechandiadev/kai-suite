import { IsString, IsNotEmpty, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Username for authentication',
    example: 'admin',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de usuario es requerido' })
  userName: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 4,
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(4, { message: 'La contraseña debe tener al menos 4 caracteres' })
  password: string;

  @ApiPropertyOptional({
    description: 'Solicitar modo Multiempresa (ADMIN/SUPER_ADMIN con ≥2 empresas)',
  })
  @IsOptional()
  @IsBoolean()
  multiCompanyMode?: boolean;
}
