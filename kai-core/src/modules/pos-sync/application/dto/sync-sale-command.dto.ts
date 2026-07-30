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
import { SyncCommandBaseDto } from './sync-command-base.dto';

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

export class SyncSaleCommandDto extends SyncCommandBaseDto {
  declare commandType: 'SALE';

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
