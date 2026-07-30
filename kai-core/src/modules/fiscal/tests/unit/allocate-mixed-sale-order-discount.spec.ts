import type { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import {
  allocateOrderDiscountForTransactionLines,
  applyOrderDiscountToSaleBoletaDocument,
  resolveTransactionOrderDiscount,
} from '../../domain/allocate-mixed-sale-order-discount';

function line(
  id: string,
  variantId: string,
  total: number,
  discountAmount = 0,
): TransactionLine {
  return {
    id,
    productVariantId: variantId,
    quantity: 1,
    total,
    discountAmount,
  } as TransactionLine;
}

describe('allocate-mixed-sale-order-discount', () => {
  const requiresDteMap = new Map<string, boolean>([
    ['v-dte', true],
    ['v-nodte', false],
  ]);

  it('resolveTransactionOrderDiscount separa descuento de orden', () => {
    expect(
      resolveTransactionOrderDiscount(
        500,
        [line('l1', 'v-dte', 2000, 100), line('l2', 'v-nodte', 1000, 50)],
      ),
    ).toBe(350);
  });

  it('prorratea descuento de orden entre buckets DTE y no-DTE', () => {
    const all = [line('l1', 'v-dte', 2000), line('l2', 'v-nodte', 1000)];
    const alloc = allocateOrderDiscountForTransactionLines(all, requiresDteMap, 300);
    expect(alloc.dteOrderDiscount + alloc.nonDteOrderDiscount).toBe(300);
    expect(alloc.dteOrderDiscount).toBe(200);
    expect(alloc.nonDteOrderDiscount).toBe(100);
  });

  it('applyOrderDiscountToSaleBoletaDocument reduce montos de boleta', () => {
    const doc = {
      lines: [
        {
          name: 'DTE',
          quantity: 1,
          unitPriceWithIva: 2000,
          exempt: false,
          unitMeasure: 'UN',
        },
      ],
      receptor: { rut: '66666666-6', name: 'Cliente' },
    };
    const adjusted = applyOrderDiscountToSaleBoletaDocument(
      doc,
      [line('l1', 'v-dte', 2000)],
      200,
    );
    expect(adjusted.lines[0]?.unitPriceWithIva).toBe(1800);
  });
});
