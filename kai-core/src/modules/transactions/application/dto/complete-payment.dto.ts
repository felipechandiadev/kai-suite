import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CompletePaymentCheckDataDto {
  @IsString()
  checkNumber!: string;

  @IsString()
  bankName!: string;

  @IsOptional()
  @IsString()
  bankAccountKey?: string | null;

  @IsOptional()
  @IsString()
  drawerName?: string | null;

  @IsOptional()
  @IsString()
  dueDate?: string | null;

  @IsOptional()
  @IsString()
  payeeName?: string | null;
}

export class CompletePaymentDto {
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  bankAccountKey?: string;

  @IsOptional()
  @IsString()
  cashHubId?: string;

  @IsOptional()
  @IsObject()
  supplierBankAccount?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  companyBankAccount?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CompletePaymentCheckDataDto)
  checkData?: CompletePaymentCheckDataDto;
}