import { costPerLineUnit } from '../../application/helpers/sale-unit-cost.util';

describe('costPerLineUnit', () => {
  it('sin conversión deja el costo igual', () => {
    expect(costPerLineUnit(120, 3, 3)).toBe(120);
  });

  it('stock en g y venta en kg: costo por kg = costo por g × 1000', () => {
    // PMP $0,4 por g; venta de 2 kg = 2000 g
    expect(costPerLineUnit(0.4, 2, 2000)).toBe(400);
  });

  it('sin cantidades válidas devuelve el costo base', () => {
    expect(costPerLineUnit(50, 0, 10)).toBe(50);
    expect(costPerLineUnit(50, 2, null)).toBe(50);
    expect(costPerLineUnit(0, 2, 10)).toBe(0);
  });
});
