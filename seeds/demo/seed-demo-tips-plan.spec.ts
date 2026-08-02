import {
  TIP_OVERDUE_MIN_DAYS_AGO,
  TIP_SALE_HORIZON_DAYS,
  TIP_SALE_TARGET,
  TIP_SUGGEST_PERCENT,
  TIP_UNATTRIBUTED_EVERY,
  buildSeedDemoTipsPlan,
  countTipPlanCardOverdue,
  countTipPlanUnattributed,
} from './seed-demo-tips-plan';

describe('buildSeedDemoTipsPlan', () => {
  const plan = buildSeedDemoTipsPlan();

  it(`builds exactly ${TIP_SALE_TARGET} tip-sales within ${TIP_SALE_HORIZON_DAYS}d`, () => {
    expect(plan).toHaveLength(TIP_SALE_TARGET);
    expect(Math.max(...plan.map((d) => d.daysAgo))).toBeLessThanOrEqual(
      TIP_SALE_HORIZON_DAYS,
    );
    expect(Math.min(...plan.map((d) => d.daysAgo))).toBeGreaterThanOrEqual(1);
  });

  it('suggests tip ≈ 10% of gross (net+IVA)', () => {
    for (const doc of plan) {
      let subtotal = 0;
      for (const line of doc.lines) {
        subtotal += Math.round(line.unitPriceNet * line.qty);
      }
      const totalGross = subtotal + Math.round(subtotal * 0.19);
      const expected = Math.round((totalGross * TIP_SUGGEST_PERCENT) / 100);
      expect(doc.tipAmount).toBe(expected);
      expect(doc.tipSuggestedAmount).toBe(expected);
      expect(doc.tipAmount).toBeGreaterThan(0);
    }
  });

  it('keeps waiter / operator / payment / table mix', () => {
    expect(plan.some((d) => d.waiterUserName === 'mesero1')).toBe(true);
    expect(plan.some((d) => d.waiterUserName === 'mesero2')).toBe(true);
    expect(plan.some((d) => d.waiterUserName === 'mesero3')).toBe(true);
    expect(plan.some((d) => d.operatorUserName === 'operador')).toBe(true);
    expect(plan.some((d) => d.operatorUserName === 'operador3')).toBe(true);
    expect(plan.some((d) => d.paymentMethod === 'CASH')).toBe(true);
    expect(plan.some((d) => d.paymentMethod === 'DEBIT_CARD')).toBe(true);
    expect(plan.some((d) => d.paymentMethod === 'CREDIT_CARD')).toBe(true);
    expect(plan.some((d) => d.posName === 'Caja 1')).toBe(true);
    expect(plan.some((d) => d.posName === 'Caja 2')).toBe(true);
    expect(new Set(plan.map((d) => d.tableCode)).size).toBeGreaterThanOrEqual(3);
  });

  it('marks ~25% as unattributed pool', () => {
    const n = countTipPlanUnattributed(plan);
    expect(n).toBe(Math.ceil(TIP_SALE_TARGET / TIP_UNATTRIBUTED_EVERY));
    expect(n / TIP_SALE_TARGET).toBeGreaterThanOrEqual(0.2);
    expect(n / TIP_SALE_TARGET).toBeLessThanOrEqual(0.3);
  });

  it(`has ≥4 card tips with daysAgo ≥ ${TIP_OVERDUE_MIN_DAYS_AGO} (Art. 64 overdue)`, () => {
    const overdue = countTipPlanCardOverdue(plan);
    expect(overdue).toBeGreaterThanOrEqual(4);
  });

  it('only uses PHYSICAL food SKUs (café / bebida / té / galletas)', () => {
    const allowed = new Set([
      'SEEDDEVCAFE250',
      'SEEDDEVCAFE500',
      'SEEDDEVPHYSBEBCOLMED',
      'SEEDDEVPHYSBEBCOLGRA',
      'SEEDDEVPHYSBEBLIMMED',
      'SEEDDEVPHYSBEBNARMED',
      'SEEDDEVTE20',
      'SEEDDEVGAL400',
    ]);
    for (const doc of plan) {
      for (const line of doc.lines) {
        expect(allowed.has(line.sku)).toBe(true);
        expect(line.qty).toBe(1);
      }
    }
  });
});
