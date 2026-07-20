import { buildSeedDemoPurchasePlan } from './seed-demo-purchase-plan';
import {
  buildSeedDemoSalesPlan,
  RECENT_WINDOW,
  TARGET_OLDER,
  TARGET_RECENT,
} from './seed-demo-sales-plan';
import { SEED_STORAGE_CODE } from './config';

describe('buildSeedDemoSalesPlan', () => {
  const sellable = [
    { sku: 'A', basePrice: 1000 },
    { sku: 'B', basePrice: 2000 },
    { sku: 'C', basePrice: 3000 },
    { sku: 'D', basePrice: 4000 },
    { sku: 'E', basePrice: 5000 },
  ];

  const purchasePlan = buildSeedDemoPurchasePlan(
    sellable.map((v) => ({ sku: v.sku, baseCost: Math.round(v.basePrice * 0.5) })),
  );

  it('hits density targets on the same 180d horizon as purchases', () => {
    const plan = buildSeedDemoSalesPlan(purchasePlan, sellable);
    expect(plan.filter((d) => d.daysAgo <= RECENT_WINDOW).length).toBeGreaterThanOrEqual(
      TARGET_RECENT,
    );
    expect(
      plan.filter((d) => d.daysAgo > RECENT_WINDOW && d.daysAgo <= 180).length,
    ).toBeGreaterThanOrEqual(TARGET_OLDER);
    expect(Math.max(...plan.map((d) => d.daysAgo))).toBeGreaterThan(90);
    expect(Math.min(...plan.map((d) => d.daysAgo))).toBeLessThanOrEqual(5);
    expect(plan.filter((d) => d.daysAgo <= 45).length).toBeGreaterThanOrEqual(20);
  });

  it('never sells before stock exists for each SKU', () => {
    const firstStock = new Map<string, number>();
    for (const doc of purchasePlan) {
      if (doc.storageCode !== SEED_STORAGE_CODE) continue;
      for (const line of doc.lines) {
        const prev = firstStock.get(line.sku);
        if (prev == null || doc.daysAgo > prev) {
          firstStock.set(line.sku, doc.daysAgo);
        }
      }
    }

    const plan = buildSeedDemoSalesPlan(purchasePlan, sellable);
    for (const sale of plan) {
      for (const line of sale.lines) {
        const stockDay = firstStock.get(line.sku);
        expect(stockDay).toBeDefined();
        expect(sale.daysAgo).toBeLessThan(stockDay!);
      }
    }
  });

  it('does not oversell purchased qty per SKU', () => {
    const purchased = new Map<string, number>();
    for (const doc of purchasePlan) {
      if (doc.storageCode !== SEED_STORAGE_CODE) continue;
      for (const line of doc.lines) {
        purchased.set(line.sku, (purchased.get(line.sku) ?? 0) + line.qty);
      }
    }
    const sold = new Map<string, number>();
    const plan = buildSeedDemoSalesPlan(purchasePlan, sellable);
    for (const sale of plan) {
      for (const line of sale.lines) {
        sold.set(line.sku, (sold.get(line.sku) ?? 0) + line.qty);
      }
    }
    for (const [sku, qty] of sold) {
      expect(qty).toBeLessThanOrEqual(purchased.get(sku) ?? 0);
    }
  });

  it('keeps POS / operator / payment mix', () => {
    const plan = buildSeedDemoSalesPlan(purchasePlan, sellable);
    expect(plan.some((d) => d.posName === 'Caja 1')).toBe(true);
    expect(plan.some((d) => d.posName === 'Caja 2')).toBe(true);
    expect(plan.some((d) => d.operatorUserName === 'operador')).toBe(true);
    expect(plan.some((d) => d.operatorUserName === 'operador3')).toBe(true);
    expect(plan.some((d) => d.paymentMethod === 'CASH')).toBe(true);
    expect(plan.some((d) => d.paymentMethod === 'CHECK')).toBe(true);
    expect(plan.some((d) => d.customerDoc == null)).toBe(true);
    expect(plan.some((d) => d.customerDoc != null)).toBe(true);
  });
});
