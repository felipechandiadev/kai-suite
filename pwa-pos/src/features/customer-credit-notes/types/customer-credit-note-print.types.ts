import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { CompanyDetails } from "@/features/company/infrastructure/company.request";
import type { PosContextV1 } from "@/features/session/lib/pos-context-storage";

export type CustomerCreditNotePrintLine = {
  productName: string;
  attributes: string[];
  quantity: number;
  unitSymbol: string | null;
  unitPriceWithTax: number;
  lineGross: number;
  discountAmount: number;
};

export type CustomerCreditNoteRefundPayment = {
  label: string;
  amount: number;
};

export type CustomerCreditNotePrintData = {
  creditNoteFolio: string;
  saleReturnFolio: string;
  originalSaleFolio: string;
  issuedAtIso: string;
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
  };
  customer: PosSaleCustomer | null;
  lines: CustomerCreditNotePrintLine[];
  totals: {
    subtotalNet: number;
    taxes: number;
    discounts: number;
    total: number;
  };
  refundMode: "document" | "immediate";
  refundPayments: CustomerCreditNoteRefundPayment[];
  operatorName?: string | null;
};

export type BuildCustomerCreditNotePrintInput = {
  creditNote: { documentNumber: string; total: number };
  saleReturn: {
    documentNumber: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
  };
  originalSale: { documentNumber: string };
  cartLines: PosCartLine[];
  customer: PosSaleCustomer | null;
  company: CompanyDetails | null;
  posContext: PosContextV1 | null;
  lineDiscountsTotal: number;
  refundMode?: "document" | "immediate";
  refundPayments?: CustomerCreditNoteRefundPayment[];
  operatorName?: string | null;
};
