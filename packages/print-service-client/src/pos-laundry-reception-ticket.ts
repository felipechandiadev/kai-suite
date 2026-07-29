/**
 * Ticket guía recepción lavandería → KaiPrinters (`type: "pos-laundry-reception-ticket"`).
 * Sin desglose de impuestos.
 */

import type { PosSaleTicketCompany } from "./pos-sale-ticket";

export const POS_LAUNDRY_RECEPTION_TICKET_PAYLOAD_VERSION = 1;

export const POS_LAUNDRY_RECEPTION_TICKET_FOOTER_NOTE =
  "Comprobante de recepción — presente este código al retirar";

export type PosLaundryReceptionTicketServiceLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PosLaundryReceptionTicketGarment = {
  label: string;
  quantity: number;
  careInstructions?: string | null;
  services: PosLaundryReceptionTicketServiceLine[];
};

export type PosLaundryReceptionTicketPayload = {
  version: number;
  code: string;
  issuedAt: string;
  company: PosSaleTicketCompany;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  customerName: string;
  customerPhone?: string | null;
  promisedAt?: string | null;
  paymentModeLabel: string;
  garments: PosLaundryReceptionTicketGarment[];
  totals: {
    servicesTotal: number;
    depositPaid?: number;
    balanceDue?: number;
  };
  footerNote: string;
  operatorName?: string | null;
};

export type PosLaundryReceptionTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
};
