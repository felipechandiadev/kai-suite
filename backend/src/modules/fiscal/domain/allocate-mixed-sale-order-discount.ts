import type { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import {
  filterDteTransactionLines,
  type VariantRequiresDteMap,
} from './filter-dte-transaction-lines';
import type { SaleBoletaDocument, SaleBoletaLine } from './sale-boleta.types';

function transactionLineGross(line: TransactionLine): number {
  return Math.max(0, Math.round(Number(line.total) || 0));
}

function bucketGross(lines: TransactionLine[]): number {
  return lines.reduce((acc, line) => acc + transactionLineGross(line), 0);
}

export function resolveTransactionOrderDiscount(
  transactionDiscountAmount: number,
  lines: TransactionLine[],
): number {
  const lineDiscountTotal = lines.reduce(
    (acc, line) => acc + Math.max(0, Math.round(Number(line.discountAmount) || 0)),
    0,
  );
  return Math.max(0, Math.round(Number(transactionDiscountAmount) || 0) - lineDiscountTotal);
}

export function allocateOrderDiscountForTransactionLines(
  allLines: TransactionLine[],
  requiresDteByVariantId: VariantRequiresDteMap,
  orderDiscount: number,
): { dteOrderDiscount: number; nonDteOrderDiscount: number } {
  const totalOrderDiscount = Math.max(0, Math.round(orderDiscount));
  if (totalOrderDiscount === 0) {
    return { dteOrderDiscount: 0, nonDteOrderDiscount: 0 };
  }

  const dteLines = filterDteTransactionLines(allLines, requiresDteByVariantId);
  const dteIds = new Set(dteLines.map((line) => line.id));
  const nonDteLines = allLines.filter((line) => !dteIds.has(line.id));

  const dteGross = bucketGross(dteLines);
  const nonDteGross = bucketGross(nonDteLines);
  const totalGross = dteGross + nonDteGross;
  if (totalGross <= 0) {
    return { dteOrderDiscount: 0, nonDteOrderDiscount: 0 };
  }

  const dteOrderDiscount = Math.round((totalOrderDiscount * dteGross) / totalGross);
  const nonDteOrderDiscount = totalOrderDiscount - dteOrderDiscount;
  return { dteOrderDiscount, nonDteOrderDiscount };
}

export function applyOrderDiscountToSaleBoletaDocument(
  doc: SaleBoletaDocument,
  dteTransactionLines: TransactionLine[],
  dteOrderDiscount: number,
): SaleBoletaDocument {
  const discount = Math.max(0, Math.round(dteOrderDiscount));
  if (discount === 0 || !doc.lines.length) return doc;

  const grosses = dteTransactionLines.map((line) => transactionLineGross(line));
  const totalGross = grosses.reduce((acc, value) => acc + value, 0);
  if (totalGross <= 0) return doc;

  let remaining = discount;
  const lines: SaleBoletaLine[] = doc.lines.map((line, idx) => {
    const lineGross = grosses[idx] ?? 0;
    let lineOrderDisc = 0;
    if (idx === doc.lines.length - 1) {
      lineOrderDisc = remaining;
    } else {
      lineOrderDisc = Math.round((discount * lineGross) / totalGross);
      remaining -= lineOrderDisc;
    }
    const effectiveGross = Math.max(0, lineGross - lineOrderDisc);
    const qty = Math.max(0, Number(line.quantity) || 0);
    const unitPriceWithIva = qty > 0 ? Math.max(0, Math.round(effectiveGross / qty)) : 0;
    return { ...line, unitPriceWithIva };
  });

  return { ...doc, lines };
}
