import { describe, expect, it } from "vitest";
import {
  emptyIdleSnapshot,
  validateCustomerDisplaySnapshot,
} from "./display-snapshot";
import {
  buildCartSnapshotMessage,
  buildDisplayWebSocketUrl,
  buildHelloMessage,
  DISPLAY_PROTOCOL_VERSION,
  isSupportedDisplayProtocolVersion,
} from "./protocol";

describe("display-snapshot", () => {
  it("emptyIdleSnapshot returns idle state", () => {
    const s = emptyIdleSnapshot({ pointOfSaleId: "pos-1", storeName: "Tienda" });
    expect(s.state).toBe("idle");
    expect(s.pointOfSaleId).toBe("pos-1");
    expect(s.storeName).toBe("Tienda");
    expect(s.lines).toEqual([]);
    expect(s.total).toBe(0);
  });

  it("validateCustomerDisplaySnapshot accepts valid payload", () => {
    const raw = {
      state: "active_sale",
      pointOfSaleId: "pos-1",
      currency: "CLP",
      lines: [
        {
          lineId: "v1",
          name: "Producto",
          quantity: 2,
          unitPrice: 1000,
          lineTotal: 2000,
        },
      ],
      total: 2000,
      itemCount: 2,
      updatedAt: "2026-06-02T12:00:00.000Z",
    };
    expect(validateCustomerDisplaySnapshot(raw)?.total).toBe(2000);
  });

  it("validateCustomerDisplaySnapshot accepts payment payload", () => {
    const raw = {
      state: "payment",
      pointOfSaleId: "pos-1",
      currency: "CLP",
      lines: [],
      total: 5000,
      itemCount: 2,
      updatedAt: "2026-06-02T12:00:00.000Z",
      customer: { name: "María" },
      payments: [{ label: "Efectivo", amount: 3000 }],
      payment: {
        amountDueLabel: "Total a pagar",
        amountToPay: 5000,
        appliedTotal: 3000,
        remaining: 2000,
        overpay: 0,
        statusLabel: "Monto insuficiente",
      },
    };
    const parsed = validateCustomerDisplaySnapshot(raw);
    expect(parsed?.state).toBe("payment");
    expect(parsed?.customer?.name).toBe("María");
    expect(parsed?.payments).toHaveLength(1);
    expect(parsed?.payment?.remaining).toBe(2000);
  });

  it("validateCustomerDisplaySnapshot rejects invalid currency", () => {
    expect(
      validateCustomerDisplaySnapshot({
        state: "idle",
        pointOfSaleId: "x",
        currency: "USD",
        lines: [],
        total: 0,
        itemCount: 0,
        updatedAt: "x",
      }),
    ).toBeNull();
  });
});

describe("protocol", () => {
  it("buildDisplayWebSocketUrl uses wss when requested", () => {
    expect(buildDisplayWebSocketUrl("127.0.0.1", 14571, true)).toBe("wss://127.0.0.1:14571");
  });

  it("buildHelloMessage includes version and action", () => {
    const msg = buildHelloMessage({
      clientId: "c1",
      pointOfSaleId: "pos-1",
      requestId: "r1",
    });
    expect(msg.version).toBe(DISPLAY_PROTOCOL_VERSION);
    expect(msg.action).toBe("hello");
    expect(msg.request_id).toBe("r1");
  });

  it("buildCartSnapshotMessage wraps payload", () => {
    const snap = emptyIdleSnapshot({ pointOfSaleId: "pos-1" });
    const msg = buildCartSnapshotMessage(snap, "r2");
    expect(msg.action).toBe("cart_snapshot");
    expect((msg.payload as { state: string }).state).toBe("idle");
  });

  it("isSupportedDisplayProtocolVersion accepts 1.0 and 1.1", () => {
    expect(isSupportedDisplayProtocolVersion("1.0")).toBe(true);
    expect(isSupportedDisplayProtocolVersion("1.1")).toBe(true);
    expect(isSupportedDisplayProtocolVersion("2.0")).toBe(false);
  });
});
