import { describe, expect, it } from "vitest";
import { variantMargin } from "./variant-price-cost";
import type { ProductVariantGridRow } from "../types/product-grid.types";

const variant = (over: Partial<ProductVariantGridRow>) =>
  ({ id: "v", basePrice: 1000, pmp: 400, ...over }) as ProductVariantGridRow;

describe("variantMargin", () => {
  it("compara precio y costo directamente cuando venta y stock usan la misma unidad", () => {
    const m = variantMargin(variant({}))!;
    expect(m.cost).toBe(400);
    expect(m.amount).toBe(600);
    expect(m.percent).toBeCloseTo(60);
  });

  it("convierte el costo de stock a unidad de venta (stock en g, venta en kg)", () => {
    // Costo $0,4 por g; se vende por kg a $1000 → costo por kg = $400 con factor 1000
    const m = variantMargin(variant({ pmp: 0.4, stockBaseQtyPerCountSaleUnit: 1000 }))!;
    expect(m.cost).toBeCloseTo(400);
    expect(m.percent).toBeCloseTo(60);
  });

  it("devuelve null sin precio o sin costo", () => {
    expect(variantMargin(variant({ basePrice: 0, priceListItems: [] }))).toBeNull();
    expect(variantMargin(variant({ pmp: null, baseCost: 0 }))).toBeNull();
  });
});
