import { IsString, IsNumber, IsOptional } from 'class-validator';

export class PayQuotaDto {
  @IsString()
  saleTransactionId: string;

  @IsString()
  paidQuotaId: string;

  @IsNumber()
  amount: number;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  bankAccountId?: string;
}
