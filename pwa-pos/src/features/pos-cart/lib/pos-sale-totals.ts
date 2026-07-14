import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";

export type PosSaleTotals = {
  net: number;
  gross: number;
  taxes: number;
  lineDiscountsTotal: number;
  orderDiscount: number;
  discounts: number;
  saleTotal: number;
};

/**
 * Totales de venta POS: subtotal neto/bruto, impuestos, descuentos por línea/orden y total final.
 * Fuente única para carro, cobro, customer display y payloads.
 */
export function computePosSaleTotals(
  lines: PosCartLine[],
  orderDiscount = 0,
): PosSaleTotals {
  const { net, gross } = lines.reduce(
    (acc, l) => {
      const q = Number(l.quantity) || 0;
      acc.net += (Number(l.unitPrice) || 0) * q;
      acc.gross += (Number(l.unitPriceWithTax) || 0) * q;
      return acc;
    },
    { net: 0, gross: 0 },
  );

  const lineDiscountsTotal = lines.reduce(
    (acc, l) => acc + (l.discount?.discountAmount ?? 0),
    0,
  );
  const normalizedOrderDiscount = orderDiscount ?? 0;
  const discounts = lineDiscountsTotal + normalizedOrderDiscount;
  const taxes = Math.max(0, gross - net);
  const saleTotal = Math.max(0, gross - discounts);

  return {
    net,
    gross,
    taxes,
    lineDiscountsTotal,
    orderDiscount: normalizedOrderDiscount,
    discounts,
    saleTotal,
  };
}
