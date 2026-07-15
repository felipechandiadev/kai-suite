import { describe, expect, it } from "vitest";
import { buildCreateSaleClientPayload } from "./build-create-sale-payload";

describe("buildCreateSaleClientPayload — posDelivery", () => {
  const base = {
    pointOfSaleId: "pos-1",
    cashSessionId: "cs-1",
    cartLines: [
      {
        variantId: "v1",
        productName: "Producto",
        quantity: 1,
        unitPrice: 1000,
        unitPriceWithTax: 1190,
        unitTaxRate: 19,
      },
    ] as never[],
    payments: [
      {
        id: "p1",
        type: "CASH",
        amount: 2690,
      },
    ] as never[],
    customer: {
      customerId: "c1",
      name: "Cliente",
      document: "1-9",
      phone: "912345678",
      email: null,
    },
    appliedPromotions: [],
    appliedTotal: 2690,
    overpay: 0,
  };

  it("embeds metadata.posDelivery when provided", () => {
    const payload = buildCreateSaleClientPayload({
      ...base,
      posDelivery: {
        deliveryZoneId: "zone-1",
        deliveryOccurrenceId: "occ-1",
        address: "Calle 10",
        communeCode: "07101",
        communeName: "Talca",
        region: "Maule",
        latitude: -35.4,
        longitude: -71.6,
        shippingFee: 1500,
        zoneName: "Norte",
        notes: "Dejar en portería",
      },
    });
    expect(payload.metadata?.posDelivery).toEqual({
      deliveryZoneId: "zone-1",
      deliveryOccurrenceId: "occ-1",
      address: "Calle 10",
      communeCode: "07101",
      communeName: "Talca",
      region: "Maule",
      latitude: -35.4,
      longitude: -71.6,
      shippingFee: 1500,
      zoneName: "Norte",
      notes: "Dejar en portería",
    });
  });

  it("omits posDelivery on deferred payment", () => {
    const payload = buildCreateSaleClientPayload({
      ...base,
      deferPayment: true,
      appliedTotal: 0,
      payments: [],
      posDelivery: {
        deliveryZoneId: "zone-1",
        deliveryOccurrenceId: "occ-1",
        address: "Calle 10",
        communeCode: "07101",
        latitude: -35.4,
        longitude: -71.6,
        shippingFee: 1500,
        zoneName: "Norte",
      },
    });
    expect(payload.metadata?.posDelivery).toBeUndefined();
  });
});
