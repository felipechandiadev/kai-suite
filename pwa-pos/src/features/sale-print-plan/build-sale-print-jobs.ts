import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import type { FiscalBoletaPrintPreview } from "@/features/fiscal/types/fiscal-emission.types";
import type { SalePrintPlan } from "./types";

export type SalePrintJob =
  | { kind: "fiscal-boleta"; preview: FiscalBoletaPrintPreview }
  | { kind: "pos-sale-ticket"; data: PosSaleReceiptData };

export function buildSalePrintJobs(args: {
  printPlan: SalePrintPlan;
  receipt: PosSaleReceiptData;
  ticketReceipt: PosSaleReceiptData | null;
}): SalePrintJob[] {
  const jobs: SalePrintJob[] = [];
  const { printPlan, receipt, ticketReceipt } = args;

  if (printPlan === "BOLETA_ONLY" || printPlan === "BOLETA_AND_TICKET") {
    const preview = receipt.fiscalPrintPreview;
    if (preview) {
      jobs.push({ kind: "fiscal-boleta", preview });
    }
  }

  const ticketData =
    printPlan === "BOLETA_AND_TICKET"
      ? ticketReceipt
      : printPlan === "TICKET_ONLY"
        ? ticketReceipt ?? receipt
        : null;

  if (ticketData) {
    jobs.push({ kind: "pos-sale-ticket", data: ticketData });
  }

  return jobs;
}
