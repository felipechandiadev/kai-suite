import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import { getFiscalBoletaPrintPreviewAction } from "@/features/fiscal/actions/reprint-fiscal-boleta.action";
import { getPosSaleReceiptPrintAction } from "@/features/pos-print/actions/pos-sale-receipt-print.action";
import { mapPosSaleReceiptPrintToReceiptData } from "@/features/pos-print/lib/map-pos-sale-receipt-print";
import { executeSalePrintPlan } from "@/features/pos-print/lib/execute-sale-print-plan";
import { printPosSaleDocumentAgentOrBrowser } from "@/features/pos-print/lib/pos-sale-document-print";
import { printPosSaleTicketAgentOrBrowser } from "@/features/pos-print/lib/pos-sale-ticket-agent";
import { formatPrintJobFailedMessage } from "@kai/print-service-client";
import type { SalePrintPlan } from "@/features/sale-print-plan/types";

const REPRINTABLE_TYPES = new Set(["SALE", "BACKORDER"]);

export function canReprintPosSaleReceipt(transactionType: string): boolean {
  return REPRINTABLE_TYPES.has(String(transactionType ?? "").trim());
}

export async function loadPosSaleReceiptDataForReprint(
  transactionId: string,
  options?: { scope?: "full" | "non_dte" },
): Promise<
  | { success: true; data: PosSaleReceiptData; printPlan: SalePrintPlan | null }
  | { success: false; message: string }
> {
  const res = await getPosSaleReceiptPrintAction(transactionId, options);
  if (!res.success) {
    return { success: false, message: res.message };
  }
  const printPlan = res.receipt.salePrintPlan ?? null;
  return {
    success: true,
    data: mapPosSaleReceiptPrintToReceiptData(res.receipt, { printPlan }),
    printPlan,
  };
}

async function loadReprintBundle(transactionId: string): Promise<
  | {
      success: true;
      full: PosSaleReceiptData;
      ticketSubset: PosSaleReceiptData | null;
      printPlan: SalePrintPlan;
      fiscalPreview: Awaited<ReturnType<typeof getFiscalBoletaPrintPreviewAction>> extends {
        success: true;
        preview: infer P;
      }
        ? P | null
        : null;
    }
  | { success: false; message: string }
> {
  const fullLoaded = await loadPosSaleReceiptDataForReprint(transactionId, { scope: "full" });
  if (!fullLoaded.success) {
    return { success: false, message: fullLoaded.message };
  }

  const printPlan = fullLoaded.printPlan ?? "TICKET_ONLY";
  let ticketSubset: PosSaleReceiptData | null = null;
  if (printPlan === "BOLETA_AND_TICKET") {
    const subsetLoaded = await loadPosSaleReceiptDataForReprint(transactionId, {
      scope: "non_dte",
    });
    if (subsetLoaded.success) {
      ticketSubset = subsetLoaded.data;
    }
  }

  let fiscalPreview = null;
  if (printPlan === "BOLETA_ONLY" || printPlan === "BOLETA_AND_TICKET") {
    const fiscalRes = await getFiscalBoletaPrintPreviewAction(transactionId);
    if (fiscalRes.success) {
      fiscalPreview = fiscalRes.preview;
    }
  }

  return {
    success: true,
    full: {
      ...fullLoaded.data,
      fiscalPrintPreview: fiscalPreview,
      printPlan,
      ticketPrintPreview: ticketSubset,
    },
    ticketSubset,
    printPlan,
    fiscalPreview,
  };
}

/** Reimprime según printPlan histórico (boleta, ticket o ambos). */
export async function reprintSaleReceipt(transactionId: string): Promise<{
  success: boolean;
  message?: string;
}> {
  const bundle = await loadReprintBundle(transactionId);
  if (!bundle.success) {
    return { success: false, message: bundle.message };
  }

  const result = await executeSalePrintPlan({
    printPlan: bundle.printPlan,
    receipt: bundle.full,
    ticketReceipt:
      bundle.printPlan === "BOLETA_AND_TICKET"
        ? bundle.ticketSubset
        : bundle.printPlan === "TICKET_ONLY"
          ? bundle.full
          : null,
  });

  if (result.boletaError || result.ticketError) {
    const parts = [result.boletaError, result.ticketError].filter(Boolean);
    return { success: false, message: parts.join(" ") };
  }
  return { success: true };
}

/** Reimprime ticket 80 mm (KaiPrinters si está configurado; si no, diálogo del navegador). */
export async function reprintSaleTicket(transactionId: string): Promise<{
  success: boolean;
  message?: string;
  channel?: "agent" | "browser";
}> {
  const loaded = await loadPosSaleReceiptDataForReprint(transactionId);
  if (!loaded.success) {
    return { success: false, message: loaded.message };
  }
  const folio = loaded.data.folio.trim() || "ticket";
  try {
    const channel = await printPosSaleTicketAgentOrBrowser(loaded.data, {
      filename: `${folio}.escpos`,
      documentType: loaded.data.documentKind === "backorder" ? "BACKORDER" : "SALE",
      internalFolio: folio,
    });
    return { success: true, channel };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      message: formatPrintJobFailedMessage(raw),
    };
  }
}

/** Reimprime documento hoja (propósito `documents` en KaiPrinters o navegador). */
export async function reprintSaleDocument(transactionId: string): Promise<{
  success: boolean;
  message?: string;
  channel?: "agent" | "browser";
}> {
  const loaded = await loadPosSaleReceiptDataForReprint(transactionId);
  if (!loaded.success) {
    return { success: false, message: loaded.message };
  }
  const channel = await printPosSaleDocumentAgentOrBrowser(loaded.data);
  return { success: true, channel };
}
