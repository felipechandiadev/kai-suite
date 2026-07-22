import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateRecurringFromOperatingExpenseDto {
  @IsNotEmpty()
  @IsUUID()
  companyId!: string;

  @IsNotEmpty()
  @IsUUID()
  operationalExpenseId!: string;

  @IsNotEmpty()
  @IsUUID()
  createdBy!: string;

  @IsOptional()
  @IsUUID()
  taxId?: string | null;
}
