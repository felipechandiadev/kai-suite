import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';

export function isMassVolumeLength(d: UnitDimension | undefined | null): boolean {
  return (
    d === UnitDimension.MASS ||
    d === UnitDimension.VOLUME ||
    d === UnitDimension.LENGTH
  );
}

export type UnitFactorInput = {
  id: string;
  isBase?: boolean;
  baseUnitId?: string | null;
  conversionFactor?: number | string | null;
};

export function factorOneUnitToDimensionRoot(
  unitId: string,
  byId: Map<string, UnitFactorInput>,
): number {
  const u = byId.get(unitId);
  if (!u) {
    return 1;
  }
  if (u.isBase) {
    return 1;
  }
  const cf = Number(u.conversionFactor ?? 1) || 1;
  if (!u.baseUnitId) {
    return cf;
  }
  return cf * factorOneUnitToDimensionRoot(u.baseUnitId, byId);
}

/**
 * Stock en unidad base de inventario → cantidad en unidades de venta (POS).
 * Soporta puente conteo (g por bolsa) y cadena de conversión (ml → L, etc.).
 */
export function posDisplayStockInSaleUnits(input: {
  physicalStockInBase: number;
  stockBaseUnitId?: string | null;
  saleUnitId?: string | null;
  stockBaseDimension?: UnitDimension | null;
  saleDimension?: UnitDimension | null;
  stockBaseQtyPerCountSaleUnit?: unknown;
  unitsById?: Map<string, UnitFactorInput>;
}): number {
  const phy = Number(input.physicalStockInBase) || 0;
  const stockBaseUnitId = input.stockBaseUnitId?.trim() || '';
  const saleUnitId = input.saleUnitId?.trim() || '';
  const raw = input.stockBaseQtyPerCountSaleUnit;
  const bridge =
    raw != null && raw !== '' ? Number(raw) : Number.NaN;

  if (
    isMassVolumeLength(input.stockBaseDimension) &&
    input.saleDimension === UnitDimension.COUNT &&
    Number.isFinite(bridge) &&
    bridge > 0
  ) {
    return phy / bridge;
  }

  if (
    stockBaseUnitId &&
    saleUnitId &&
    stockBaseUnitId === saleUnitId
  ) {
    return phy;
  }

  const unitsById = input.unitsById;
  if (unitsById && stockBaseUnitId && saleUnitId) {
    const fStock = factorOneUnitToDimensionRoot(stockBaseUnitId, unitsById);
    const fSale = factorOneUnitToDimensionRoot(saleUnitId, unitsById);
    if (fSale > 0 && Number.isFinite(fStock) && Number.isFinite(fSale)) {
      return phy * (fStock / fSale);
    }
  }

  return phy;
}
