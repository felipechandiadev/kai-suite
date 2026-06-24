import {
  getAdminDocumentPrintFormat,
  type AdminDocumentPrintKind,
  type PrintFormat,
} from "@flowstore/print-service-client";
import type { SaleReceiptPrintData } from "./backorder-document-print.types";

export function adminDocumentPrintKindForData(data: SaleReceiptPrintData): AdminDocumentPrintKind {
  return data.documentKind === "backorder" ? "backorder" : "sale";
}

export function adminDocumentPrintKindForTransactionType(
  transactionType: string,
): AdminDocumentPrintKind {
  return String(transactionType ?? "").trim() === "BACKORDER" ? "backorder" : "sale";
}

export function getAdminPrintFormatForData(data: SaleReceiptPrintData): PrintFormat {
  return getAdminDocumentPrintFormat(adminDocumentPrintKindForData(data));
}

export function getAdminPrintFormatForTransactionType(transactionType: string): PrintFormat {
  return getAdminDocumentPrintFormat(adminDocumentPrintKindForTransactionType(transactionType));
}
