import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  NotEquals,
} from 'class-validator';

export class LiteStockAdjustDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  storageId?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  targetQty!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

/** Delta relativo (+ aumentar / − reducir) en un almacén. */
export class LiteStockDeltaDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsUUID()
  storageId!: string;

  @ApiProperty({ example: 5, description: 'Cantidad con signo; 0 no permitido' })
  @IsNumber()
  @NotEquals(0)
  delta!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

/** Traslado entre almacenes Lite (sin documentos de inventario Suite). */
export class LiteStockTransferDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsUUID()
  sourceStorageId!: string;

  @ApiProperty()
  @IsUUID()
  targetStorageId!: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
