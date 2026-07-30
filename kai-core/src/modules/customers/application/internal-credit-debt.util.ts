import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import { getPaymentSnapshotsFromMetadata } from '@modules/transactions/application/payment-snapshots.util';

export type OpenCreditMode = 'CREDIT_LUMP' | 'UNKNOWN';

export type OpenCreditSaleLike = {
  id: string;
  documentNumber?: string | null;
  createdAt?: Date | string | null;
  total?: number | null;
  paymentMethod?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Monto de crédito interno en una SALE a partir de snapshots / paymentMethod.
 */
export function extractInternalCreditAmountFromSale(
  sale: OpenCreditSaleLike,
): number {
  const snapshots = getPaymentSnapshotsFromMetadata(sale.metadata ?? null);
  let sum = snapshots
    .filter(
      (s) =>
        String(s.method ?? '')
          .trim()
          .toUpperCase() === PaymentMethod.INTERNAL_CREDIT,
    )
    .reduce((acc, s) => acc + Math.round(Number(s.amount) || 0), 0);

  if (sum <= 0) {
    const method = String(sale.paymentMethod ?? '')
      .trim()
      .toUpperCase();
    if (method === PaymentMethod.INTERNAL_CREDIT) {
      sum = Math.round(Number(sale.total) || 0);
    }
  }
  return Math.max(0, sum);
}

export function extractOpenCreditModeFromSale(
  sale: OpenCreditSaleLike,
): OpenCreditMode {
  const meta = sale.metadata;
  if (!meta || typeof meta !== 'object') return 'UNKNOWN';
  const plan = meta.customerCreditPlan;
  if (plan && typeof plan === 'object') {
    const mode = String((plan as { mode?: unknown }).mode ?? '')
      .trim()
      .toUpperCase();
    if (mode === 'CREDIT_LUMP') return 'CREDIT_LUMP';
    if (mode === 'CREDIT_SCHEDULED' || mode === 'PARTIAL_WITH_SCHEDULE') {
      return 'UNKNOWN';
    }
  }
  return 'CREDIT_LUMP';
}

export function buildOpenCreditRowsFromSales(
  sales: OpenCreditSaleLike[],
  saleIdsWithInstallments: ReadonlySet<string>,
): Array<{
  transactionId: string;
  documentNumber: string | null;
  saleDate: string | null;
  creditAmount: number;
  mode: OpenCreditMode;
}> {
  const rows: Array<{
    transactionId: string;
    documentNumber: string | null;
    saleDate: string | null;
    creditAmount: number;
    mode: OpenCreditMode;
  }> = [];

  for (const sale of sales) {
    if (!sale.id || saleIdsWithInstallments.has(sale.id)) continue;
    const creditAmount = extractInternalCreditAmountFromSale(sale);
    if (creditAmount < 1) continue;
    const mode = extractOpenCreditModeFromSale(sale);
    // Scheduled modes always create installments; if somehow missing, still surface as open.
    const created = sale.createdAt
      ? sale.createdAt instanceof Date
        ? sale.createdAt.toISOString()
        : String(sale.createdAt)
      : null;
    rows.push({
      transactionId: sale.id,
      documentNumber: sale.documentNumber?.trim() || null,
      saleDate: created,
      creditAmount,
      mode: mode === 'UNKNOWN' ? 'UNKNOWN' : 'CREDIT_LUMP',
    });
  }

  return rows;
}
