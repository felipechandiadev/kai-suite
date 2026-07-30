/** Contrato alineado con `PosSaleReceiptData` del POS (venta / encargo, hoja o ticket). */
export type SaleReceiptPrintData = {
  folio: string;
  issuedAtIso: string;
  documentKind: "sale" | "backorder";
  backorder?: {
    depositAmount: number;
    orderTotal: number;
    percent: number;
  } | null;
  company: {
    razonSocial: string;
    nombreFantasia: string | null;
    rut: string | null;
    businessActivity: string | null;
    logoUrl: string | null;
    address?: string | null;
    mail?: string | null;
    phone?: string | null;
  };
  pos: {
    pointOfSaleName: string | null;
    branchName: string | null;
    priceListLabel: string | null;
  };
  customer: { name: string; document: string | null } | null;
  lines: Array<{
    productName: string;
    attributes: string[];
    quantity: number;
    unitPriceWithTax: number;
    lineGross: number;
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
};

/** @deprecated Usar `SaleReceiptPrintData`. */
export type BackorderDocumentPrintData = SaleReceiptPrintData;
