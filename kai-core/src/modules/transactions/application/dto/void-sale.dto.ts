import { IsString, MinLength } from 'class-validator';

export class VoidSaleDto {
  @IsString()
  @MinLength(3, { message: 'Indique un motivo de anulación (mín. 3 caracteres).' })
  reason!: string;
}
