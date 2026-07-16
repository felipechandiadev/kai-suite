import { describe, expect, it } from "vitest";
import {
  applyUnitGrossPriceToCartLine,
  parseClpCurrencyInput,
  splitUnitGrossPrice,
} from "./apply-cart-line-unit-gross-price";

describe("apply-cart-line-unit-gross-price", () => {
  it("parseClpCurrencyInput reads digits as CLP integers", () => {
    expect(parseClpCurrencyInput("$14.268")).toBe(14268);
    expect(parseClpCurrencyInput("")).toBeNull();
    expect(parseClpCurrencyInput("0")).toBeNull();
  });

  it("splitUnitGrossPrice splits 19% IVA", () => {
    const parts = splitUnitGrossPrice(1190, 19);
    expect(parts.unitPriceWithTax).toBe(1190);
    expect(parts.unitPrice).toBe(1000);
    expect(parts.unitTaxAmount).toBe(190);
  });

  it("splitUnitGrossPrice treats zero rate as tax-exempt", () => {
    const parts = splitUnitGrossPrice(5000, 0);
    expect(parts).toEqual({
      unitPrice: 5000,
      unitTaxAmount: 0,
      unitPriceWithTax: 5000,
    });
  });

  it("applyUnitGrossPriceToCartLine updates line fields", () => {
    const next = applyUnitGrossPriceToCartLine(
      {
        unitTaxRate: 19,
        unitPrice: 1000,
        unitTaxAmount: 190,
        unitPriceWithTax: 1190,
      },
      14268,
    );
    expect(next.unitPriceWithTax).toBe(14268);
    expect(next.unitPrice + next.unitTaxAmount).toBe(14268);
  });
});
