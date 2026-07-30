import { IsUUID, IsNumber, IsPositive, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInstallmentDto {
  @IsUUID()
  transactionId!: string;

  @IsNumber()
  @IsPositive()
  @Min(1)
  numberOfInstallments!: number;

  @IsNumber()
  @IsPositive()
  totalAmount!: number;

  @IsDate()
  @Type(() => Date)
  firstDueDate!: Date;
}
