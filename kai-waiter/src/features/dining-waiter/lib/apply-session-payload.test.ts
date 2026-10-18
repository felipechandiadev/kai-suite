import { describe, expect, it } from "vitest";
import {
  applySessionPayloads,
  mergeOrderFromPayload,
  parseSessionPayload,
  upsertOrder,
  type DiningSessionUpdatedPayload,
} from "./apply-session-payload";
import type { DiningOrderDto } from "../infrastructure/dining.request";

function order(partial: Partial<DiningOrderDto> & Pick<DiningOrderDto, "id">): DiningOrderDto {
  return {
    branchId: "b1",
    kind: "TABLE",
    displayLabel: "Mesa 1",
    status: "OPEN",
    openedAt: "2026-10-18T12:00:00.000Z",
    lines: [],
    ...partial,
  };
}

function payload(
  partial: Partial<DiningSessionUpdatedPayload> & Pick<DiningSessionUpdatedPayload, "orderId">,
): DiningSessionUpdatedPayload {
  return {
    branchId: "b1",
    kind: "TABLE",
    status: "OPEN",
    displayLabel: "Mesa 1",
    diningTableId: "t1",
    items: [],
    ...partial,
  };
}

describe("parseSessionPayload", () => {
  it("acepta un payload válido", () => {
    const raw = payload({
      orderId: "o1",
      items: [{ id: "l1", productVariantId: "v1", quantity: 1, kitchenStatus: "DRAFT" }],
    });
    expect(parseSessionPayload(raw)).toEqual(raw);
  });

  it("rechaza payloads incompletos", () => {
    expect(parseSessionPayload(null)).toBeNull();
    expect(parseSessionPayload({ orderId: "o1" })).toBeNull();
    expect(
      parseSessionPayload({ ...payload({ orderId: "o1" }), items: [{ id: "l1" }] }),
    ).toBeNull();
  });
});

describe("mergeOrderFromPayload", () => {
  it("actualiza líneas y conserva datos que el payload no trae", () => {
    const prev = order({
      id: "o1",
      diningTable: { code: "M1", label: "Mesa 1" },
      openedByUserId: "u1",
      lines: [
        {
          id: "l1",
          diningOrderId: "o1",
          productVariantId: "v1",
          quantity: 1,
          kitchenStatus: "DRAFT",
          productVariant: { name: "Lomo" },
        },
      ],
    });
    const merged = mergeOrderFromPayload(
      prev,
      payload({
        orderId: "o1",
        status: "SENT",
        items: [
          { id: "l1", productVariantId: "v1", quantity: 2, kitchenStatus: "SENT", kitchenFireNumber: 7 },
          { id: "l2", productVariantId: "v2", quantity: 1, kitchenStatus: "DRAFT" },
        ],
      }),
    );
    expect(merged.status).toBe("SENT");
    expect(merged.diningTable).toEqual({ code: "M1", label: "Mesa 1" });
    expect(merged.openedByUserId).toBe("u1");
    expect(merged.lines).toHaveLength(2);
    expect(merged.lines?.[0]).toMatchObject({
      quantity: 2,
      kitchenStatus: "SENT",
      kitchenFireNumber: 7,
      productVariant: { name: "Lomo" },
    });
    expect(merged.lines?.[1].id).toBe("l2");
  });
});

describe("upsertOrder / applySessionPayloads", () => {
  it("reemplaza, agrega al inicio y quita cuentas cerradas", () => {
    const list = [order({ id: "o1" }), order({ id: "o2" })];
    expect(upsertOrder(list, order({ id: "o2", status: "SENT" }))[1].status).toBe("SENT");
    expect(upsertOrder(list, order({ id: "o3" })).map((o) => o.id)).toEqual(["o3", "o1", "o2"]);
    expect(upsertOrder(list, order({ id: "o1", status: "CLOSED" })).map((o) => o.id)).toEqual([
      "o2",
    ]);
  });

  it("ignora eventos de otra sucursal", () => {
    const list = [order({ id: "o1" })];
    const next = applySessionPayloads(
      list,
      [payload({ orderId: "o9", branchId: "b2" }), payload({ orderId: "o1", status: "BILLING" })],
      "b1",
    );
    expect(next.map((o) => [o.id, o.status])).toEqual([["o1", "BILLING"]]);
  });
});
