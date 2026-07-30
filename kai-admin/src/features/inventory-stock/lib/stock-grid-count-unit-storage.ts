/** Preferencia global del grid de stock: contar/ajustar en unidad de venta o de stock. */
export const STOCK_GRID_COUNT_UNIT_LS_KEY = "fs-admin-stock-grid-count-unit";

export type StockGridCountUnit = "sale" | "stock";

export function readStockGridCountUnit(): StockGridCountUnit {
  if (typeof window === "undefined") {
    return "sale";
  }
  try {
    const raw = window.localStorage.getItem(STOCK_GRID_COUNT_UNIT_LS_KEY);
    return raw === "stock" ? "stock" : "sale";
  } catch {
    return "sale";
  }
}

export function writeStockGridCountUnit(unit: StockGridCountUnit): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STOCK_GRID_COUNT_UNIT_LS_KEY, unit);
  } catch {
    /* ignore quota / private mode */
  }
}
