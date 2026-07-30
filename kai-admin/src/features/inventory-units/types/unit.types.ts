export const UNIT_DIMENSIONS = ["count", "mass", "length", "volume"] as const;
export type UnitDimension = (typeof UNIT_DIMENSIONS)[number];

export type UnitListItem = {
  id: string;
  name: string;
  symbol: string;
  dimension: UnitDimension;
  conversionFactor: number;
  allowDecimals: boolean;
  isBase: boolean;
  baseUnitId: string | null;
  baseUnitName: string | null;
  baseUnitSymbol: string | null;
  activeDerivedCount: number;
  active: boolean;
  isDefault: boolean;
};

/** Unidad activa predeterminada para catálogo / variantes (venta, compra y stock). */
export function pickDefaultUnit(units: UnitListItem[]): UnitListItem | null {
  const active = units.filter((u) => u.active);
  return (
    active.find((u) => u.isDefault) ??
    active.find((u) => u.symbol.toLowerCase() === "un") ??
    active[0] ??
    null
  );
}

export type ListUnitsResult =
  | { success: true; units: UnitListItem[] }
  | { success: false; error: string; units: [] };

export type CreateUnitResult =
  | { success: true; unit: UnitListItem }
  | { success: false; error: string };

export type UpdateUnitResult =
  | { success: true; unit: UnitListItem }
  | { success: false; error: string };

export type DeleteUnitResult = { success: true } | { success: false; error: string };

export function dimensionLabel(d: UnitDimension): string {
  switch (d) {
    case "count":
      return "Conteo";
    case "mass":
      return "Masa";
    case "length":
      return "Longitud";
    case "volume":
      return "Volumen";
    default:
      return d;
  }
}
