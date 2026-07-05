/**
 * Nota de crédito POS → agente KaiPrinters (`type: "pos-customer-credit-note-ticket"`).
 */

import type { PosSaleTicketCompany } from "./pos-sale-ticket";

export const POS_CUSTOMER_CREDIT_NOTE_TICKET_PAYLOAD_VERSION = 1;

export type PosCustomerCreditNoteTicketLine = {
  productName: string;
  attributes?: string[];
  quantity: number;
  unitPriceWithTax: number;
  lineTotal: number;
};

export type PosCustomerCreditNoteRefundPayment = {
  label: string;
  amount: number;
};

export type PosCustomerCreditNoteTicketPayload = {
  version: number;
  creditNoteFolio: string;
  saleReturnFolio: string;
  originalSaleFolio: string;
  issuedAtIso: string;
  company: PosSaleTicketCompany;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  customerName?: string | null;
  customerDocument?: string | null;
  lines: PosCustomerCreditNoteTicketLine[];
  totals: {
    subtotalNet: number;
    taxes: number;
    discounts: number;
    total: number;
  };
  refundMode?: "document" | "immediate";
  refundPayments?: PosCustomerCreditNoteRefundPayment[];
  operatorName?: string | null;
};

export type PosCustomerCreditNoteTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
};
