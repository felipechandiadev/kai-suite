import {
  isPosDocumentPrintModeDocument,
  posDocumentPrintModeToWireFormat,
  type PosDocumentPrintKind,
  type PosDocumentPrintMode,
  type PrintFormat,
} from "@kai/print-service-client";
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
  buildPosPrintTestCashCountSheetInput,
  buildPosPrintTestCashSessionOpeningInput,
  buildPosPrintTestCreditNoteData,
  buildPosPrintTestQuotationInput,
  buildPosPrintTestSaleReceipt,
} from "@/features/pos-print/lib/pos-print-test-fixtures";
import { printPosSaleTicketAgentOrBrowser } from "@/features/pos-print/lib/pos-sale-ticket-agent";
import { buildQuotationDocumentHtml } from "@/features/quotations/lib/quotation-document-print";
import { printPosQuotationReceiptAgentOrBrowser } from "@/features/quotations/lib/quotation-ticket-agent";
import { printPresaleTicketAgentOrBrowser } from "@/features/presale-tickets/lib/presale-ticket-agent";

export type PosDocumentTestPrintChannel = "agent" | "browser";

function wireFormat(mode: PosDocumentPrintMode): PrintFormat {
  return posDocumentPrintModeToWireFormat(mode);
}

/**
 * Imprime un documento de prueba (datos ficticios) según el modo ticket/documento configurado.
 */
export async function printPosDocumentTest(
  kind: PosDocumentPrintKind,
  mode: PosDocumentPrintMode,
): Promise<PosDocumentTestPrintChannel> {
  const format = wireFormat(mode);
  const isDocument = isPosDocumentPrintModeDocument(mode);

  switch (kind) {
    case "sale": {
      const data = buildPosPrintTestSaleReceipt("sale");
      const folio = data.folio.trim() || "ticket";
      if (isDocument) {
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
      if (isDocument) {
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
      if (isDocument) {
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
      if (isDocument) {
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
      if (isDocument) {
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
    case "presale": {
      return printPresaleTicketAgentOrBrowser(
        {
          id: "test-presale",
          code: "TESTPRESALE12345678",
          status: "READY",
          presalePointOfSaleId: "pos-test",
          branchId: "branch-test",
          priceListId: "pl-test",
          customerId: null,
          customerName: null,
          customerDocument: null,
          total: 15990,
          subtotal: 13437,
          taxAmount: 2553,
          discountAmount: 0,
          branchName: "Sucursal prueba",
          pointOfSaleName: "Preventa prueba",
          lines: [
            {
              id: "line-1",
              lineNumber: 1,
              productId: null,
              productVariantId: null,
              productName: "Producto prueba",
              productSku: null,
              variantName: null,
              quantity: 1,
              unitPrice: 13437,
              discountAmount: 0,
              taxRate: 19,
              taxAmount: 2553,
              subtotal: 13437,
              total: 15990,
              unitOfMeasure: null,
              availableStock: null,
              availableStockBase: null,
              saleUnitSymbol: null,
              stockBaseUnitSymbol: null,
              stockBaseQtyPerCountSaleUnit: null,
              unitAllowDecimals: false,
            },
          ],
          createdAt: new Date().toISOString(),
        },
        { companyName: "Empresa prueba", format },
      );
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
