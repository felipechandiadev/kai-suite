import type { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import {
  filterDteTransactionLines,
  resolveSalePrintPlanFromLines,
  variantRequiresDte,
} from '@modules/fiscal/domain/filter-dte-transaction-lines';

describe('filter-dte-transaction-lines', () => {
  const line = (variantId: string): TransactionLine =>
    ({ productVariantId: variantId }) as TransactionLine;

  it('variantRequiresDte default false when unknown', () => {
    const map = new Map<string, boolean>();
    expect(variantRequiresDte('v1', map)).toBe(false);
  });

  it('filterDteTransactionLines keeps only DTE lines', () => {
    const map = new Map<string, boolean>([
      ['v1', true],
      ['v2', false],
    ]);
    const filtered = filterDteTransactionLines(
      [line('v1'), line('v2'), line('v3')],
      map,
    );
    expect(filtered.map((l) => l.productVariantId)).toEqual(['v1']);
  });

  it('resolveSalePrintPlanFromLines mixto con Boleta', () => {
    const map = new Map<string, boolean>([
      ['v1', true],
      ['v2', false],
    ]);
    expect(
      resolveSalePrintPlanFromLines(
        'BOLETA',
        [line('v1'), line('v2')],
        map,
      ),
    ).toBe('BOLETA_AND_TICKET');
  });

  it('resolveSalePrintPlanFromLines solo no-DTE + Boleta → TICKET_ONLY', () => {
    const map = new Map<string, boolean>([['v1', false]]);
    expect(resolveSalePrintPlanFromLines('BOLETA', [line('v1')], map)).toBe(
      'TICKET_ONLY',
    );
  });
});
