import {
  Transaction,
  TransactionType,
} from '../../domain/transaction.entity';

export type AccountsPayableOriginCategory =
  | 'PURCHASE'
  | 'OPERATING_EXPENSE'
  | 'PAYROLL'
  | 'OTHER';

function readOperationalExpenseIdFromMetadata(
  metadata: unknown,
): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  const meta = metadata as Record<string, unknown>;
  const direct = meta.operationalExpenseId;
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }
  const links = meta.links;
  if (!links || typeof links !== 'object') {
    return null;
  }
  const fromLinks = (links as { operationalExpenseId?: unknown })
    .operationalExpenseId;
  if (typeof fromLinks === 'string' && fromLinks.trim()) {
    return fromLinks.trim();
  }
  return null;
}

export function isOperationalExpenseParent(parent?: Transaction | null): boolean {
  if (!parent) {
    return false;
  }
  if (parent.transactionType === TransactionType.OPERATING_EXPENSE) {
    return true;
  }
  return Boolean(readOperationalExpenseIdFromMetadata(parent.metadata));
}

export function resolveAccountsPayableOriginCategory(
  paymentType: TransactionType,
  parent?: Transaction | null,
): AccountsPayableOriginCategory {
  if (paymentType === TransactionType.PAYROLL_PAYMENT) {
    return 'PAYROLL';
  }
  if (paymentType === TransactionType.EXPENSE_PAYMENT) {
    return 'OPERATING_EXPENSE';
  }
  if (paymentType === TransactionType.SUPPLIER_PAYMENT) {
    if (isOperationalExpenseParent(parent)) {
      return 'OPERATING_EXPENSE';
    }
    return 'PURCHASE';
  }
  return 'OTHER';
}
