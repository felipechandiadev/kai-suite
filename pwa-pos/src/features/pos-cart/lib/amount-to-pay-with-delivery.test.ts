import { describe, expect, it } from "vitest";
import { amountToPayWithPosDelivery } from "./amount-to-pay-with-delivery";
import type { PosDeliveryConfig } from "@/features/pos-delivery/types/pos-delivery.types";

const sampleDelivery = (fee: number): PosDeliveryConfig => ({
  deliveryZoneId: "z1",
  deliveryOccurrenceId: "o1",
  address: "Calle 1",
  communeCode: "07101",
  latitude: -35.4,
  longitude: -71.6,
  shippingFee: fee,
  zoneName: "Norte",
});

describe("amountToPayWithPosDelivery", () => {
  it("returns saleTotal when no delivery", () => {
    expect(amountToPayWithPosDelivery(1500, null)).toBe(1500);
    expect(amountToPayWithPosDelivery(1500, undefined)).toBe(1500);
  });

  it("adds shippingFee to saleTotal", () => {
    expect(amountToPayWithPosDelivery(1500, sampleDelivery(500))).toBe(2000);
  });

  it("rounds and floors negatives to zero contributions", () => {
    expect(amountToPayWithPosDelivery(-10, sampleDelivery(200))).toBe(200);
    expect(amountToPayWithPosDelivery(100, sampleDelivery(-5))).toBe(100);
  });
});
