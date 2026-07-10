import type { SaleDocumentKind, SaleLineBuckets, SalePrintPlan } from "./types";

export function resolvePrintPlan(
  saleDocumentKind: SaleDocumentKind,
  buckets: SaleLineBuckets,
): SalePrintPlan {
  if (saleDocumentKind !== "BOLETA") {
    return "TICKET_ONLY";
  }
  if (buckets.dteLines.length === 0) {
    return "TICKET_ONLY";
  }
  if (buckets.nonDteLines.length === 0) {
    return "BOLETA_ONLY";
  }
  return "BOLETA_AND_TICKET";
}
