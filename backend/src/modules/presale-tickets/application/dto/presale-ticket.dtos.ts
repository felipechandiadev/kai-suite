import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePresaleTicketLineDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @IsString()
  productName!: string;

  @IsOptional()
  @IsString()
  productSku?: string;

  @IsOptional()
  @IsString()
  variantName?: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsNumber()
  subtotal!: number;

  @IsNumber()
  total!: number;

  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @IsOptional()
  promotionSnapshot?: Record<string, unknown>;
}

export class CreatePresaleTicketDto {
  @IsUUID()
  presalePointOfSaleId!: string;

  @IsUUID()
  priceListId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePresaleTicketLineDto)
  lines!: CreatePresaleTicketLineDto[];

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerDocument?: string;

  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsNumber()
  total!: number;

  @IsOptional()
  promotionsSnapshot?: Record<string, unknown>[];
}
