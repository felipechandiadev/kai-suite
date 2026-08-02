/**
 * Ticket de venta POS → agente KaiPrinters (`type: "pos-sale-ticket"`).
 * PDF vectorial en el agente; layout alineado al HTML del POS (`buildPosSaleReceiptHtml`).
 */

export const POS_SALE_TICKET_PAYLOAD_VERSION = 1;

export type PosSaleTicketDocumentKind = "sale" | "backorder";

export type PosSaleTicketCompany = {
  razonSocial: string;
  nombreFantasia: string | null;
  rut: string | null;
  businessActivity: string | null;
  /** PNG/JPEG en base64 (sin prefijo data:); opcional, mismo logo que el ticket HTML. */
  logoBase64?: string | null;
};

export type PosSaleTicketCustomer = {
  name?: string | null;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type PosSaleTicketQuotation = {
  documentNumber?: string | null;
  validUntil?: string | null;
};

export type PosSaleTicketLine = {
  productName: string;
  attributes: string[];
  quantity: number;
  unitSymbol: string | null;
  unitPriceWithTax: number;
  lineGross: number;
  discountAmount?: number;
  discountLabel?: string | null;
};

export type PosSaleTicketPromotion = {
  code: string;
  name: string;
  amount: number;
};

export type PosSaleTicketPayment = {
  label: string;
  amount: number;
  detail: string | null;
};

export type PosSaleTicketBackorder = {
  percent: number;
  depositAmount: number;
  orderTotal: number;
};

export type PosSaleTicketTotals = {
  subtotalNet: number;
  taxes: number;
  lineDiscounts: number;
  orderDiscount: number;
  total: number;
  change: number;
  /** Propina cobrada (informativa; fuera del total fiscal / DTE). */
  tipAmount?: number | null;
};

export type PosSaleTicketCollectionRow = {
  folio: string;
  amount: number;
};

export type PosSaleTicketQuotaCollectionRow = {
  folio: string;
  dueDate?: string | null;
  amount: number;
};

export type PosSaleTicketCreditInstallmentRow = {
  installmentNumber: number;
  dueDate: string;
  amount: number;
};

export type PosSaleTicketPayload = {
  version: typeof POS_SALE_TICKET_PAYLOAD_VERSION;
  folio: string;
  issuedAtIso: string;
  documentKind: PosSaleTicketDocumentKind;
  backorder?: PosSaleTicketBackorder | null;
  /** Folio SII cuando la venta emitió boleta (referencia en ticket interno). */
  fiscalFolio?: string | null;
  fiscalBoletaWarning?: string | null;
  /** Complemento no-DTE: sin banner fiscal en impresión. */
  ticketRole?: "sale" | "non_dte_complement";
  /** Venta registrada sin cobro inmediato. */
  collectionPending?: boolean;
  arCollection?: PosSaleTicketCollectionRow[] | null;
  quotaCollection?: PosSaleTicketQuotaCollectionRow[] | null;
  creditInstallmentPlan?: PosSaleTicketCreditInstallmentRow[] | null;
  ncPayout?: PosSaleTicketCollectionRow[] | null;
  company: PosSaleTicketCompany;
  customer?: PosSaleTicketCustomer | null;
  quotation?: PosSaleTicketQuotation | null;
  lines: PosSaleTicketLine[];
  promotions: PosSaleTicketPromotion[];
  totals: PosSaleTicketTotals;
  payments: PosSaleTicketPayment[];
  /** Operador POS al emitir/imprimir (pie «Operador:»). */
  operatorName?: string | null;
};

export type PosSaleTicketPrintExtras = {
  filename: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
};
