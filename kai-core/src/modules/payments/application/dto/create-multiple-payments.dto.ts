import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';

export class SubPaymentDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsNumber()
  amount: number;

  @IsString()
  dueDate: string;
}

export class PaymentItemDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubPaymentDto)
  subPayments?: SubPaymentDto[];
}

export class CreateMultiplePaymentsDto {
  @IsString()
  saleTransactionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  payments: PaymentItemDto[];
}
