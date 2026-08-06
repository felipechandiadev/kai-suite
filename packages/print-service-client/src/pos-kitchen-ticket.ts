/**
 * Comanda de cocina → agente KaiPrinters (`type: "pos-kitchen-ticket"`).
 * Ticket operativo (sin totales / sin gaveta).
 */

import type { PosSaleTicketCompany } from "./pos-sale-ticket";

export const POS_KITCHEN_TICKET_PAYLOAD_VERSION = 1;

export const POS_KITCHEN_TICKET_FOOTER_NOTE = "Comanda de cocina";

export type PosKitchenTicketLine = {
  name: string;
  quantity: number;
  notes?: string | null;
};

export type PosKitchenTicketPayload = {
  version: number;
  company: PosSaleTicketCompany;
  productionUnitName: string;
  fireNumber: number;
  accountLabel: string;
  tableCode?: string | null;
  branchName?: string | null;
  issuedAt: string;
  lines: PosKitchenTicketLine[];
  footerNote: string;
  /** true cuando es copia en POS/mesero (réplica). */
  isReplica?: boolean;
};

export type PosKitchenTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
  /** Alias de impresora en el agente (comanda UP / réplica). */
  printerDisplayLabel?: string | null;
};
