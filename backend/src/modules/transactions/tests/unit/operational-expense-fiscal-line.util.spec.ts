import {
  buildSummaryFiscalLineFromAmounts,
  shouldSynthesizeOperationalExpenseFiscalLine,
} from '@modules/transactions/application/helpers/operational-expense-fiscal-line.util';

describe('operational-expense-fiscal-line.util', () => {
  describe('shouldSynthesizeOperationalExpenseFiscalLine', () => {
    it('returns false when lines are provided', () => {
      expect(
        shouldSynthesizeOperationalExpenseFiscalLine(
          [{ productName: 'Item', quantity: 1 }],
          { links: { operationalExpenseId: 'oe-1' } },
        ),
      ).toBe(false);
    });

    it('returns true when operationalExpenseId link exists', () => {
      expect(
        shouldSynthesizeOperationalExpenseFiscalLine([], {
          links: { operationalExpenseId: 'oe-1' },
        }),
      ).toBe(true);
    });

    it('returns true when operationalExpenseName is set', () => {
      expect(
        shouldSynthesizeOperationalExpenseFiscalLine([], {
          operationalExpenseName: 'Peajes',
        }),
      ).toBe(true);
    });
  });

  describe('buildSummaryFiscalLineFromAmounts', () => {
    it('builds a single summary line with IVA rate', () => {
      const line = buildSummaryFiscalLineFromAmounts({
        productName: 'Peajes',
        subtotal: 75630,
        taxAmount: 14370,
        total: 90000,
        taxId: 'tax-iva',
      });
      expect(line.productName).toBe('Peajes');
      expect(line.quantity).toBe(1);
      expect(line.unitPrice).toBe(75630);
      expect(line.subtotal).toBe(75630);
      expect(line.taxAmount).toBe(14370);
      expect(line.total).toBe(90000);
      expect(line.taxId).toBe('tax-iva');
      expect(line.taxRate).toBeCloseTo(19, 2);
    });
  });
});
