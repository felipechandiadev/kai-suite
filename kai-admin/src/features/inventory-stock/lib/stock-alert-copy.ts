/** Alineado con el payload WebSocket `stock:updated` del backend. */
export type StockUpdatedPayload = {
  companyId: string;
  storageId: string;
  productVariantId: string;
  physicalStock: number;
  availableStock: number;
  transactionId?: string | null;
  alerts: string[];
};

export type StockAlertEventRow = StockUpdatedPayload & { receivedAt?: number };

export function labelStockAlertKind(kind: string): string {
  switch (kind) {
    case "below_minimum":
      return "Por debajo del mínimo";
    case "above_maximum":
      return "Por encima del máximo";
    case "reorder":
      return "Reposición sugerida";
    default:
      return kind;
  }
}

export function shortVariantId(id: string): string {
  if (!id) return "—";
  return id.length <= 10 ? id : `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function formatReceivedAt(ts: number | undefined): string {
  if (!ts) return "";
  try {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}
