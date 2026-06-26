import type { CreateTransactionLineDto } from '../dto/create-transaction.dto';

export function shouldSynthesizeOperationalExpenseFiscalLine(
  lines: unknown,
  metadata?: Record<string, unknown>,
): boolean {
  if (Array.isArray(lines) && lines.length > 0) {
    return false;
  }
  const links = metadata?.links;
  if (
    links &&
    typeof links === 'object' &&
    typeof (links as { operationalExpenseId?: unknown }).operationalExpenseId ===
      'string' &&
    String((links as { operationalExpenseId: string }).operationalExpenseId).trim()
  ) {
    return true;
  }
  return (
    typeof metadata?.operationalExpenseName === 'string' &&
    metadata.operationalExpenseName.trim().length > 0
  );
}

export function buildSummaryFiscalLineFromAmounts(opts: {
  productName: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  taxId?: string | null;
}): CreateTransactionLineDto {
  const subtotal = Math.round(Number(opts.subtotal) || 0);
  const taxAmount = Math.round(Number(opts.taxAmount) || 0);
  const total = Math.round(Number(opts.total) || 0);
  const taxRate =
    subtotal > 0 && taxAmount >= 0
      ? Number(((taxAmount / subtotal) * 100).toFixed(4))
      : 0;

  const line: CreateTransactionLineDto = {
    productName: opts.productName.trim() || 'Gasto operativo',
    quantity: 1,
    unitPrice: subtotal,
    subtotal,
    taxRate,
    taxAmount,
    total,
    discountPercentage: 0,
    discountAmount: 0,
  };

  const taxId = opts.taxId?.trim();
  if (taxId) {
    line.taxId = taxId;
  }

  return line;
}
