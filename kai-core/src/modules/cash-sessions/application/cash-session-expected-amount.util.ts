import {
  PaymentMethod,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { customerCreditNotePayoutCashFlows } from './customer-credit-note-payout-cash-flow.util';
import { saleReturnTransactionCashFlows } from './sale-return-transaction-cash-flow.util';
import { saleTransactionCashFlows } from './sale-transaction-cash-flow.util';

/** PAYMENT_IN generado por el POS junto a la SALE; el efectivo ya cuenta en la venta. */
export function isPosLinkedPaymentIn(tx: Transaction): boolean {
  if (tx.transactionType !== TransactionType.PAYMENT_IN) {
    return false;
  }
  const meta = tx.metadata;
  if (meta && typeof meta === 'object') {
    const source = (meta as { source?: unknown }).source;
    return source === 'pos_sale';
  }
  return false;
}

/**
 * Efectivo esperado en cajón = apertura (campo sesión) + entradas − salidas.
 * `CASH_SESSION_OPENING` no se suma en el loop: la apertura ya está en `openingAmount`
 * y la misma operación crea esa transacción solo para el listado de movimientos.
 */
export function computeCashSessionExpectedAmount(
  openingAmount: number,
  transactions: Transaction[],
): number {
  const opening = Number(openingAmount) || 0;
  let cashIn = 0;
  let cashOut = 0;

  for (const tx of transactions) {
    if (tx.status !== TransactionStatus.CONFIRMED) {
      continue;
    }
    const total = Number(tx.total) || 0;
    switch (tx.transactionType) {
      case TransactionType.CASH_SESSION_OPENING:
        break;
      case TransactionType.CASH_SESSION_DEPOSIT:
        cashIn += total;
        break;
      case TransactionType.CUSTOMER_CREDIT_NOTE_PAYOUT: {
        const ncPayout = customerCreditNotePayoutCashFlows(tx);
        cashOut += ncPayout.cashOut;
        break;
      }
      case TransactionType.PAYMENT_IN: {
        if (isPosLinkedPaymentIn(tx)) {
          break;
        }
        const legacyNcPayout = customerCreditNotePayoutCashFlows(tx);
        if (legacyNcPayout.cashOut > 0) {
          cashOut += legacyNcPayout.cashOut;
          break;
        }
        if (tx.paymentMethod === PaymentMethod.CASH) {
          const change = Math.max(0, Number(tx.changeAmount) || 0);
          cashIn += Math.max(0, total - change);
        }
        break;
      }
      case TransactionType.SALE: {
        const { cashIn: saleIn, cashOut: saleOut } = saleTransactionCashFlows(tx);
        cashIn += saleIn;
        cashOut += saleOut;
        break;
      }
      case TransactionType.CASH_SESSION_WITHDRAWAL:
      case TransactionType.CASH_SESSION_TO_HUB_TRANSFER:
      case TransactionType.BANK_TO_CASH_TRANSFER:
        cashOut += total;
        break;
      case TransactionType.OPERATING_EXPENSE:
      case TransactionType.SUPPLIER_PAYMENT:
      case TransactionType.PAYROLL_PAYMENT:
      case TransactionType.EXPENSE_PAYMENT:
        if (tx.paymentMethod === PaymentMethod.CASH && tx.cashSessionId) {
          cashOut += total;
        }
        break;
      case TransactionType.SALE_RETURN: {
        const { cashOut: returnOut } = saleReturnTransactionCashFlows(tx);
        cashOut += returnOut;
        break;
      }
      default:
        break;
    }
  }

  return Number((opening + cashIn - cashOut).toFixed(2));
}
