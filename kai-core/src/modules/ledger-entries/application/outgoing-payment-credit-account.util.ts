import {
  PaymentMethod,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { RuleScope } from '@modules/accounting-rules/domain/accounting-rule.entity';
import { resolveAccountIdByCode } from './sale-payment-debits.util';

type LedgerEntryDraft = {
  transactionId: string;
  accountId: string;
  personId?: string | null;
  entryDate: Date;
  description: string;
  debit: number;
  credit: number;
  metadata?: Record<string, unknown>;
};

/** Pasivo: cheques emitidos pendientes de compensación en banco. */
export const OUTGOING_CHECKS_PAYABLE_ACCOUNT_CODE = '2.1.10';

const OUTGOING_PAYMENT_TYPES = new Set<TransactionType>([
  TransactionType.SUPPLIER_PAYMENT,
  TransactionType.PAYROLL_PAYMENT,
  TransactionType.EXPENSE_PAYMENT,
]);

/**
 * En pagos salientes con cheque, el haber no debe ir a banco sino a cheques por pagar.
 */
export function resolveOutgoingPaymentCreditAccountCode(
  transactionType: TransactionType,
  paymentMethod: string | null | undefined,
): string | null {
  if (!OUTGOING_PAYMENT_TYPES.has(transactionType)) {
    return null;
  }
  if (String(paymentMethod ?? '').toUpperCase() !== PaymentMethod.CHECK) {
    return null;
  }
  return OUTGOING_CHECKS_PAYABLE_ACCOUNT_CODE;
}

export function shouldSkipPaymentExecutionLedger(
  paymentMethod: string | null | undefined,
): boolean {
  return String(paymentMethod ?? '').toUpperCase() === PaymentMethod.CHECK;
}

/**
 * Reemplaza el haber de la regla contable (banco) por cheques por pagar emitidos.
 */
export function applyOutgoingCheckCreditOverride(
  entries: LedgerEntryDraft[],
  accountByCode: Map<string, string>,
): LedgerEntryDraft[] {
  const payableId = resolveAccountIdByCode(
    OUTGOING_CHECKS_PAYABLE_ACCOUNT_CODE,
    accountByCode,
  );
  if (!payableId) {
    return entries;
  }

  return entries.map((entry) => {
    if (
      entry.credit > 0 &&
      entry.metadata?.scope === RuleScope.TRANSACTION
    ) {
      return {
        ...entry,
        accountId: payableId,
        description: `${entry.description} (cheque emitido)`,
        metadata: {
          ...entry.metadata,
          outgoingCheckPayable: true,
        },
      };
    }
    return entry;
  });
}
