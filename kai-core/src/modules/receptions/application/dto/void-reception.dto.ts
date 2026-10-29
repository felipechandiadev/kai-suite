import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class VoidReceptionDto {
  @IsString()
  @MinLength(3, { message: 'Indique un motivo de anulación (mín. 3 caracteres).' })
  reason!: string;

  /**
   * Permite anular aunque el PMP no se pueda restaurar de forma exacta
   * (hubo compras posteriores que lo movieron). El PMP queda sin cambios.
   */
  @IsOptional()
  @IsBoolean()
  acknowledgePmpNotRestored?: boolean;
}
