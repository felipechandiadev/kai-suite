import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LiteChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ description: 'Nueva contraseña', minLength: 6 })
  @IsString()
  @MinLength(6, {
    message: 'La contraseña debe tener al menos 6 caracteres',
  })
  newPassword!: string;

  @ApiProperty({ description: 'Confirmación de la nueva contraseña', minLength: 6 })
  @IsString()
  @MinLength(6, {
    message: 'La confirmación debe tener al menos 6 caracteres',
  })
  confirmPassword!: string;
}
