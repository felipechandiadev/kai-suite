import type { StockGridRow } from "../types/stock-grid.types";

export function formatQty(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(n);
}

export function stockQtyPerSaleUnit(row: StockGridRow | undefined): number | null {
  if (!row) {
    return null;
  }
  const f = row.stockBaseQtyPerSaleUnit ?? row.stockBaseQtyPerCountSaleUnit;
  return f != null && f > 0 && Number.isFinite(f) ? f : null;
}

export function usesSaleUnitCount(row: StockGridRow | undefined): boolean {
  const bridge = stockQtyPerSaleUnit(row);
  return bridge != null && Boolean((row?.saleUnitSymbol || row?.saleUnitOfMeasure || "").trim());
}

export function unitLabelSymbol(row: StockGridRow, kind: "stock" | "sale"): string {
  const sym =
    kind === "stock" ? (row.stockUnitSymbol || "").trim() : (row.saleUnitSymbol || "").trim();
  if (sym) {
    return sym;
  }
  const label = kind === "stock" ? row.unitOfMeasure : row.saleUnitOfMeasure;
  const t = (label || "").trim();
  const paren = t.match(/\(([^)]+)\)\s*$/);
  if (paren?.[1]?.trim()) {
    return paren[1].trim();
  }
  return t;
}

export function physicalToCountQty(physicalQty: number, row: StockGridRow | undefined): number {
  const bridge = stockQtyPerSaleUnit(row);
  if (bridge == null) {
    return physicalQty;
  }
  return physicalQty / bridge;
}

export function countQtyToPhysical(countQty: number, row: StockGridRow | undefined): number {
  const bridge = stockQtyPerSaleUnit(row);
  if (bridge == null) {
    return countQty;
  }
  return countQty * bridge;
}

export function roundCountQty(n: number): number {
  return Math.max(0, Math.round(n * 1000) / 1000);
}

export function stockUnitDiffersFromSale(row: StockGridRow): boolean {
  if (row.stockBaseUnitId && row.saleUnitId) {
    return row.stockBaseUnitId !== row.saleUnitId;
  }
  const stockSym = unitLabelSymbol(row, "stock").toLowerCase();
  const saleSym = unitLabelSymbol(row, "sale").toLowerCase();
  if (stockSym && saleSym) {
    return stockSym !== saleSym;
  }
  const stockName = (row.unitOfMeasure || "").trim().toLowerCase();
  const saleName = (row.saleUnitOfMeasure || "").trim().toLowerCase();
  if (stockName && saleName) {
    return stockName !== saleName;
  }
  return stockQtyPerSaleUnit(row) != null;
}

/** Cantidad en unidad base de stock / equivalente en unidad de venta. Ej. 20.000ml/20un */
export function formatStockSlashPair(qty: number, row: StockGridRow): string {
  const n = Number(qty);
  if (!Number.isFinite(n)) {
    return formatQty(0);
  }
  const stockSym = unitLabelSymbol(row, "stock");
  const saleSym = unitLabelSymbol(row, "sale");
  const perSale = stockQtyPerSaleUnit(row);
  if (perSale != null && stockUnitDiffersFromSale(row) && stockSym && saleSym) {
    const saleQty = n / perSale;
    if (Number.isFinite(saleQty) && saleQty >= 0) {
      return `${formatQty(n)}${stockSym}/${formatQty(saleQty)}${saleSym}`;
    }
  }
  return stockSym ? `${formatQty(n)}${stockSym}` : formatQty(n);
}

export function formatThreshold(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) {
    return "—";
  }
  return formatQty(Math.max(0, Number(n)));
}

export function findStorageQuantity(
  rows: StockGridRow[],
  variantId: string,
  storageId: string,
): number | undefined {
  const row = rows.find((r) => r.variantId === variantId);
  const breakdown = row?.storageBreakdown?.find((b) => b.storageId === storageId);
  if (!breakdown) {
    return undefined;
  }
  const q = Number(breakdown.quantity);
  return Number.isFinite(q) ? Math.max(0, q) : undefined;
}

export function effectiveCountInSaleUnits(
  row: StockGridRow | undefined,
  preferSaleUnits: boolean,
): boolean {
  return preferSaleUnits && usesSaleUnitCount(row);
}

export function applyPhysicalDelta(
  currentPhysical: number,
  delta: number,
  row: StockGridRow | undefined,
  inSaleUnits: boolean,
): number {
  const physicalDelta =
    inSaleUnits && usesSaleUnitCount(row) ? countQtyToPhysical(delta, row) : delta;
  return Math.max(0, roundCountQty(currentPhysical + physicalDelta));
}
