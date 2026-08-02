import {
  PaymentMethod,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { getPaymentSnapshots } from '@modules/transactions/application/payment-snapshots.util';
import { isCardTipPaymentMethod } from '@modules/tips/domain/tip-business-days.util';

type SaleTxLike = {
  transactionType: TransactionType;
  paymentMethod?: PaymentMethod | string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Tip cobrado en una SALE (metadata.tipAmount), clasificado efectivo vs tarjeta
 * para arqueo (fuera del total fiscal).
 */
export function saleTipTenderBreakdown(tx: SaleTxLike): {
  tipCash: number;
  tipCard: number;
} {
  if (tx.transactionType !== TransactionType.SALE) {
    return { tipCash: 0, tipCard: 0 };
  }
  const meta = tx.metadata ?? {};
  const tipAmount = Math.max(0, Math.round(Number(meta.tipAmount) || 0));
  if (tipAmount <= 0) return { tipCash: 0, tipCard: 0 };

  const snapshots = getPaymentSnapshots(tx as never);
  let hasCash = false;
  let hasCard = false;
  if (snapshots.length > 0) {
    for (const s of snapshots) {
      const m = String(s.method ?? '').toUpperCase();
      if (m === 'CASH') hasCash = true;
      if (isCardTipPaymentMethod(m)) hasCard = true;
    }
  } else {
    const pm = String(tx.paymentMethod ?? '').toUpperCase();
    if (pm === 'CASH') hasCash = true;
    if (isCardTipPaymentMethod(pm)) hasCard = true;
  }

  // Si el cobro fue mixto, asignamos tip a tarjeta si hubo tarjeta; si no, a efectivo.
  if (hasCard) return { tipCash: 0, tipCard: tipAmount };
  if (hasCash) return { tipCash: tipAmount, tipCard: 0 };
  // Fallback: tip sin medio claro → tarjeta si dueAt existiría; aquí "other" como card bucket
  return { tipCash: 0, tipCard: tipAmount };
}

export function sumSaleTipTenders(
  transactions: SaleTxLike[],
): { tipCash: number; tipCard: number; tipTotal: number } {
  let tipCash = 0;
  let tipCard = 0;
  for (const tx of transactions) {
    const t = saleTipTenderBreakdown(tx);
    tipCash += t.tipCash;
    tipCard += t.tipCard;
  }
  return {
    tipCash: Math.round(tipCash * 100) / 100,
    tipCard: Math.round(tipCard * 100) / 100,
    tipTotal: Math.round((tipCash + tipCard) * 100) / 100,
  };
}
