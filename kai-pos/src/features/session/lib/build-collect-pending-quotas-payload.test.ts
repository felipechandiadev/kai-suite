import { describe, expect, it } from "vitest";
import { buildCollectPendingQuotasClientPayload } from "./build-collect-pending-quotas-payload";

describe("buildCollectPendingQuotasClientPayload", () => {
  it("normalizes ids and builds payments", () => {
    const payload = buildCollectPendingQuotasClientPayload({
      pointOfSaleId: " pos-1 ",
      cashSessionId: "session-1",
      customerId: "cust-1",
      installmentIds: ["inst-1", "inst-1"],
      payments: [{ id: "p1", type: "CASH", amount: 10000, reference: "" }],
    });
    expect(payload.pointOfSaleId).toBe("pos-1");
    expect(payload.installmentIds).toEqual(["inst-1"]);
    expect(payload.payments[0].amount).toBe(10000);
  });
});
