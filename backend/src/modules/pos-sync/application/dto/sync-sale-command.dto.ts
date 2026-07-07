import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PaymentDetailDto,
  PromotionSnapshotDto,
  SaleLineDto,
} from '@modules/cash-sessions/application/dto/create-sale.dto';

export class OfflineFiscalSyncDto {
  @IsNumber()
  folio!: number;

  @IsUUID()
  allocationId!: string;

  @IsUUID()
  cafId!: string;

  @IsString()
  tedXml!: string;

  @IsString()
  issuedAt!: string;
}

export class SyncSaleCommandDto {
  @IsString()
  clientOperationId!: string;

  @IsString()
  deviceId!: string;

  @IsString()
  commandType!: 'SALE';

  @IsString()
  userName!: string;

  @IsString()
  pointOfSaleId!: string;

  @IsString()
  cashSessionId!: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  lines!: SaleLineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDetailDto)
  payments?: PaymentDetailDto[];

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsNumber()
  changeAmount?: number;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  saleDocumentKind?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromotionSnapshotDto)
  promotionSnapshot?: PromotionSnapshotDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => OfflineFiscalSyncDto)
  fiscal?: OfflineFiscalSyncDto;
}
