import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Línea de pago planificado (abono o cuota). */
export class SupplierDocumentPaymentLineDto {
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsIn(['CASH', 'TRANSFER', 'CHECK'])
  paymentMethod?: 'CASH' | 'TRANSFER' | 'CHECK';

  @IsOptional()
  companyBankAccountKey?: string | null;

  @IsOptional()
  supplierBankAccountKey?: string | null;

  @IsOptional()
  chequeNumber?: string | null;

  @IsOptional()
  cashHubId?: string | null;

  @IsOptional()
  cashSessionId?: string | null;
}

/** Plan de pago de documento proveedor (factura, boleta, gasto operativo). */
export class SupplierDocumentPaymentPlanDto {
  @IsIn(['PENDING', 'PENDING_SCHEDULED', 'PARTIAL', 'COMPLETED'])
  mode!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  partialPaidAmount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierDocumentPaymentLineDto)
  paidLines!: SupplierDocumentPaymentLineDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierDocumentPaymentLineDto)
  scheduledLines!: SupplierDocumentPaymentLineDto[];
}
