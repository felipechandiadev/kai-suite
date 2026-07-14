import { describe, expect, it } from "vitest";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { computePosSaleTotals } from "./pos-sale-totals";

function line(partial: Partial<PosCartLine> & { variantId: string }): PosCartLine {
  return {
    variantId: partial.variantId,
    productId: partial.productId ?? "p1",
    productName: partial.productName ?? "Producto",
    sku: partial.sku ?? "SKU",
    unitPrice: partial.unitPrice ?? 1000,
    unitPriceWithTax: partial.unitPriceWithTax ?? 1190,
    quantity: partial.quantity ?? 1,
    attributes: partial.attributes ?? null,
    discount: partial.discount ?? null,
    ...partial,
  } as PosCartLine;
}

describe("computePosSaleTotals", () => {
  it("returns zero totals for empty cart", () => {
    const totals = computePosSaleTotals([], 0);
    expect(totals).toEqual({
      net: 0,
      gross: 0,
      taxes: 0,
      lineDiscountsTotal: 0,
      orderDiscount: 0,
      discounts: 0,
      saleTotal: 0,
    });
  });

  it("computes net, gross and taxes without discounts", () => {
    const totals = computePosSaleTotals(
      [line({ variantId: "v1", quantity: 2, unitPrice: 1000, unitPriceWithTax: 1190 })],
      0,
    );
    expect(totals.net).toBe(2000);
    expect(totals.gross).toBe(2380);
    expect(totals.taxes).toBe(380);
    expect(totals.discounts).toBe(0);
    expect(totals.saleTotal).toBe(2380);
  });

  it("applies line and order discounts to saleTotal", () => {
    const totals = computePosSaleTotals(
      [
        line({
          variantId: "v1",
          quantity: 2,
          unitPriceWithTax: 1000,
          discount: {
            promotionId: "p1",
            promotionCode: "X",
            promotionName: "Promo",
            discountPercentage: 0,
            discountAmount: 200,
            appliedQuantity: 2,
          },
        }),
      ],
      100,
    );
    expect(totals.lineDiscountsTotal).toBe(200);
    expect(totals.orderDiscount).toBe(100);
    expect(totals.discounts).toBe(300);
    expect(totals.saleTotal).toBe(1700);
  });
});
