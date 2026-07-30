import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';

export class CompleteAccountsReceivablePaymentDto {
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  companyAccountKey?: string;

  @IsOptional()
  @IsUUID()
  cashHubId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
