import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import { getPosSaleReceiptPrintAction } from "@/features/pos-print/actions/pos-sale-receipt-print.action";
import { mapPosSaleReceiptPrintToReceiptData } from "@/features/pos-print/lib/map-pos-sale-receipt-print";
import { printPosSaleDocumentAgentOrBrowser } from "@/features/pos-print/lib/pos-sale-document-print";
import { printPosSaleTicketAgentOrBrowser } from "@/features/pos-print/lib/pos-sale-ticket-agent";
import { formatPrintJobFailedMessage } from "@kai/print-service-client";

const REPRINTABLE_TYPES = new Set(["SALE", "BACKORDER"]);

export function canReprintPosSaleReceipt(transactionType: string): boolean {
  return REPRINTABLE_TYPES.has(String(transactionType ?? "").trim());
}

export async function loadPosSaleReceiptDataForReprint(
  transactionId: string,
): Promise<
  | { success: true; data: PosSaleReceiptData }
  | { success: false; message: string }
> {
  const res = await getPosSaleReceiptPrintAction(transactionId);
  if (!res.success) {
    return { success: false, message: res.message };
  }
  return {
    success: true,
    data: mapPosSaleReceiptPrintToReceiptData(res.receipt),
  };
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
