import { describe, expect, it } from "vitest";
import { waiterInboxItemToRow } from "./inbox-mapper";
import type { WaiterInboxItem } from "../types/notification.types";

describe("waiterInboxItemToRow", () => {
  it("maps dining kitchen ready payload for deep-link", () => {
    const item: WaiterInboxItem = {
      deliveryId: "d1",
      status: "UNREAD",
      deliveredAt: "2026-07-30T12:00:00.000Z",
      readAt: null,
      notification: {
        id: "n1",
        domain: "SALES",
        kind: "dining.kitchen.order_ready",
        severity: "INFO",
        title: "Pedido listo #3: Mesa 5",
        body: "• 1× Lomo",
        payload: {
          orderId: "ord-1",
          diningTableId: "tbl-5",
          kitchenFireId: "fire-9",
          kitchenFireNumber: 3,
          items: [{ name: "Lomo", quantity: 1, notes: null }],
        },
        createdAt: "2026-07-30T12:00:00.000Z",
      },
    };
    const row = waiterInboxItemToRow(item);
    expect(row).toMatchObject({
      deliveryId: "d1",
      orderId: "ord-1",
      diningTableId: "tbl-5",
      kitchenFireId: "fire-9",
      kitchenFireNumber: 3,
    });
  });

  it("ignores non-dining kinds", () => {
    const item: WaiterInboxItem = {
      deliveryId: "d2",
      status: "UNREAD",
      deliveredAt: "2026-07-30T12:00:00.000Z",
      readAt: null,
      notification: {
        id: "n2",
        domain: "STOCK",
        kind: "stock.threshold",
        severity: "WARNING",
        title: "Stock bajo",
        body: null,
        payload: {},
        createdAt: "2026-07-30T12:00:00.000Z",
      },
    };
    expect(waiterInboxItemToRow(item)).toBeNull();
  });
});
