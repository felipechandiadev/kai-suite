import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CtpBatchItemDto {
  @IsUUID()
  variantId!: string;

  @IsOptional()
  @IsUUID()
  productionUnitId?: string;
}

export class CtpBatchRequestDto {
  /** Si se envía, resuelve UP default por variante cuando falta productionUnitId. */
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CtpBatchItemDto)
  items!: CtpBatchItemDto[];
}
