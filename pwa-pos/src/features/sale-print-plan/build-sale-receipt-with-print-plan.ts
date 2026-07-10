import {
  buildPosSaleReceiptSnapshot,
  type PosSaleReceiptData,
  type PosSaleReceiptSnapshotInput,
} from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import { classifySaleLines } from "./classify-sale-lines";
import { resolvePrintPlan } from "./resolve-print-plan";
import { buildTicketReceiptDataFromCart } from "./build-ticket-receipt-data";
import type { SaleDocumentKind, SalePrintTotalsInput } from "./types";

export function buildSaleReceiptWithPrintPlan(args: {
  snapshotInput: PosSaleReceiptSnapshotInput;
  saleDocumentKind: SaleDocumentKind;
  totals: SalePrintTotalsInput;
}): PosSaleReceiptData {
  const buckets = classifySaleLines(args.snapshotInput.lines);
  const printPlan = resolvePrintPlan(args.saleDocumentKind, buckets);
  const base = buildPosSaleReceiptSnapshot(args.snapshotInput);
  const ticketScope = printPlan === "BOLETA_AND_TICKET" ? "non_dte" : "full";
  const ticketPrintPreview = buildTicketReceiptDataFromCart({
    base,
    cartLines: args.snapshotInput.lines,
    totals: args.totals,
    printPlan,
    ticketScope,
  });

  return {
    ...base,
    printPlan,
    ticketPrintPreview,
  };
}
