import { describe, expect, it, vi } from "vitest";

vi.mock("@kai-shared/storage-key-migrate", () => ({
  getMigratedLocalStorageItem: () => null,
  setMigratedLocalStorageItem: () => undefined,
}));

import {
  CART_SLOT_COUNT,
  emptySlotSnapshot,
  isSlotEmpty,
  normalizeActiveSlot,
  parseCartEnvelopeRaw,
  parseLegacySingleCartRaw,
  summarizeCartSlot,
} from "./cart-storage";

const stamp = { priceListId: "list-a", priceListName: "Lista A" };

function lineItem(variantId: string) {
  return {
    productId: "p1",
    productName: "Producto",
    productDescription: null,
    productImageUrl: null,
    variantId,
    sku: "SKU-1",
    barcode: null,
    unitSymbol: "u",
    unitId: null,
    unitAllowDecimals: false,
    unitPrice: 1000,
    unitTaxRate: 0.19,
    unitTaxAmount: 190,
    unitPriceWithTax: 1190,
    trackInventory: true,
    availableStock: 10,
    availableStockBase: null,
    attributes: [],
    metadata: null,
    taxCategory: "AFFECTED",
    requiresDte: true,
    taxIds: [],
    priceListId: stamp.priceListId,
    priceListName: stamp.priceListName,
  };
}

describe("cart-storage multi-slot envelope", () => {
  it("isSlotEmpty is true for empty snapshot", () => {
    expect(isSlotEmpty(emptySlotSnapshot())).toBe(true);
  });

  it("isSlotEmpty is false when lines exist", () => {
    const snap = emptySlotSnapshot();
    snap.lines = [{ ...lineItem("v1"), quantity: 2 }];
    expect(isSlotEmpty(snap)).toBe(false);
  });

  it("normalizeActiveSlot clamps out of range", () => {
    expect(normalizeActiveSlot(-1)).toBe(0);
    expect(normalizeActiveSlot(0)).toBe(0);
    expect(normalizeActiveSlot(3)).toBe(3);
    expect(normalizeActiveSlot(99)).toBe(CART_SLOT_COUNT - 1);
    expect(normalizeActiveSlot("2")).toBe(2);
    expect(normalizeActiveSlot("x")).toBe(0);
  });

  it("migrates legacy v4 single cart into slot 0 and pads to 4", () => {
    const raw = JSON.stringify({
      v: 4,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lines: [
        {
          variantId: "v1",
          quantity: 2,
          discount: null,
          item: lineItem("v1"),
        },
      ],
      customer: {
        customerId: "c1",
        name: "Ana",
        document: "1-9",
        phone: "",
        email: null,
      },
      cartMode: "sale",
      payments: null,
    });

    const env = parseCartEnvelopeRaw(raw, stamp);
    expect(env.activeSlot).toBe(0);
    expect(env.slots).toHaveLength(CART_SLOT_COUNT);
    expect(env.slots[0].lines).toHaveLength(1);
    expect(env.slots[0].lines[0]?.variantId).toBe("v1");
    expect(env.slots[0].customer?.name).toBe("Ana");
    expect(isSlotEmpty(env.slots[1])).toBe(true);
    expect(isSlotEmpty(env.slots[2])).toBe(true);
    expect(isSlotEmpty(env.slots[3])).toBe(true);
  });

  it("pads v5 envelope with 2 slots to 4", () => {
    const raw = JSON.stringify({
      v: 5,
      updatedAt: "2026-01-01T00:00:00.000Z",
      activeSlot: 1,
      slots: [
        {
          lines: [
            {
              variantId: "v1",
              quantity: 1,
              item: lineItem("v1"),
            },
          ],
          cartMode: "sale",
        },
        {
          lines: [
            {
              variantId: "v2",
              quantity: 3,
              item: lineItem("v2"),
            },
          ],
          customer: {
            customerId: null,
            name: "Pedro",
            document: "",
            phone: "",
            email: null,
          },
          cartMode: "sale",
        },
      ],
    });

    const env = parseCartEnvelopeRaw(raw, stamp);
    expect(env.activeSlot).toBe(1);
    expect(env.slots).toHaveLength(4);
    expect(env.slots[0].lines[0]?.variantId).toBe("v1");
    expect(env.slots[1].lines[0]?.quantity).toBe(3);
    expect(env.slots[1].customer?.name).toBe("Pedro");
    expect(isSlotEmpty(env.slots[2])).toBe(true);
    expect(isSlotEmpty(env.slots[3])).toBe(true);

    const summary1 = summarizeCartSlot(1, env.slots[1]);
    expect(summary1.itemsCount).toBe(3);
    expect(summary1.customerName).toBe("Pedro");
    expect(summary1.isEmpty).toBe(false);
  });

  it("parses v5 envelope with 4 slots and activeSlot 3", () => {
    const raw = JSON.stringify({
      v: 5,
      updatedAt: "2026-01-01T00:00:00.000Z",
      activeSlot: 3,
      slots: [
        { lines: [], cartMode: "sale" },
        { lines: [], cartMode: "sale" },
        { lines: [], cartMode: "sale" },
        {
          lines: [
            {
              variantId: "v4",
              quantity: 1,
              item: lineItem("v4"),
            },
          ],
          cartMode: "sale",
        },
      ],
    });

    const env = parseCartEnvelopeRaw(raw, stamp);
    expect(env.activeSlot).toBe(3);
    expect(env.slots).toHaveLength(4);
    expect(env.slots[3].lines[0]?.variantId).toBe("v4");
    expect(isSlotEmpty(env.slots[0])).toBe(true);
  });

  it("parseLegacySingleCartRaw returns empty for invalid version", () => {
    const raw = JSON.stringify({ v: 99, lines: [] });
    const snap = parseLegacySingleCartRaw(raw, stamp);
    expect(isSlotEmpty(snap)).toBe(true);
  });
});
