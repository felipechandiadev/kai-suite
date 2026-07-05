/**
 * Cotización POS → agente KaiPrinters (`type: "pos-quotation-ticket"`).
 */

import type { PosSaleTicketCompany } from "./pos-sale-ticket";

export const POS_QUOTATION_TICKET_PAYLOAD_VERSION = 1;

export type PosQuotationTicketLine = {
  productName: string;
  variantName?: string | null;
  productSku?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type PosQuotationTicketPayload = {
  version: number;
  documentNumber: string;
  issuedAt: string;
  validUntil: string;
  company: PosSaleTicketCompany;
  customerName?: string | null;
  customerDocument?: string | null;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  lines: PosQuotationTicketLine[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  operatorName?: string | null;
};

export type PosQuotationTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
};
