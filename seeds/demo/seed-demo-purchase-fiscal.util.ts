import { PRIMARY_BANK_ACCOUNT_KEY } from './config';
import type { SeedPurchaseDoc } from './seed-demo-purchase-plan';

export type SupplierFiscalAmountsPayload = {
  subtotalNeto: number;
  taxAmount: number;
  total: number;
  taxId: string;
  taxRatePct: number;
};

export type SupplierDocumentPaymentPayload = {
  mode: 'COMPLETED' | 'PENDING_SCHEDULED';
  paidLines: Array<{
    dueDate: string;
    amount: number;
    paymentMethod: 'TRANSFER';
    companyBankAccountKey: string;
  }>;
  scheduledLines: Array<{
    dueDate: string;
    amount: number;
  }>;
};

function roundClp(value: number): number {
  return Math.round(Number(value) || 0);
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function computeLineSubtotalNeto(
  lines: Array<{ qty: number; unitCost: number }>,
): number {
  return roundClp(
    lines.reduce((sum, line) => sum + line.qty * line.unitCost, 0),
  );
}

export function buildSupplierFiscalAmounts(
  subtotalNeto: number,
  ivaTaxId: string,
  taxRatePct = 19,
): SupplierFiscalAmountsPayload {
  const taxAmount = roundClp(subtotalNeto * (taxRatePct / 100));
  return {
    subtotalNeto,
    taxAmount,
    total: subtotalNeto + taxAmount,
    taxId: ivaTaxId,
    taxRatePct,
  };
}

function splitInstallments(total: number, count: 2 | 3): number[] {
  const base = Math.floor(total / count);
  const amounts = Array.from({ length: count }, () => base);
  const remainder = total - base * count;
  amounts[amounts.length - 1] += remainder;
  return amounts;
}

export function buildSupplierDocumentPayment(
  doc: SeedPurchaseDoc,
  fiscalTotal: number,
  occurredOn: string,
): SupplierDocumentPaymentPayload {
  if (doc.paymentStrategy === 'transfer') {
    return {
      mode: 'COMPLETED',
      paidLines: [
        {
          dueDate: occurredOn,
          amount: fiscalTotal,
          paymentMethod: 'TRANSFER',
          companyBankAccountKey: PRIMARY_BANK_ACCOUNT_KEY,
        },
      ],
      scheduledLines: [],
    };
  }

  const installmentCount = doc.paymentStrategy === 'installments_2' ? 2 : 3;
  const gapDays = installmentCount === 2 ? 30 : 15;
  const amounts = splitInstallments(fiscalTotal, installmentCount);

  return {
    mode: 'PENDING_SCHEDULED',
    paidLines: [],
    scheduledLines: amounts.map((amount, index) => ({
      dueDate: addDaysToIsoDate(occurredOn, gapDays * (index + 1)),
      amount,
    })),
  };
}
