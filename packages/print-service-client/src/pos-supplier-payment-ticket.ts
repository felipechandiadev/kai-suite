/**
 * Pago a proveedor en efectivo desde sesión de caja POS
 * → agente KaiPrinters (`type: "pos-supplier-payment-ticket"`).
 */

import type { PosSaleTicketCompany } from "./pos-sale-ticket";

export const POS_SUPPLIER_PAYMENT_TICKET_PAYLOAD_VERSION = 1;

export type PosSupplierPaymentTicketPayload = {
  version: number;
  documentNumber: string;
  issuedAt: string;
  amount: number;
  supplierName: string;
  supplierDocument?: string | null;
  /** Folio interno de recepción / documento de compra. */
  receptionDocumentNumber?: string | null;
  /** Referencia del documento del proveedor (factura/boleta). */
  supplierDocumentRef?: string | null;
  cashSessionId: string;
  paymentMethodLabel?: string | null;
  reason?: string | null;
  company: PosSaleTicketCompany;
  branchName?: string | null;
  pointOfSaleName?: string | null;
  operatorName?: string | null;
};

export type PosSupplierPaymentTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  purpose?: string;
};
