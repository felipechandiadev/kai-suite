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
  const preview = receipt.fiscalPrintPreview;
  const wantsBoleta = printPlan === "BOLETA_ONLY" || printPlan === "BOLETA_AND_TICKET";

  if (wantsBoleta && preview) {
    jobs.push({ kind: "fiscal-boleta", preview });
  }

  const boletaMissing = wantsBoleta && !preview;

  let ticketData: PosSaleReceiptData | null = null;
  if (printPlan === "BOLETA_AND_TICKET") {
    ticketData = ticketReceipt;
    if (boletaMissing && !ticketData) {
      ticketData = receipt;
    }
  } else if (printPlan === "TICKET_ONLY") {
    ticketData = ticketReceipt ?? receipt;
  } else if (printPlan === "BOLETA_ONLY" && boletaMissing) {
    ticketData = ticketReceipt ?? receipt;
  }

  if (ticketData) {
    jobs.push({ kind: "pos-sale-ticket", data: ticketData });
  }

  return jobs;
}
