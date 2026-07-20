import { PRIMARY_BANK_ACCOUNT_KEY } from './config';
import type { SeedPurchaseDoc } from './seed-demo-purchase-plan';

export type SupplierFiscalAmountsPayload = {
  subtotalNeto: number;
  taxAmount: number;
  total: number;
  taxId: string;
  taxRatePct: number;
};

export type SupplierPaymentMethod = 'TRANSFER' | 'CHECK';

export type SupplierDocumentPaymentLine = {
  dueDate: string;
  amount: number;
  paymentMethod: SupplierPaymentMethod;
  companyBankAccountKey: string;
  chequeNumber?: string;
};

export type SupplierDocumentPaymentPayload = {
  mode: 'COMPLETED' | 'PARTIAL' | 'PENDING_SCHEDULED';
  partialPaidAmount?: number;
  paidLines: SupplierDocumentPaymentLine[];
  scheduledLines: SupplierDocumentPaymentLine[];
  paidInstallments: number;
  pendingInstallments: number;
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

function chequeNumberForDoc(doc: SeedPurchaseDoc): string {
  const digits = doc.reference.replace(/\D/g, '').slice(-6) || '000001';
  return `SEED-CHQ-${digits}`;
}

/**
 * Contado o cuotas con settle-by-today:
 * vencidas → paidLines (CONFIRMED); futuras → scheduledLines (DRAFT).
 */
export function buildSupplierDocumentPayment(
  doc: SeedPurchaseDoc,
  fiscalTotal: number,
  occurredOn: string,
  todayIso?: string,
): SupplierDocumentPaymentPayload {
  const today = (todayIso ?? new Date().toISOString().slice(0, 10)).slice(0, 10);

  if (doc.paymentStrategy === 'transfer' || doc.paymentStrategy === 'check') {
    const isCheck = doc.paymentStrategy === 'check';
    const paidLine: SupplierDocumentPaymentLine = {
      dueDate: occurredOn,
      amount: fiscalTotal,
      paymentMethod: isCheck ? 'CHECK' : 'TRANSFER',
      companyBankAccountKey: PRIMARY_BANK_ACCOUNT_KEY,
      ...(isCheck ? { chequeNumber: chequeNumberForDoc(doc) } : {}),
    };
return {
    mode: 'COMPLETED',
      paidLines: [paidLine],
      scheduledLines: [],
      paidInstallments: 1,
      pendingInstallments: 0,
    };
  }

  const installmentCount = doc.paymentStrategy === 'installments_2' ? 2 : 3;
  const gapDays = installmentCount === 2 ? 30 : 15;
  const amounts = splitInstallments(fiscalTotal, installmentCount);

  const paidLines: SupplierDocumentPaymentLine[] = [];
  const scheduledLines: SupplierDocumentPaymentLine[] = [];

  amounts.forEach((amount, index) => {
    const dueDate = addDaysToIsoDate(occurredOn, gapDays * (index + 1));
    const line: SupplierDocumentPaymentLine = {
      dueDate,
      amount,
      paymentMethod: 'TRANSFER',
      companyBankAccountKey: PRIMARY_BANK_ACCOUNT_KEY,
    };
    if (dueDate <= today) {
      paidLines.push(line);
    } else {
      scheduledLines.push(line);
    }
  });

  let mode: SupplierDocumentPaymentPayload['mode'];
  if (paidLines.length === 0) {
    mode = 'PENDING_SCHEDULED';
  } else if (scheduledLines.length === 0) {
    mode = 'COMPLETED';
  } else {
    mode = 'PARTIAL';
  }

  const paidSum = paidLines.reduce((s, l) => s + l.amount, 0);

  return {
    mode,
    ...(mode === 'PARTIAL' ? { partialPaidAmount: paidSum } : {}),
    paidLines,
    scheduledLines,
    paidInstallments: paidLines.length,
    pendingInstallments: scheduledLines.length,
  };
}
