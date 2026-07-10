import { describe, expect, it } from "vitest";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import { effectiveGrossFactor, effectiveIvaFactor, netToGross, resolvePricingGrossFactor } from "./price-tax-math";

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
