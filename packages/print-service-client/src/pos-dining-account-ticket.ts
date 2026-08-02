/**
 * Cuenta / pre-cuenta dining → agente KaiPrinters (`type: "pos-dining-account-ticket"`).
 * Documento informativo para el cliente (no es boleta ni ticket de venta).
 */

import type { PosSaleTicketCompany } from "./pos-sale-ticket";

export const POS_DINING_ACCOUNT_TICKET_PAYLOAD_VERSION = 1;

export const POS_DINING_ACCOUNT_TICKET_FOOTER_NOTE =
  "Documento informativo — no válido como boleta";

export type PosDiningAccountTicketLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string | null;
};

export type PosDiningAccountTicketAccount = {
  displayLabel: string;
  tableCode?: string | null;
  kind: string;
  status: string;
};

export type PosDiningAccountTicketPayload = {
  version: number;
  company: PosSaleTicketCompany;
  account: PosDiningAccountTicketAccount;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  issuedAt: string;
  lines: PosDiningAccountTicketLine[];
  totals: {
    total: number;
    /** Propina sugerida (informativa; no fiscal). */
    tipSuggestedAmount?: number | null;
    tipSuggestPercent?: number | null;
    totalWithTip?: number | null;
  };
  footerNote: string;
};

export type PosDiningAccountTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
};
