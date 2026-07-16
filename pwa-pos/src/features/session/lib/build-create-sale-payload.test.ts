import { describe, expect, it } from "vitest";
import { buildCreateSaleClientPayload } from "./build-create-sale-payload";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";

const baseInput = {
  pointOfSaleId: "pos-1",
  cashSessionId: "session-1",
  cartLines: [] as PosCartLine[],
  customer: { customerId: "cust-1", name: "Cliente", document: "", phone: "", email: null },
  appliedPromotions: [],
  appliedTotal: 100000,
  overpay: 0,
};

function cartLine(variantId: string, requiresDte: boolean): PosCartLine {
  return {
    productId: "p1",
    variantId,
    productName: variantId,
    productDescription: null,
    productImageUrl: null,
    sku: null,
    barcode: null,
    unitSymbol: "UN",
    unitId: null,
    unitAllowDecimals: false,
    unitPrice: 1000,
    unitTaxRate: 19,
    unitTaxAmount: 190,
    unitPriceWithTax: 1190,
    trackInventory: false,
    availableStock: null,
    availableStockBase: null,
    attributes: [],
    metadata: null,
    taxCategory: "TAX_STANDARD",
    requiresDte,
    taxIds: [],
    quantity: 1,
    discount: null,
  };
}

describe("buildCreateSaleClientPayload installment metadata", () => {
  it("includes installment metadata when INTERNAL_CREDIT has scheduled plan", () => {
    const payments: PosPaymentLine[] = [
      {
        id: "ic-1",
        type: "INTERNAL_CREDIT",
        amount: 100000,
        reference: "",
        companyPaymentMethodId: "pm-ic",
        internalCreditPlan: {
          mode: "CREDIT_SCHEDULED",
          creditAmount: 100000,
          scheduledLines: [
            { installmentNumber: 1, dueDate: "2026-07-15", amount: 50000 },
            { installmentNumber: 2, dueDate: "2026-08-15", amount: 50000 },
          ],
        },
      },
    ];
    const payload = buildCreateSaleClientPayload({ ...baseInput, payments });
    expect(payload.metadata?.numberOfInstallments).toBe(2);
    expect(payload.metadata?.firstDueDate).toBe("2026-07-15");
    expect(payload.metadata?.paymentSchedule).toHaveLength(2);
  });

  it("omits installment metadata for lump-sum internal credit", () => {
    const payments: PosPaymentLine[] = [
      {
        id: "ic-1",
        type: "INTERNAL_CREDIT",
        amount: 50000,
        reference: "",
        internalCreditPlan: {
          mode: "CREDIT_LUMP",
          creditAmount: 50000,
          scheduledLines: [],
        },
      },
    ];
    const payload = buildCreateSaleClientPayload({ ...baseInput, payments });
    expect(payload.metadata?.numberOfInstallments).toBeUndefined();
  });
});

describe("buildCreateSaleClientPayload fiscal snapshot", () => {
  it("incluye lineRequiresDte y selectedSaleDocumentKind en metadata", () => {
    const payload = buildCreateSaleClientPayload({
      ...baseInput,
      cartLines: [cartLine("v-dte", true), cartLine("v-lucky", false)],
      payments: [{ id: "c1", type: "CASH", amount: 5000, reference: "" }],
      selectedSaleDocumentKind: "BOLETA",
      saleDocumentKind: "BOLETA",
    });
    expect(payload.metadata?.lineRequiresDte).toEqual({
      "v-dte": true,
      "v-lucky": false,
    });
    expect(payload.metadata?.selectedSaleDocumentKind).toBe("BOLETA");
  });

  it("rechaza carrito con listas de precios mezcladas", () => {
    expect(() =>
      buildCreateSaleClientPayload({
        ...baseInput,
        cartLines: [
          { ...cartLine("v1", true), priceListId: "a", priceListName: "A" },
          { ...cartLine("v2", true), priceListId: "b", priceListName: "B" },
        ],
        payments: [{ id: "c1", type: "CASH", amount: 5000, reference: "" }],
      }),
    ).toThrow(/mezclar listas/);
  });
});
