import { BadRequestException } from '@nestjs/common';
import { VariantQuantityConversionService } from '@modules/product-variants/application/variant-quantity-conversion.service';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';

describe('VariantQuantityConversionService', () => {
  const service = new VariantQuantityConversionService({} as any, {} as any);

  it('convierte cantidad en unidad de venta a unidad de stock base (factor en cadena)', () => {
    const base: Unit = {
      id: 'u-base',
      companyId: 'c1',
      name: 'Unidad',
      symbol: 'u',
      isBase: true,
      baseUnitId: null,
      conversionFactor: 1,
      dimension: UnitDimension.COUNT,
    } as Unit;
    const dozen: Unit = {
      id: 'u-doz',
      companyId: 'c1',
      name: 'Docena',
      symbol: 'doc',
      isBase: false,
      baseUnitId: 'u-base',
      conversionFactor: 12,
      dimension: UnitDimension.COUNT,
    } as Unit;
    const byId = new Map<string, Unit>([
      ['u-base', base],
      ['u-doz', dozen],
    ]);
    const variant = {
      stockBaseUnitId: 'u-base',
      saleUnitId: 'u-doz',
      purchaseUnitId: 'u-doz',
      unitId: 'u-doz',
    } as ProductVariant;

    const r = service.toVariantStockBaseSync(variant, 2, 'u-doz', byId, 'sale');
    expect(r.quantityInBase).toBe(24);
    expect(r.stockBaseUnitId).toBe('u-base');
    expect(r.unitConversionFactor).toBe(12);
  });

  it('purchaseQtyToStockBaseFactor devuelve unidades base por 1 unidad de compra', () => {
    const base: Unit = {
      id: 'u-base',
      companyId: 'c1',
      name: 'Unidad',
      symbol: 'u',
      isBase: true,
      baseUnitId: null,
      conversionFactor: 1,
      dimension: UnitDimension.COUNT,
    } as Unit;
    const dozen: Unit = {
      id: 'u-doz',
      companyId: 'c1',
      name: 'Docena',
      symbol: 'doc',
      isBase: false,
      baseUnitId: 'u-base',
      conversionFactor: 12,
      dimension: UnitDimension.COUNT,
    } as Unit;
    const byId = new Map<string, Unit>([
      ['u-base', base],
      ['u-doz', dozen],
    ]);
    const variant = {
      stockBaseUnitId: 'u-base',
      saleUnitId: 'u-doz',
      purchaseUnitId: 'u-doz',
      unitId: 'u-doz',
    } as ProductVariant;

    expect(service.purchaseQtyToStockBaseFactor(variant, byId)).toBe(12);
  });

  it('rechaza masa + conteo sin factor de variante', () => {
    const mass: Unit = {
      id: 'u-g',
      companyId: 'c1',
      name: 'g',
      symbol: 'g',
      isBase: true,
      baseUnitId: null,
      conversionFactor: 1,
      dimension: UnitDimension.MASS,
    } as Unit;
    const count: Unit = {
      id: 'u-un',
      companyId: 'c1',
      name: 'un',
      symbol: 'un',
      isBase: true,
      baseUnitId: null,
      conversionFactor: 1,
      dimension: UnitDimension.COUNT,
    } as Unit;
    const byId = new Map<string, Unit>([
      ['u-g', mass],
      ['u-un', count],
    ]);
    expect(() =>
      service.assertVariantUomTriplet('u-g', 'u-un', 'u-un', byId, {
        stockBaseQtyPerCountSaleUnit: null,
        stockBaseQtyPerCountPurchaseUnit: null,
      }),
    ).toThrow(BadRequestException);
  });

  it('admite stock en gramos y venta en conteo con factor en variante', () => {
    const mass: Unit = {
      id: 'u-g',
      companyId: 'c1',
      name: 'g',
      symbol: 'g',
      isBase: true,
      baseUnitId: null,
      conversionFactor: 1,
      dimension: UnitDimension.MASS,
    } as Unit;
    const count: Unit = {
      id: 'u-un',
      companyId: 'c1',
      name: 'un',
      symbol: 'un',
      isBase: true,
      baseUnitId: null,
      conversionFactor: 1,
      dimension: UnitDimension.COUNT,
    } as Unit;
    const byId = new Map<string, Unit>([
      ['u-g', mass],
      ['u-un', count],
    ]);
    expect(() =>
      service.assertVariantUomTriplet('u-g', 'u-un', 'u-un', byId, {
        stockBaseQtyPerCountSaleUnit: 250,
        stockBaseQtyPerCountPurchaseUnit: 250,
      }),
    ).not.toThrow();

    const variant = {
      stockBaseUnitId: 'u-g',
      saleUnitId: 'u-un',
      purchaseUnitId: 'u-un',
      unitId: 'u-un',
      stockBaseQtyPerCountSaleUnit: 250,
      stockBaseQtyPerCountPurchaseUnit: 250,
    } as ProductVariant;

    const r = service.toVariantStockBaseSync(variant, 2, 'u-un', byId, 'sale');
    expect(r.quantityInBase).toBe(500);
    expect(r.unitConversionFactor).toBe(250);
    expect(r.stockBaseUnitId).toBe('u-g');
  });
});
