import { describe, expect, it } from "vitest";
import { parsePosDeliveryConfig } from "../types/pos-delivery.types";

describe("parsePosDeliveryConfig", () => {
  it("returns null for incomplete payloads", () => {
    expect(parsePosDeliveryConfig(null)).toBeNull();
    expect(parsePosDeliveryConfig({ deliveryZoneId: "z1" })).toBeNull();
  });

  it("parses a valid config", () => {
    const parsed = parsePosDeliveryConfig({
      deliveryZoneId: "z1",
      deliveryOccurrenceId: "o1",
      address: " Av. Uno 23 ",
      communeCode: "07101",
      latitude: -35.4,
      longitude: -71.6,
      shippingFee: 1990.4,
      zoneName: " Centro ",
      notes: " timbre ",
    });
    expect(parsed).toEqual({
      deliveryZoneId: "z1",
      deliveryOccurrenceId: "o1",
      address: "Av. Uno 23",
      communeCode: "07101",
      communeName: null,
      region: null,
      latitude: -35.4,
      longitude: -71.6,
      shippingFee: 1990,
      zoneName: "Centro",
      occurrenceLabel: null,
      notes: "timbre",
    });
  });
});
