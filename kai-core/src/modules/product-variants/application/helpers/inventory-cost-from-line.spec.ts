import {
  costPerStockBaseUnit,
  resolvePmpAfterValuedInbound,
  totalInventoryLineCost,
  weightedAveragePmpAfterInventoryMove,
} from './inventory-cost-from-line';

describe('inventory-cost-from-line', () => {
  it('totalInventoryLineCost uses unitCost * quantity when both set', () => {
    expect(totalInventoryLineCost({ unitCost: 100, quantity: 12, subtotal: 9999 })).toBe(1200);
  });

  it('totalInventoryLineCost falls back to subtotal when unitCost missing', () => {
    expect(totalInventoryLineCost({ unitCost: 0, quantity: 5, subtotal: 2500 })).toBe(2500);
  });

  it('costPerStockBaseUnit divides total by quantityInBase', () => {
    expect(costPerStockBaseUnit(1200, 3000)).toBeCloseTo(0.4, 5);
  });

  it('matches PMP cost per base: purchase 12 cajas, 3000 g base, 100 per caja', () => {
    const total = totalInventoryLineCost({ unitCost: 100, quantity: 12, subtotal: 0 });
    const perBase = costPerStockBaseUnit(total, 3000);
    expect(perBase).toBe(0.4);
  });

  describe('weightedAveragePmpAfterInventoryMove (PMP global por unidad base)', () => {
    it('solo compra: pondera con stock global previo', () => {
      const r = weightedAveragePmpAfterInventoryMove({
        globalStockBefore: 100,
        prevPmp: 2,
        outQtyBase: 0,
        inQtyBase: 50,
        inCostTotal: 75,
      });
      expect(r?.newPmp).toBe(Number(((100 * 2 + 75) / 150).toFixed(2)));
    });

    it('compra + venta misma transacción: valor sale a PMP previo', () => {
      const r = weightedAveragePmpAfterInventoryMove({
        globalStockBefore: 100,
        prevPmp: 2,
        outQtyBase: 40,
        inQtyBase: 50,
        inCostTotal: 100,
      });
      expect(r?.newPmp).toBe(Number(((60 * 2 + 100) / 110).toFixed(2)));
    });

    it('sin entrada valorada → null', () => {
      expect(
        weightedAveragePmpAfterInventoryMove({
          globalStockBefore: 10,
          prevPmp: 5,
          outQtyBase: 2,
          inQtyBase: 0,
          inCostTotal: 0,
        }),
      ).toBeNull();
    });

    it('denominador ≤ 0: usa costo medio de la entrada', () => {
      const r = weightedAveragePmpAfterInventoryMove({
        globalStockBefore: 0,
        prevPmp: 0,
        outQtyBase: 0,
        inQtyBase: 10,
        inCostTotal: 35,
      });
      expect(r?.newPmp).toBe(3.5);
    });
  });

  describe('resolvePmpAfterValuedInbound', () => {
    it('primera compra: ignora stock previo sin costo', () => {
      const r = resolvePmpAfterValuedInbound({
        prevPmp: null,
        globalStockBefore: 100,
        outQtyBase: 0,
        inQtyBase: 10,
        inCostTotal: 1000,
      });
      expect(r?.newPmp).toBe(100);
    });

    it('con PMP previo: promedio ponderado', () => {
      const r = resolvePmpAfterValuedInbound({
        prevPmp: 2,
        globalStockBefore: 100,
        outQtyBase: 0,
        inQtyBase: 50,
        inCostTotal: 75,
      });
      expect(r?.newPmp).toBe(Number(((100 * 2 + 75) / 150).toFixed(2)));
    });

    it('sin entrada valorada → null', () => {
      expect(
        resolvePmpAfterValuedInbound({
          prevPmp: null,
          globalStockBefore: 10,
          outQtyBase: 0,
          inQtyBase: 0,
          inCostTotal: 0,
        }),
      ).toBeNull();
    });
  });
});
