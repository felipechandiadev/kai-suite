import {
  getPosDocumentPrintMode,
  isDocumentPrintFormat,
  posDocumentPrintModeToWireFormat,
} from "@kai/print-service-client";
import type { CashClosingPrintInput } from "@/features/cash-closing/lib/cash-closing-print.types";
import { buildCashClosingDocumentHtml } from "@/features/cash-closing/lib/cash-closing-document-print";
import { buildCashClosingReceiptHtml } from "@/features/cash-closing/lib/cash-closing-receipt-print";
import {
  printCashClosingArqueo,
  printCashClosingArqueoAwait,
} from "@/features/cash-closing/lib/cash-closing-ticket-agent";

export { printCashClosingArqueo, printCashClosingArqueoAwait };

export function buildCashClosingArqueoPreviewHtml(input: CashClosingPrintInput): string | null {
  if (typeof window === "undefined") return null;
  const format = posDocumentPrintModeToWireFormat(getPosDocumentPrintMode("cashClosing"));
  return isDocumentPrintFormat(format)
    ? buildCashClosingDocumentHtml(input, format)
    : buildCashClosingReceiptHtml(input, window.location.origin, format);
}
