/**
 * Cuenta bancaria de empresa (transferencia POS) → agente KaiPrinters (`type: "pos-bank-account-ticket"`).
 */

import type { PosSaleTicketCompany } from "./pos-sale-ticket";

export const POS_BANK_ACCOUNT_TICKET_PAYLOAD_VERSION = 1;

export type PosBankAccountTicketPayload = {
  version: number;
  accountKey: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolderName?: string | null;
  notes?: string | null;
  isPrimary?: boolean;
  company: PosSaleTicketCompany;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  paymentMethodLabel?: string | null;
  issuedAt: string;
};

export type PosBankAccountTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
};
