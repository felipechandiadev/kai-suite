import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
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
import { PriceListItemInputDto } from './create-product-variant.dto';
import { VARIANT_TAX_CATEGORIES } from '../../domain/variant-tax-category';

export class UpdateProductVariantDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  basePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  baseCost?: number;

  /** MO fija por pieza (override). null limpia el override. */
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  laborCostOverride?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pmp?: number;

  @IsOptional()
  @IsUUID()
  stockBaseUnitId?: string;

  @IsOptional()
  @IsUUID()
  saleUnitId?: string;

  @IsOptional()
  @IsUUID()
  purchaseUnitId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  netWeightKg?: number;

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stockBaseQtyPerCountSaleUnit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stockBaseQtyPerCountPurchaseUnit?: number;
}