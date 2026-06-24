import { describe, expect, it } from "vitest";
import { buildCustomerDisplaySnapshot, computeCustomerDisplaySaleTotal } from "./build-customer-display-snapshot";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";

function line(partial: Partial<PosCartLine> & { variantId: string }): PosCartLine {
  return {
    variantId: partial.variantId,
    productId: partial.productId ?? "p1",
    name: partial.productName ?? partial.name ?? "Producto",
    productName: partial.productName ?? partial.name ?? "Producto",
    sku: partial.sku ?? "SKU",
    unitPrice: partial.unitPrice ?? 1000,
    unitPriceWithTax: partial.unitPriceWithTax ?? 1190,
    quantity: partial.quantity ?? 1,
    attributes: partial.attributes ?? null,
    discount: partial.discount ?? null,
    ...partial,
  } as PosCartLine;
}

describe("buildCustomerDisplaySnapshot", () => {
  const ctx = { pointOfSaleId: "pos-1", pointOfSaleName: "Caja 1", branchName: "Sucursal" };

  it("returns idle when cart is empty", () => {
    const snap = buildCustomerDisplaySnapshot({ lines: [], orderDiscount: 0, ctx });
    expect(snap?.state).toBe("idle");
    expect(snap?.total).toBe(0);
  });

  it("computes total with line and order discounts", () => {
    const lines = [
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
    ];
    const total = computeCustomerDisplaySaleTotal(lines, 100);
    expect(total).toBe(1700);
    const snap = buildCustomerDisplaySnapshot({ lines, orderDiscount: 100, ctx });
    expect(snap?.state).toBe("active_sale");
    expect(snap?.total).toBe(1700);
    expect(snap?.lines[0]?.lineTotal).toBe(1800);
  });
});
