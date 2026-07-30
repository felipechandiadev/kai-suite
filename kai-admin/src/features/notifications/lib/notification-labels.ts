import { labelStockAlertKind } from "@/features/inventory-stock/lib/stock-alert-copy";

/** Maps notification `kind` (e.g. stock.below_minimum) to display text. */
export function labelNotificationKind(kind: string): string {
  if (kind === "pricing.updated" || kind.startsWith("pricing.")) {
    return "Precios actualizados";
  }
  const stockSuffix = kind.startsWith("stock.") ? kind.slice("stock.".length) : kind;
  if (stockSuffix === kind && !kind.includes(".")) {
    return labelStockAlertKind(kind);
  }
  return labelStockAlertKind(stockSuffix);
}
