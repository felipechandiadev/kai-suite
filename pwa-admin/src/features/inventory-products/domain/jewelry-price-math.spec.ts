import { describe, expect, it } from "vitest";
import {
  computeJewelryNetPrice,
  computeJewelryTotalCost,
  parseJewelryMoneyField,
  parseJewelryPercent,
} from "./jewelry-price-math";

describe("jewelry-price-math", () => {
  it("computes net price with merma, metal, costs and margin on sale", () => {
    // cost 18000; margen 20% → 18000 / 0.8 = 22500
    const net = computeJewelryNetPrice({
      weightGrams: 10,
      metalPricePerGram: 1000,
      mermaPercent: 10,
      utilityPercent: 20,
      stonesCost: 5000,
      laborCost: 2000,
      otherCosts: 0,
    });
    expect(net).toBe(22500);
    expect(
      computeJewelryTotalCost({
        weightGrams: 10,
        metalPricePerGram: 1000,
        mermaPercent: 10,
        utilityPercent: 20,
        stonesCost: 5000,
        laborCost: 2000,
        otherCosts: 0,
      }),
    ).toBe(18000);
  });

  it("clamps percent inputs", () => {
    expect(parseJewelryPercent("150")).toBe(100);
    expect(parseJewelryPercent("-5")).toBe(0);
  });

  it("parses money fields", () => {
    expect(parseJewelryMoneyField("$ 12.500")).toBe(12.5);
  });
});
