import { IsUUID, IsDateString } from 'class-validator';

export class GetCarteraByDueDateDto {
  @IsDateString()
  fromDate!: string;

  @IsDateString()
  toDate!: string;
}

export class InstallmentDto {
  id!: string;
  saleTransactionId?: string | null;
  installmentNumber!: number;
  totalInstallments!: number;
  amount!: number;
  dueDate!: Date;
  amountPaid!: number;
  status!: string;
  paymentTransactionId?: string;
  metadata?: Record<string, any>;
  createdAt!: Date;
}

export class TransactionCarteraSummaryDto {
  totalInstallments!: number;
  totalAmount!: number;
  totalPaid!: number;
  pendingAmount!: number;
  paidInstallments!: number;
  pendingInstallments!: number;
  status!: string;
  installments?: InstallmentDto[];
}
