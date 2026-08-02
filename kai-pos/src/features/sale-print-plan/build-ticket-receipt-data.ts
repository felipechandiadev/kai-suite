import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { allocateOrderDiscount, bucketSaleTotalAfterDiscounts } from "./allocate-order-discount";
import { classifySaleLines } from "./classify-sale-lines";
import type { SalePrintPlan, SalePrintTotalsInput } from "./types";
import { lineGrossAfterLineDiscount } from "./types";

function mapCartLinesToReceiptLines(lines: PosCartLine[]): PosSaleReceiptData["lines"] {
  return lines.map((l) => {
    const q = Number(l.quantity) || 0;
    const gross = (Number(l.unitPriceWithTax) || 0) * q;
    const d = l.discount;
    const attrBits = (
      l.attributes?.map((a) => String(a.attributeValue ?? "").trim()) ?? []
    ).filter(Boolean);
    return {
      productName: l.productName,
      attributes: attrBits,
      quantity: q,
      unitSymbol: l.unitSymbol,
      unitPriceWithTax: Number(l.unitPriceWithTax) || 0,
      lineGross: gross,
      discountAmount: d?.discountAmount ?? 0,
      discountLabel:
        d && (d.promotionCode || d.promotionName)
          ? [d.promotionCode, d.promotionName].filter(Boolean).join(" · ")
          : null,
    };
  });
}

function estimateTaxesFromGross(gross: number, taxRateHint: number): { net: number; taxes: number } {
  const rate = Math.max(0, taxRateHint) / 100;
  if (rate <= 0) {
    return { net: gross, taxes: 0 };
  }
  const net = gross / (1 + rate);
  return { net, taxes: gross - net };
}

export function buildTicketReceiptDataFromCart(args: {
  base: PosSaleReceiptData;
  cartLines: PosCartLine[];
  totals: SalePrintTotalsInput;
  printPlan: SalePrintPlan;
  /** Líneas del ticket: todas (TICKET_ONLY) o solo no-DTE (BOLETA_AND_TICKET). */
  ticketScope: "full" | "non_dte";
}): PosSaleReceiptData | null {
  const { base, cartLines, totals, printPlan, ticketScope } = args;
  if (printPlan === "BOLETA_ONLY") {
    return null;
  }

  const buckets = classifySaleLines(cartLines);
  const ticketCartLines =
    ticketScope === "full" || printPlan === "TICKET_ONLY"
      ? cartLines
      : buckets.nonDteLines;
  if (ticketCartLines.length === 0) {
    return null;
  }

  const { dteOrderDiscount, nonDteOrderDiscount } = allocateOrderDiscount(
    buckets.dteLines,
    buckets.nonDteLines,
    totals.orderDiscount,
  );
  const orderDiscountShare =
    ticketScope === "full" || printPlan === "TICKET_ONLY"
      ? totals.orderDiscount
      : nonDteOrderDiscount;

  const lineDiscountsTotal = ticketCartLines.reduce(
    (acc, line) => acc + (Number(line.discount?.discountAmount) || 0),
    0,
  );
  const subtotalGross = ticketCartLines.reduce(
    (acc, line) => acc + lineGrossAfterLineDiscount(line),
    0,
  );
  const total = bucketSaleTotalAfterDiscounts(ticketCartLines, orderDiscountShare);

  const isComplement = printPlan === "BOLETA_AND_TICKET" && ticketScope === "non_dte";

  let subtotalNet: number;
  let taxes: number;
  if (isComplement) {
    subtotalNet = 0;
    taxes = 0;
  } else {
    const rateSource = ticketCartLines.length > 0 ? ticketCartLines : cartLines;
    const avgTaxRate =
      rateSource.length > 0
        ? rateSource.reduce((acc, l) => acc + (Number(l.unitTaxRate) || 0), 0) /
          rateSource.length
        : 19;
    const estimated = estimateTaxesFromGross(total, avgTaxRate);
    subtotalNet = Math.round(estimated.net);
    taxes = Math.round(estimated.taxes);
  }

  return {
    ...base,
    ticketRole: isComplement ? "non_dte_complement" : "sale",
    fiscalFolio: isComplement ? null : base.fiscalFolio,
    fiscalPrintPreview: isComplement ? null : base.fiscalPrintPreview,
    fiscalBoletaWarning: isComplement ? null : base.fiscalBoletaWarning,
    lines: mapCartLinesToReceiptLines(ticketCartLines),
    promotions: isComplement ? [] : base.promotions,
    totals: {
      subtotalNet,
      subtotalGross: Math.round(subtotalGross),
      taxes,
      lineDiscounts: lineDiscountsTotal,
      orderDiscount: Math.round(orderDiscountShare),
      discountsTotal: lineDiscountsTotal + Math.round(orderDiscountShare),
      total: Math.round(total),
      paid: printPlan === "BOLETA_AND_TICKET" ? 0 : base.totals.paid,
      change: printPlan === "BOLETA_AND_TICKET" ? 0 : base.totals.change,
      // Tip cobrado es informativo (nunca va en DTE); debe ir en el ticket que imprime el agente.
      tipAmount:
        base.totals.tipAmount != null && base.totals.tipAmount > 0
          ? Math.round(base.totals.tipAmount)
          : undefined,
    },
    payments: printPlan === "BOLETA_AND_TICKET" ? [] : base.payments,
  };
}
