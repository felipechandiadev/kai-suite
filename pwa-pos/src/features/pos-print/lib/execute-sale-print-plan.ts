import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import { printFiscalBoletaPreview } from "@/features/fiscal/print/fiscal-boleta-preview-print";
import { buildSalePrintJobs } from "@/features/sale-print-plan/build-sale-print-jobs";
import type { SalePrintPlan } from "@/features/sale-print-plan/types";
import { printPosSaleTicketAgentOrBrowser } from "@/features/pos-print/lib/pos-sale-ticket-agent";

export type ExecuteSalePrintPlanResult = {
  boletaPrinted: boolean;
  ticketPrinted: boolean;
  boletaError?: string;
  ticketError?: string;
};

export async function executeSalePrintPlan(args: {
  printPlan: SalePrintPlan;
  receipt: PosSaleReceiptData;
  ticketReceipt: PosSaleReceiptData | null;
}): Promise<ExecuteSalePrintPlanResult> {
  const jobs = buildSalePrintJobs(args);
  const result: ExecuteSalePrintPlanResult = {
    boletaPrinted: false,
    ticketPrinted: false,
  };

  for (const job of jobs) {
    if (job.kind === "fiscal-boleta") {
      try {
        await printFiscalBoletaPreview(job.preview);
        result.boletaPrinted = true;
      } catch (e) {
        result.boletaError = e instanceof Error ? e.message : "print_failed";
      }
      continue;
    }

    try {
      await printPosSaleTicketAgentOrBrowser(job.data, {
        filename: `${job.data.folio.trim() || "ticket"}.escpos`,
        documentType: job.data.documentKind === "backorder" ? "BACKORDER" : "SALE",
        internalFolio: job.data.folio.trim() || "ticket",
      });
      result.ticketPrinted = true;
    } catch (e) {
      result.ticketError = e instanceof Error ? e.message : "print_failed";
    }
  }

  return result;
}

export function formatSalePrintPlanErrors(result: ExecuteSalePrintPlanResult): string | null {
  const parts: string[] = [];
  if (result.boletaError) {
    parts.push(`No se pudo imprimir la boleta SII. ${result.boletaError}`);
  }
  if (result.ticketError) {
    parts.push(`No se pudo enviar el ticket al agente. ${result.ticketError}`);
  }
  return parts.length ? parts.join(" ") : null;
}
