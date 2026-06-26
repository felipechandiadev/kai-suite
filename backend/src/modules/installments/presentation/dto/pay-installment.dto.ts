import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';

export class PayInstallmentDto {
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  companyAccountKey?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  cashHubId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
