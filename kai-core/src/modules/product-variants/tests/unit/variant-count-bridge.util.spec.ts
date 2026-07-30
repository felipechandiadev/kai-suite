import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';
import {
  factorOneUnitToDimensionRoot,
  posDisplayStockInSaleUnits,
  type UnitFactorInput,
} from '@modules/product-variants/application/variant-count-bridge.util';

describe('posDisplayStockInSaleUnits', () => {
  it('convierte ml en stock base a litros de venta', () => {
    const byId = new Map<string, UnitFactorInput>([
      ['u-l', { id: 'u-l', isBase: true, baseUnitId: null, conversionFactor: 1 }],
      ['u-ml', { id: 'u-ml', isBase: false, baseUnitId: 'u-l', conversionFactor: 0.001 }],
    ]);

    const qty = posDisplayStockInSaleUnits({
      physicalStockInBase: 20004,
      stockBaseUnitId: 'u-ml',
      saleUnitId: 'u-l',
      stockBaseDimension: UnitDimension.VOLUME,
      saleDimension: UnitDimension.VOLUME,
      unitsById: byId,
    });

    expect(qty).toBeCloseTo(20.004, 6);
  });

  it('convierte gramos a unidades de conteo con puente', () => {
    const qty = posDisplayStockInSaleUnits({
      physicalStockInBase: 500,
      stockBaseDimension: UnitDimension.MASS,
      saleDimension: UnitDimension.COUNT,
      stockBaseQtyPerCountSaleUnit: 250,
    });
    expect(qty).toBe(2);
  });

  it('factorOneUnitToDimensionRoot sigue cadena de conversión', () => {
    const byId = new Map<string, UnitFactorInput>([
      ['u-l', { id: 'u-l', isBase: true, baseUnitId: null, conversionFactor: 1 }],
      ['u-ml', { id: 'u-ml', isBase: false, baseUnitId: 'u-l', conversionFactor: 0.001 }],
    ]);
    expect(factorOneUnitToDimensionRoot('u-ml', byId)).toBeCloseTo(0.001, 9);
    expect(factorOneUnitToDimensionRoot('u-l', byId)).toBe(1);
  });
});
