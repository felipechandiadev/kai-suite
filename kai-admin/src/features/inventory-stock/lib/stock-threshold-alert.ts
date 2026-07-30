/** Prioridad: bajo mínimo > sobre máximo > reposición (misma regla que el backend). */
export type StockThresholdAlertKind = "below_minimum" | "above_maximum" | "reorder";

export type StorageThresholdEvaluation = {
  physical: number;
  minimum?: number | null;
  minimumEnabled?: boolean;
  maximum?: number | null;
  maximumEnabled?: boolean;
  reorder?: number | null;
  reorderEnabled?: boolean;
};

export function computeStorageThresholdAlert(
  input: StorageThresholdEvaluation,
): StockThresholdAlertKind | null {
  const qty = Number(input.physical);
  if (!Number.isFinite(qty)) {
    return null;
  }
  const min =
    input.minimum != null && Number.isFinite(Number(input.minimum))
      ? Math.max(0, Number(input.minimum))
      : 0;
  const max =
    input.maximum != null && Number.isFinite(Number(input.maximum))
      ? Math.max(0, Number(input.maximum))
      : 0;
  const reorder =
    input.reorder != null && Number.isFinite(Number(input.reorder))
      ? Math.max(0, Number(input.reorder))
      : 0;

  if (input.minimumEnabled && qty < min) {
    return "below_minimum";
  }
  if (input.maximumEnabled && qty > max) {
    return "above_maximum";
  }
  if (input.reorderEnabled && qty <= reorder) {
    return "reorder";
  }
  return null;
}

/** Mismo tono que la card del carrito POS sin stock suficiente. */
export const STOCK_THRESHOLD_ALERT_CARD_CLASS =
  "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/35";

/** Fondo de fila en DataGrid (mismo tinte que {@link STOCK_THRESHOLD_ALERT_CARD_CLASS}). */
export const STOCK_THRESHOLD_ALERT_ROW_CLASS = "bg-red-50 dark:bg-red-950/35";

/** Inline fallback; usa `--color-error` (no existe `--color-destructive` en el tema). */
export const STOCK_THRESHOLD_ALERT_ROW_BACKGROUND =
  "color-mix(in srgb, var(--color-error) 14%, var(--color-background))";

export type StockBreakdownThresholdInput = {
  quantity: number;
  effectiveMinimumStock?: number;
  effectiveMinimumStockEnabled?: boolean;
  effectiveMaximumStock?: number;
  effectiveMaximumStockEnabled?: boolean;
  effectiveReorderPoint?: number;
  effectiveReorderPointEnabled?: boolean;
};

/** True si algún almacén del breakdown está en alerta (misma regla que las cards expandidas). */
export function stockRowHasThresholdAlert(
  row: {
    hasStockAlert?: boolean;
    stockAlertKinds?: StockThresholdAlertKind[];
    storageBreakdown?: StockBreakdownThresholdInput[];
  },
): boolean {
  if (row.hasStockAlert) {
    return true;
  }
  if (row.stockAlertKinds && row.stockAlertKinds.length > 0) {
    return true;
  }
  for (const b of row.storageBreakdown ?? []) {
    if (
      computeStorageThresholdAlert({
        physical: b.quantity,
        minimum: b.effectiveMinimumStock,
        minimumEnabled: b.effectiveMinimumStockEnabled,
        maximum: b.effectiveMaximumStock,
        maximumEnabled: b.effectiveMaximumStockEnabled,
        reorder: b.effectiveReorderPoint,
        reorderEnabled: b.effectiveReorderPointEnabled,
      })
    ) {
      return true;
    }
  }
  return false;
}

export function labelStorageThresholdAlert(kind: StockThresholdAlertKind): string {
  switch (kind) {
    case "below_minimum":
      return "Stock por debajo del mínimo";
    case "above_maximum":
      return "Stock por encima del máximo";
    case "reorder":
      return "Stock en o bajo el punto de reposición";
    default:
      return "Alerta de stock";
  }
}
