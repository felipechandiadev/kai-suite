import { describe, expect, it } from "vitest";
import { posCartQuantityExceedsAvailableStock } from "./posProductPreview";

describe("posCartQuantityExceedsAvailableStock", () => {
  const base = {
    trackInventory: true,
    availableStock: 0,
    availableStockBase: 0,
    stockBaseQtyPerCountSaleUnit: null,
    unitAllowDecimals: false,
    quantity: 1,
  };

  it("no bloquea PREPARADO de cuenta dining aunque stock terminado sea 0", () => {
    expect(
      posCartQuantityExceedsAvailableStock({
        ...base,
        productType: "PREPARADO",
        metadata: { sourceDiningOrder: true },
      }),
    ).toBe(false);
  });

  it("bloquea PHYSICAL de cuenta dining sin stock", () => {
    expect(
      posCartQuantityExceedsAvailableStock({
        ...base,
        productType: "PHYSICAL",
        metadata: { sourceDiningOrder: true },
      }),
    ).toBe(true);
  });

  it("bloquea PREPARADO de venta normal (no dining) sin stock", () => {
    expect(
      posCartQuantityExceedsAvailableStock({
        ...base,
        productType: "PREPARADO",
        metadata: null,
      }),
    ).toBe(true);
  });

  it("no bloquea PREPARADO retail cuando relaxPreparadoStock", () => {
    expect(
      posCartQuantityExceedsAvailableStock(
        {
          ...base,
          productType: "PREPARADO",
          metadata: null,
        },
        { relaxPreparadoStock: true },
      ),
    ).toBe(false);
  });

  it("bloquea sin productType cuando hay stock insuficiente", () => {
    expect(
      posCartQuantityExceedsAvailableStock({
        ...base,
        metadata: { sourceDiningOrder: true },
      }),
    ).toBe(true);
  });
});
