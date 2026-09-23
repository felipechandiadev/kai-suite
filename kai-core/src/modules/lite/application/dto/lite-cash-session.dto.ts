import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class LiteOpenCashSessionDto {
  @ApiProperty()
  @IsUUID()
  pointOfSaleId!: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  openingAmount!: number;
}

export class LiteCloseCashSessionDto {
  @ApiProperty({ example: 0, description: 'Efectivo contado (caja)' })
  @IsNumber()
  @Min(0)
  closingAmount!: number;

  @ApiPropertyOptional({
    description: 'Arqueo por medio (CLP). Keys: CASH, DEBIT_CARD, CREDIT_CARD, TRANSFER, …',
    example: { CASH: 10000, TRANSFER: 5000 },
  })
  @IsOptional()
  @IsObject()
  countsByMethod?: Record<string, number>;
}

/** Ingreso / egreso de efectivo en sesión (Lite: sin cash hub / tesorería). */
export class LiteCashMovementDto {
  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;
}
