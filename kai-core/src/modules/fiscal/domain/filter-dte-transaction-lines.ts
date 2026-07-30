import type { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';

export type VariantRequiresDteMap = ReadonlyMap<string, boolean>;

export function variantRequiresDte(
  variantId: string | null | undefined,
  map: VariantRequiresDteMap,
): boolean {
  const id = variantId?.trim() ?? '';
  if (!id) return false;
  if (!map.has(id)) return false;
  return map.get(id) !== false;
}

export function filterDteTransactionLines(
  lines: TransactionLine[],
  requiresDteByVariantId: VariantRequiresDteMap,
): TransactionLine[] {
  return lines.filter((line) =>
    variantRequiresDte(line.productVariantId, requiresDteByVariantId),
  );
}

export type SalePrintPlanKind = 'TICKET_ONLY' | 'BOLETA_ONLY' | 'BOLETA_AND_TICKET';

export function resolveSalePrintPlanFromLines(
  saleDocumentKind: string | null | undefined,
  allLines: TransactionLine[],
  requiresDteByVariantId: VariantRequiresDteMap,
): SalePrintPlanKind {
  if (saleDocumentKind !== 'BOLETA') {
    return 'TICKET_ONLY';
  }
  const dteCount = filterDteTransactionLines(allLines, requiresDteByVariantId).length;
  const nonDteCount = allLines.length - dteCount;
  if (dteCount === 0) return 'TICKET_ONLY';
  if (nonDteCount === 0) return 'BOLETA_ONLY';
  return 'BOLETA_AND_TICKET';
}
