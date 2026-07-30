import { InstallmentStatus } from '@modules/installments/domain/installment.entity';

export type AccountsReceivableOriginCategory = 'INSTALLMENT';

export interface AccountsReceivableRowDto {
  id: string;
  originCategory: AccountsReceivableOriginCategory;
  documentNumber: string | null;
  saleTransactionId: string | null;
  customerId: string | null;
  customerName: string | null;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  amountPaid: number;
  pendingAmount: number;
  dueDate: string | null;
  status: InstallmentStatus | string;
  isOverdue: boolean;
  daysOverdue: number;
  createdAt: string;
}

export type AccountsReceivableListFilters = {
  companyId?: string;
  status?: InstallmentStatus | InstallmentStatus[];
  includePaid?: boolean;
  overdueOnly?: boolean;
  customerId?: string;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  pageSize?: number;
};
