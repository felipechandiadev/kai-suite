import { describe, expect, it, beforeEach } from "vitest";
import {
  clearPosQuotaCollectDraft,
  readPosQuotaCollectDraft,
  writePosQuotaCollectDraft,
} from "./pos-quota-collect-storage";

function mockSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  Object.defineProperty(globalThis, "sessionStorage", {
    value: sessionStorage,
    configurable: true,
  });
}

describe("pos-quota-collect-storage", () => {
  beforeEach(() => {
    mockSessionStorage();
    clearPosQuotaCollectDraft();
  });

  it("round-trips a valid draft", () => {
    writePosQuotaCollectDraft({
      customerId: "cust-1",
      customerDisplayName: "Cliente Test",
      quotas: [
        {
          id: "inst-1",
          transactionId: "sale-1",
          documentNumber: "VTA-1",
          amount: 5000,
          dueDate: "2026-07-01",
        },
      ],
    });
    const draft = readPosQuotaCollectDraft();
    expect(draft?.customerId).toBe("cust-1");
    expect(draft?.quotas).toHaveLength(1);
    expect(draft?.quotas[0].amount).toBe(5000);
  });

  it("returns null when quotas have zero amount", () => {
    writePosQuotaCollectDraft({
      customerId: "cust-1",
      customerDisplayName: null,
      quotas: [{ id: "inst-1", transactionId: null, documentNumber: null, amount: 0, dueDate: null }],
    });
    expect(readPosQuotaCollectDraft()).toBeNull();
  });
});
