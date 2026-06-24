import {
  isDocumentPrintFormat,
  type PosDocumentPrintKind,
  type PrintFormat,
} from "@flowstore/print-service-client";
import { buildCustomerCreditNoteDocumentHtml } from "@/features/customer-credit-notes/lib/customer-credit-note-document-print";
import { printCustomerCreditNoteReceiptAgentOrBrowser } from "@/features/customer-credit-notes/lib/customer-credit-note-ticket-agent";
import { printCashCountSheetAwait } from "@/features/cash-closing/lib/cash-count-sheet-print";
import { printCashSessionOpeningAwait } from "@/features/cash-session-opening/lib/cash-session-opening-print";
import { buildCashSessionOpeningDocumentHtml } from "@/features/cash-session-opening/lib/cash-session-opening-print";
import { printCashClosingArqueoAwait } from "@/features/cash-closing/lib/cash-closing-ticket-agent";
import { printPosHtmlViaAgentOrBrowser } from "@/features/pos-print/lib/pos-agent-print";
import { printPosSaleDocumentAgentOrBrowser } from "@/features/pos-print/lib/pos-sale-document-print";
import {
  buildPosPrintTestCashClosingInput,
  buildPosPrintTestCashSessionOpeningInput,
  buildPosPrintTestCreditNoteData,
  buildPosPrintTestQuotationInput,
  buildPosPrintTestSaleReceipt,
} from "@/features/pos-print/lib/pos-print-test-fixtures";
import { printPosSaleTicketAgentOrBrowser } from "@/features/pos-print/lib/pos-sale-ticket-agent";
import { buildQuotationDocumentHtml } from "@/features/quotations/lib/quotation-document-print";
import { printPosQuotationReceiptAgentOrBrowser } from "@/features/quotations/lib/quotation-ticket-agent";

export type PosDocumentTestPrintChannel = "agent" | "browser";

/**
 * Imprime un documento de prueba (datos ficticios) según el formato configurado.
 */
export async function printPosDocumentTest(
  kind: PosDocumentPrintKind,
  format: PrintFormat,
): Promise<PosDocumentTestPrintChannel> {
  switch (kind) {
    case "sale": {
      const data = buildPosPrintTestSaleReceipt("sale");
      const folio = data.folio.trim() || "ticket";
      if (isDocumentPrintFormat(format)) {
        return printPosSaleDocumentAgentOrBrowser(data, format);
      }
      return printPosSaleTicketAgentOrBrowser(data, {
        filename: `${folio}.escpos`,
        documentType: "SALE",
        internalFolio: folio,
        format,
      });
    }
    case "backorder": {
      const data = buildPosPrintTestSaleReceipt("backorder");
      const folio = data.folio.trim() || "encargo";
      if (isDocumentPrintFormat(format)) {
        return printPosSaleDocumentAgentOrBrowser(data, format);
      }
      return printPosSaleTicketAgentOrBrowser(data, {
        filename: `${folio}.escpos`,
        documentType: "BACKORDER",
        internalFolio: folio,
        format,
      });
    }
    case "quotation": {
      const input = buildPosPrintTestQuotationInput();
      const folio = input.quotation.documentNumber?.trim() || "cotizacion";
      if (isDocumentPrintFormat(format)) {
        return printPosHtmlViaAgentOrBrowser(buildQuotationDocumentHtml(input, format), "documents", {
          filename: `${folio}.pdf`,
          iframeTitle: "Impresión cotización documento (prueba)",
          documentType: "QUOTATION",
          internalFolio: folio,
          format,
        });
      }
      return printPosQuotationReceiptAgentOrBrowser(input, format);
    }
    case "customerCreditNote": {
      const data = buildPosPrintTestCreditNoteData();
      const folio = data.creditNoteFolio.trim() || "nota-credito";
      if (isDocumentPrintFormat(format)) {
        return printPosHtmlViaAgentOrBrowser(buildCustomerCreditNoteDocumentHtml(data, format), "documents", {
          filename: `${folio}.pdf`,
          iframeTitle: "Impresión nota de crédito documento (prueba)",
          documentType: "CUSTOMER_CREDIT_NOTE",
          internalFolio: folio,
          format,
        });
      }
      return printCustomerCreditNoteReceiptAgentOrBrowser(data, format);
    }
    case "cashClosing":
      return printCashClosingArqueoAwait(buildPosPrintTestCashClosingInput(), format);
    case "cashCountSheet": {
      const input = buildPosPrintTestCashCountSheetInput();
      return printCashCountSheetAwait(input, format);
    }
    case "cashSessionOpening": {
      const input = buildPosPrintTestCashSessionOpeningInput();
      const ref = input.cashSessionId.slice(0, 8).toUpperCase() || "apertura";
      if (isDocumentPrintFormat(format)) {
        return printPosHtmlViaAgentOrBrowser(buildCashSessionOpeningDocumentHtml(input, format), "documents", {
          filename: `apertura-caja-${ref}.pdf`,
          iframeTitle: "Apertura de caja (prueba)",
          documentType: "CASH_SESSION_OPEN",
          internalFolio: ref,
          format,
        });
      }
      return printCashSessionOpeningAwait(input, format);
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
