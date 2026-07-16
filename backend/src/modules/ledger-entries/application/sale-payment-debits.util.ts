import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import type { PaymentSnapshot } from '@modules/transactions/domain/payment-snapshot.types';

/** Códigos de activo usados como destino del debe de cobro en ventas. */
export const SALE_PAYMENT_ASSET_ACCOUNT_CODES = [
  '1.1.01',
  '1.1.02',
  '1.1.03',
  '1101',
  '1102',
  '1201',
] as const;

const ACCOUNT_CODE_ALIASES: Record<string, string[]> = {
  '1.1.01': ['1.1.01', '1101'],
  '1.1.02': ['1.1.02', '1102'],
  '1.1.03': ['1.1.03', '1201'],
  '2.1.10': ['2.1.10', '2110'],
};

/**
 * Cuenta de activo (debe) según medio de pago.
 * CASH → caja; tarjetas/transfer/cheque → banco; crédito/NC/abono → clientes.
 */
export function resolveAssetAccountCodeForPaymentMethod(method: string): string {
  const m = String(method ?? '').trim().toUpperCase();
  if (m === PaymentMethod.CASH) {
    return '1.1.01';
  }
  if (
    m === PaymentMethod.CREDIT_CARD ||
    m === PaymentMethod.DEBIT_CARD ||
    m === PaymentMethod.TRANSFER ||
    m === PaymentMethod.CHECK ||
    m === PaymentMethod.VOUCHER
  ) {
    return '1.1.02';
  }
  if (
    m === PaymentMethod.INTERNAL_CREDIT ||
    m === PaymentMethod.CUSTOMER_CREDIT_NOTE ||
    m === PaymentMethod.ORDER_ADVANCE ||
    m === 'CREDIT'
  ) {
    return '1.1.03';
  }
  return '1.1.01';
}

export function resolveAccountIdByCode(
  canonicalCode: string,
  accountByCode: Map<string, string>,
): string | null {
  const candidates = ACCOUNT_CODE_ALIASES[canonicalCode] ?? [canonicalCode];
  for (const code of candidates) {
    const id = accountByCode.get(code);
    if (id) return id;
  }
  return null;
}

export function isSalePaymentAssetAccountCode(code: string): boolean {
  return (SALE_PAYMENT_ASSET_ACCOUNT_CODES as readonly string[]).includes(code);
}

export type SalePaymentDebitLine = {
  accountId: string;
  debit: number;
  description: string;
  metadata: Record<string, unknown>;
};

/**
 * Un debe por línea de `metadata.payments` con monto > 0.
 */
export function allocateSalePaymentDebits(
  snapshots: PaymentSnapshot[],
  accountByCode: Map<string, string>,
  baseDescription: string,
): { lines: SalePaymentDebitLine[]; warnings: string[] } {
  const lines: SalePaymentDebitLine[] = [];
  const warnings: string[] = [];

  for (const snap of snapshots) {
    const amount = Number(snap.amount) || 0;
    if (amount <= 0) continue;

    const canonical = resolveAssetAccountCodeForPaymentMethod(snap.method);
    const accountId = resolveAccountIdByCode(canonical, accountByCode);
    if (!accountId) {
      warnings.push(
        `No account for payment method ${snap.method} (expected ${canonical})`,
      );
      continue;
    }

    const methodLabel = String(snap.alias ?? snap.method ?? 'pago').trim();
    lines.push({
      accountId,
      debit: amount,
      description: `${baseDescription} — ${methodLabel}`,
      metadata: {
        scope: 'SALE_PAYMENT',
        paymentMethod: snap.method,
        paymentAmount: amount,
        companyPaymentMethodId: snap.companyPaymentMethodId,
      },
    });
  }

  return { lines, warnings };
}
