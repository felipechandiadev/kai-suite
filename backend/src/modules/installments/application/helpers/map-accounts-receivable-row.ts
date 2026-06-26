import { Installment } from '@modules/installments/domain/installment.entity';
import { AccountsReceivableRowDto } from '../dto/accounts-receivable-row.dto';

function formatDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  const s = String(value).trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

export function mapInstallmentToAccountsReceivableRow(
  inst: Installment,
  today: Date = new Date(),
): AccountsReceivableRowDto {
  const transaction = (inst as Installment & { saleTransaction?: any }).saleTransaction;
  const person = transaction?.customer?.person;
  const customerName =
    (person?.businessName ?? '').trim() ||
    [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim() ||
    null;

  const amount = Number(inst.amount || 0);
  const amountPaid = Number(inst.amountPaid || 0);
  const pendingAmount = inst.getPendingAmount();
  const isOverdue = inst.isOverdue(today);
  const daysOverdue = inst.getDaysOverdue(today);
  const status =
    isOverdue && inst.status !== 'PAID' ? 'OVERDUE' : String(inst.status);

  const createdAtRaw = transaction?.createdAt ?? inst.createdAt;
  const createdAt =
    createdAtRaw instanceof Date
      ? createdAtRaw.toISOString()
      : String(createdAtRaw ?? '');

  return {
    id: inst.id,
    originCategory: 'INSTALLMENT',
    documentNumber:
      transaction?.documentNumber ?? inst.sourceTransactionId ?? null,
    saleTransactionId: inst.sourceTransactionId ?? inst.saleTransactionId ?? null,
    customerId: transaction?.customerId ?? inst.payeeId ?? null,
    customerName,
    installmentNumber: inst.installmentNumber,
    totalInstallments: inst.totalInstallments,
    amount,
    amountPaid,
    pendingAmount,
    dueDate: formatDateOnly(inst.dueDate),
    status,
    isOverdue,
    daysOverdue,
    createdAt,
  };
}
