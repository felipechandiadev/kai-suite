import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { VARIANT_TAX_CATEGORIES } from '../../domain/variant-tax-category';

export class PriceListItemInputDto {
  @IsUUID()
  priceListId!: string;

  @Transform(({ value }) => Math.round(Number(value)))
  @Type(() => Number)
  @IsInt()
  @Min(0)
  netPrice!: number;

  @Transform(({ value }) => Math.round(Number(value)))
  @Type(() => Number)
  @IsInt()
  @Min(0)
  grossPrice!: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  taxIds?: string[];
}

export class CreateProductVariantDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsNotEmpty()
  @IsString()
  sku!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @Type(() => Number)
  @IsNumber()
  basePrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  baseCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pmp?: number;

  @IsOptional()
  @IsUUID()
  stockBaseUnitId?: string;

  @IsOptional()
  @IsUUID()
  purchaseUnitId?: string;

  /** Legacy: unidad de venta; si se omite, usar `saleUnitId`. */
  @ValidateIf((o) => !o.saleUnitId)
  @IsUUID()
  unitId?: string;

  @ValidateIf((o) => !o.unitId)
  @IsUUID()
  saleUnitId?: string;

  /** Peso neto del producto (kg), sin embalaje. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  netWeightKg?: number;

  /** Peso bruto con embalaje (kg), típico para courier/ERP. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  grossWeightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  packageLengthCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  packageWidthCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  packageHeightCm?: number;

  /**
   * Divisor K en (L×W×H cm³)/K → kg volumétrico. Si se omite, usar default de aplicación (p. ej. 5000).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  volumetricDivisorK?: number;

  @IsOptional()
  @IsObject()
  attributeValues?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  taxIds?: string[];

  @IsOptional()
  @IsIn([...VARIANT_TAX_CATEGORIES])
  taxCategory?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  requiresDte?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  trackInventory?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  allowNegativeStock?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumStock?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  minimumStockEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maximumStock?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  maximumStockEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  reorderPointEnabled?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  visibleInEShop?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceListItemInputDto)
  priceListItems?: PriceListItemInputDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  multimediaAssetIds?: string[];

  /**
   * Stock base (masa/volumen/longitud) por 1 unidad de venta en conteo.
   * Obligatorio si unidad de venta es `count` y stock base no lo es.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stockBaseQtyPerCountSaleUnit?: number;

  /**
   * Stock base por 1 unidad de compra en conteo.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stockBaseQtyPerCountPurchaseUnit?: number;
}