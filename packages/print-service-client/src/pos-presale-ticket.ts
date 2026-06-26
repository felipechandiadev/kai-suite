/**
 * Ticket de preventa POS → agente KaiPrinters (`type: "pos-presale-ticket"`).
 */

import type { PosSaleTicketCompany } from "./pos-sale-ticket";

export const POS_PRESALE_TICKET_PAYLOAD_VERSION = 1;

export type PosPresaleTicketLine = {
  productName: string;
  variantName?: string | null;
  quantity: number;
  total: number;
};

export type PosPresaleTicketPayload = {
  version: number;
  code: string;
  qrPayload: string;
  issuedAt: string;
  company: PosSaleTicketCompany;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  lines: PosPresaleTicketLine[];
  total: number;
};

export type PosPresaleTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
};
