/** Respuesta de `GET /api/transactions/:id/pos-sale-receipt`. */

export type PosSaleReceiptPrintDto = {
  transactionId: string;
  transactionType: string;
  folio: string;
  issuedAtIso: string;
  documentKind: "sale" | "backorder";
  backorder: {
    percent: number;
    depositAmount: number;
    orderTotal: number;
  } | null;
  company: {
    razonSocial: string;
    nombreFantasia: string | null;
    rut: string | null;
    businessActivity: string | null;
    logoUrl: string | null;
    address: string | null;
    mail: string | null;
    phone?: string | null;
  };
  pos: {
    pointOfSaleName: string | null;
    branchName: string | null;
    priceListLabel: string | null;
  };
  customer: {
    name: string | null;
    document: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  quotation: {
    documentNumber: string | null;
    validUntil: string | null;
  } | null;
  lines: Array<{
    productName: string;
    attributes: string[];
    quantity: number;
    unitSymbol: string | null;
    unitPriceWithTax: number;
    lineGross: number;
    discountAmount: number;
    discountLabel: string | null;
  }>;
  promotions: Array<{ code: string; name: string; amount: number }>;
  totals: {
    subtotalNet: number;
    subtotalGross: number;
    taxes: number;
    lineDiscounts: number;
    orderDiscount: number;
    discountsTotal: number;
    total: number;
    paid: number;
    change: number;
  };
  payments: Array<{ label: string; amount: number; detail: string | null }>;
  salePrintPlan?: "TICKET_ONLY" | "BOLETA_ONLY" | "BOLETA_AND_TICKET" | null;
};
