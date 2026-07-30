import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";

export type SaleDocumentKind = "TICKET" | "BOLETA" | "FACTURA";

export type SalePrintPlan = "TICKET_ONLY" | "BOLETA_ONLY" | "BOLETA_AND_TICKET";

export type SaleLineBuckets = {
  dteLines: PosCartLine[];
  nonDteLines: PosCartLine[];
};

export type SalePrintTotalsInput = {
  net: number;
  gross: number;
  taxes: number;
  discounts: number;
  saleTotal: number;
  orderDiscount: number;
  lineDiscountsTotal: number;
};

export function lineRequiresDte(line: Pick<PosCartLine, "requiresDte">): boolean {
  return line.requiresDte !== false;
}

export function lineGrossAfterLineDiscount(line: PosCartLine): number {
  const q = Number(line.quantity) || 0;
  const gross = (Number(line.unitPriceWithTax) || 0) * q;
  const lineDisc = Number(line.discount?.discountAmount) || 0;
  return Math.max(0, gross - lineDisc);
}
