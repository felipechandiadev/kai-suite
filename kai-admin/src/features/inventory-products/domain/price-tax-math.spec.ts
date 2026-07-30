import { describe, expect, it } from "vitest";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import {
  effectiveGrossFactor,
  effectiveIvaFactor,
  evaluateMaxDiscountImpact,
  netFromCostAndMargin,
  netFromCostMarginAndDiscount,
  netToGross,
  resolvePricingGrossFactor,
} from "./price-tax-math";

function tax(partial: Partial<TaxListItem> & Pick<TaxListItem, "id" | "taxType" | "rate">): TaxListItem {
  return {
    companyId: "c1",
    name: partial.name ?? partial.id,
    code: null,
    description: null,
    isDefault: false,
    isActive: true,
    ...partial,
  };
}

describe("effectiveGrossFactor", () => {
  const catalog: TaxListItem[] = [
    tax({ id: "iva", taxType: "IVA", rate: 19, name: "IVA" }),
    tax({ id: "ila", taxType: "SPECIFIC", rate: 10, name: "ILA" }),
    tax({ id: "ret", taxType: "RETENTION", rate: 10.75, name: "Retención" }),
  ];

  it("sums IVA and SPECIFIC rates", () => {
    expect(effectiveGrossFactor(catalog, ["iva", "ila"])).toBe(1.29);
    expect(netToGross(1000, effectiveGrossFactor(catalog, ["iva", "ila"]))).toBe(1290);
  });

  it("ignores RETENTION", () => {
    expect(effectiveGrossFactor(catalog, ["iva", "ret"])).toBe(1.19);
  });

  it("returns 1 when nothing selected", () => {
    expect(effectiveGrossFactor(catalog, [])).toBe(1);
  });

  it("effectiveIvaFactor delegates to gross factor", () => {
    expect(effectiveIvaFactor(catalog, ["iva", "ila"])).toBe(1.29);
  });
});

describe("resolvePricingGrossFactor", () => {
  const catalog: TaxListItem[] = [
    tax({ id: "iva", taxType: "IVA", rate: 19, name: "IVA" }),
    tax({ id: "ila", taxType: "SPECIFIC", rate: 10, name: "ILA" }),
  ];

  it("returns 1 for TAX_PRE_PAID (cigarrillos)", () => {
    expect(resolvePricingGrossFactor("TAX_PRE_PAID", catalog, ["iva"])).toBe(1);
    expect(netToGross(5000, resolvePricingGrossFactor("TAX_PRE_PAID", catalog, ["iva"]))).toBe(5000);
  });

  it("uses effectiveGrossFactor for TAX_STANDARD", () => {
    expect(resolvePricingGrossFactor("TAX_STANDARD", catalog, ["iva", "ila"])).toBe(1.29);
  });
});

describe("netFromCostAndMargin", () => {
  it("uses margin on sale (not markup on cost)", () => {
    expect(netFromCostAndMargin(900, 10)).toBe(1000);
  });

  it("ignores discount arg on deprecated alias (no cushion)", () => {
    expect(netFromCostMarginAndDiscount(900, 10, 10)).toBe(1000);
  });
});

describe("evaluateMaxDiscountImpact", () => {
  it("flags margin erosion when max discount wipes expected margin", () => {
    // list 1000, cost 900, expected 10%; 10% discount → 900 net → 0% margin, below expected
    const preview = evaluateMaxDiscountImpact(900, 1000, 10, 10);
    expect(preview.netAfterMaxDiscount).toBe(900);
    expect(preview.effectiveMarginPercent).toBeCloseTo(0, 5);
    expect(preview.isBelowCost).toBe(false);
    expect(preview.isMarginEroded).toBe(true);
  });

  it("flags below cost when discount exceeds margin room", () => {
    const preview = evaluateMaxDiscountImpact(900, 1000, 10, 15);
    expect(preview.netAfterMaxDiscount).toBe(850);
    expect(preview.isBelowCost).toBe(true);
    expect(preview.isMarginEroded).toBe(true);
  });

  it("ok when max discount leaves expected margin", () => {
    // list 1000, 5% dto → 950; margin = 50/950 ≈ 5.26% < 10% still eroded
    // Need higher list: cost 900, margin 20% → list 1125; max dto 5% → 1069; eff ≈ 15.8% < 20 eroded
    // cost 900, margin 10% → 1000; max dto 0 → ok
    const preview = evaluateMaxDiscountImpact(900, 1000, 10, 0);
    expect(preview.isMarginEroded).toBe(false);
    expect(preview.isBelowCost).toBe(false);
  });
});
