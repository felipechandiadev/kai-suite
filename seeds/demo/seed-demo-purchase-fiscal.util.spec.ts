import {
  addDaysToIsoDate,
  buildSupplierDocumentPayment,
} from './seed-demo-purchase-fiscal.util';
import type { SeedPurchaseDoc } from './seed-demo-purchase-plan';
import { buildSeedDemoPurchasePlan } from './seed-demo-purchase-plan';

function baseDoc(
  partial: Partial<SeedPurchaseDoc> & Pick<SeedPurchaseDoc, 'paymentStrategy' | 'reference'>,
): SeedPurchaseDoc {
  return {
    daysAgo: 10,
    supplierAlias: 'Mayorista Central',
    storageCode: 'BOD001',
    lines: [{ sku: 'SKU1', qty: 1, unitCost: 1000 }],
    ...partial,
  };
}

describe('buildSupplierDocumentPayment settle-by-today', () => {
  it('marks all installments COMPLETED when due dates are in the past', () => {
    const occurredOn = '2026-01-01';
    const today = '2026-07-20';
    const doc = baseDoc({
      paymentStrategy: 'installments_3',
      reference: 'F-SEED-1501',
    });
    const result = buildSupplierDocumentPayment(doc, 3000, occurredOn, today);
    expect(result.mode).toBe('COMPLETED');
    expect(result.paidLines).toHaveLength(3);
    expect(result.scheduledLines).toHaveLength(0);
    expect(result.paidInstallments).toBe(3);
    expect(result.pendingInstallments).toBe(0);
    expect(result.paidLines.every((l) => l.paymentMethod === 'TRANSFER')).toBe(true);
  });

  it('returns PARTIAL when some installments are still future', () => {
    const occurredOn = addDaysToIsoDate('2026-07-20', -20);
    const today = '2026-07-20';
    const doc = baseDoc({
      paymentStrategy: 'installments_3',
      reference: 'F-SEED-0201',
    });
    const result = buildSupplierDocumentPayment(doc, 3000, occurredOn, today);
    expect(result.mode).toBe('PARTIAL');
    expect(result.paidLines.length).toBeGreaterThanOrEqual(1);
    expect(result.scheduledLines.length).toBeGreaterThanOrEqual(1);
    expect(result.paidInstallments + result.pendingInstallments).toBe(3);
    expect(result.partialPaidAmount).toBe(
      result.paidLines.reduce((s, l) => s + l.amount, 0),
    );
  });

  it('creates CHECK paid line for check strategy', () => {
    const doc = baseDoc({
      paymentStrategy: 'check',
      reference: 'F-SEED-0701',
    });
    const result = buildSupplierDocumentPayment(doc, 11900, '2026-07-13', '2026-07-20');
    expect(result.mode).toBe('COMPLETED');
    expect(result.paidLines).toHaveLength(1);
    expect(result.paidLines[0]?.paymentMethod).toBe('CHECK');
    expect(result.paidLines[0]?.chequeNumber).toMatch(/^SEED-CHQ-/);
  });
});

describe('buildSeedDemoPurchasePlan', () => {
  it('covers every PHYSICAL sku and hits recent density target', () => {
    const variants = [
      { sku: 'A', baseCost: 100 },
      { sku: 'B', baseCost: 200 },
      { sku: 'C', baseCost: 300 },
      { sku: 'D', baseCost: 400 },
      { sku: 'E', baseCost: 500 },
    ];
    const plan = buildSeedDemoPurchasePlan(variants);
    const physicalRefs = plan.filter((d) => !d.reference.includes('-INS-'));
    const covered = new Set(physicalRefs.flatMap((d) => d.lines.map((l) => l.sku)));
    expect(covered.has('A')).toBe(true);
    expect(covered.has('E')).toBe(true);
    expect(physicalRefs.filter((d) => d.daysAgo <= 90).length).toBeGreaterThanOrEqual(36);
    expect(plan.some((d) => d.paymentStrategy === 'check')).toBe(true);
    expect(plan.some((d) => d.reference.includes('-INS-'))).toBe(true);
  });
});
