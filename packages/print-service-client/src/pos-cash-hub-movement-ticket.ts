/**
 * Ingreso / egreso de efectivo entre sesión de caja y centro de acopio
 * → agente KaiPrinters (`type: "pos-cash-hub-movement-ticket"`).
 */

import type { PosSaleTicketCompany } from "./pos-sale-ticket";

export const POS_CASH_HUB_MOVEMENT_TICKET_PAYLOAD_VERSION = 1;

export type PosCashHubMovementDirection = "IN" | "OUT";

export type PosCashHubMovementTicketPayload = {
  version: number;
  /** IN: desde centro de efectivo hacia caja. OUT: desde caja hacia centro. */
  direction: PosCashHubMovementDirection;
  documentNumber: string;
  issuedAt: string;
  amount: number;
  cashHubName: string;
  cashSessionId: string;
  reason?: string | null;
  company: PosSaleTicketCompany;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  operatorName?: string | null;
};

export type PosCashHubMovementTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
};
