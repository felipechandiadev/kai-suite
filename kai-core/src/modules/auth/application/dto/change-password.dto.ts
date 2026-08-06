import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual', minLength: 1 })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    description: 'Nueva contraseña',
    example: 'nuevaClaveSegura',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, {
    message: 'La contraseña debe tener al menos 6 caracteres',
  })
  newPassword!: string;

  @ApiProperty({
    description: 'Confirmación de la nueva contraseña',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, {
    message: 'La confirmación debe tener al menos 6 caracteres',
  })
  confirmPassword!: string;
}

export class ChangePasswordResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Contraseña actualizada' })
  message!: string;
}
