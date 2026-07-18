import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class DiningOrderProfileDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  adultCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  childCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  customerName?: string;
}

export class UpdateDiningOrderProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  customerName?: string;
}

export class OpenTableDto {
  @IsNotEmpty()
  @IsUUID()
  branchId!: string;

  @IsNotEmpty()
  @IsUUID()
  diningTableId!: string;

  /** Canal que solicita la apertura (política por sucursal). */
  @IsNotEmpty()
  @IsIn(['WAITER', 'POS'])
  openedFrom!: 'WAITER' | 'POS';

  @IsOptional()
  profile?: DiningOrderProfileDto;
}

export class OpenCounterOrderDto {
  @IsNotEmpty()
  @IsUUID()
  branchId!: string;

  @IsOptional()
  profile?: DiningOrderProfileDto;
}

export class OpenTakeawayOrderDto {
  @IsNotEmpty()
  @IsUUID()
  branchId!: string;

  @IsOptional()
  profile?: DiningOrderProfileDto;
}

export class AddOrderItemDto {
  @IsNotEmpty()
  @IsUUID()
  productVariantId!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class UpdateDiningOrderLineDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(200)
  notes?: string | null;
}

export class AddOrderItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AddOrderItemDto)
  items!: AddOrderItemDto[];
}

export class TransferCartLineDto {
  @IsNotEmpty()
  @IsUUID()
  diningOrderId!: string;

  @IsNotEmpty()
  @IsUUID()
  productVariantId!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class CloseDiningOrderDto {
  @IsOptional()
  @IsUUID()
  linkedTransactionId?: string;
}

export class SendToKitchenDto {
  /** Si se envía, solo esas líneas DRAFT pasan a SENT. Si se omite, envía todos los borradores. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  lineIds?: string[];
}

export class MarkKitchenFireReadyDto {
  @IsNotEmpty()
  @IsUUID()
  productionUnitId!: string;
}
