import { describe, expect, it } from "vitest";
import { mergeDiningSessionLines } from "./merge-dining-session-lines";
import type { PosDiningOrderLine } from "@/features/dining/types/dining-pos.types";

describe("mergeDiningSessionLines", () => {
  const existing: PosDiningOrderLine[] = [
    {
      id: "a",
      productVariantId: "v1",
      quantity: 1,
      notes: "sin cebolla",
      kitchenStatus: "SENT",
      kitchenFireId: "f1",
      kitchenFireNumber: 3,
    },
    {
      id: "b",
      productVariantId: "v2",
      quantity: 2,
      kitchenStatus: "DRAFT",
    },
  ];

  it("updates kitchenStatus and fire on matching ids", () => {
    const next = mergeDiningSessionLines(existing, [
      {
        id: "a",
        productVariantId: "v1",
        quantity: 1,
        notes: "sin cebolla",
        kitchenStatus: "READY",
        kitchenFireId: "f1",
        kitchenFireNumber: 3,
      },
      {
        id: "b",
        productVariantId: "v2",
        quantity: 2,
        kitchenStatus: "DRAFT",
      },
    ]);
    expect(next.find((l) => l.id === "a")?.kitchenStatus).toBe("READY");
    expect(next.find((l) => l.id === "a")?.notes).toBe("sin cebolla");
    expect(next.find((l) => l.id === "b")?.kitchenStatus).toBe("DRAFT");
  });

  it("drops lines missing from payload", () => {
    const next = mergeDiningSessionLines(existing, [
      {
        id: "a",
        productVariantId: "v1",
        quantity: 1,
        kitchenStatus: "READY",
      },
    ]);
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe("a");
  });

  it("adds new lines from payload", () => {
    const next = mergeDiningSessionLines(existing, [
      ...existing.map((l) => ({
        id: l.id,
        productVariantId: l.productVariantId,
        quantity: l.quantity,
        notes: l.notes,
        kitchenStatus: l.kitchenStatus,
        kitchenFireId: l.kitchenFireId,
        kitchenFireNumber: l.kitchenFireNumber,
      })),
      {
        id: "c",
        productVariantId: "v3",
        quantity: 1,
        kitchenStatus: "SENT" as const,
        kitchenFireNumber: 4,
      },
    ]);
    expect(next).toHaveLength(3);
    expect(next.find((l) => l.id === "c")?.kitchenFireNumber).toBe(4);
  });
});
