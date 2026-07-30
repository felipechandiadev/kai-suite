import { Type, Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  ValidateIf,
  IsNumber,
  Min,
} from 'class-validator';

export class CreatePurchaseOrderLineDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  variantId!: string;

  @IsString()
  productName!: string;

  @IsString()
  sku!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsArray()
  @IsUUID('4', { each: true })
  taxIds!: string[];
}

/**
 * Payload HTTP para crear una orden de compra (transacción PURCHASE_ORDER).
 * El backend calcula montos de impuesto por línea según tasas vigentes.
 */
export class CreatePurchaseOrderDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  branchId!: string;

  /** Obligatorio salvo orden en borrador (`saveAsDraft`). */
  @ValidateIf((o) => !o.saveAsDraft)
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  saveAsDraft?: boolean;

  /** Opcional: la recepción/compra posterior puede fijar el almacén. */
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : value,
  )
  @IsUUID()
  storageId?: string;

  @IsDateString()
  documentDate!: string;

  @IsOptional()
  @IsString()
  documentFolio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32000)
  notes?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto)
  @ValidateIf((o) => !o.saveAsDraft)
  @ArrayMinSize(1)
  lines?: CreatePurchaseOrderLineDto[];
}
