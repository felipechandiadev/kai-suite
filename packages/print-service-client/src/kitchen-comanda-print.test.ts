import { describe, expect, it } from "vitest";
import {
  collectKitchenComandaPrintJobs,
  kitchenUnitShouldPrint,
  replicaIncludesUnit,
  type KitchenFireLineForPrint,
} from "./kitchen-comanda-print";

function line(
  partial: Partial<KitchenFireLineForPrint> & Pick<KitchenFireLineForPrint, "id">,
): KitchenFireLineForPrint {
  return {
    productVariantId: "v1",
    quantity: 1,
    kitchenStatus: "SENT",
    productionUnitId: "up-cocina",
    kitchenFireNumber: 3,
    kitchenFireId: "fire-3",
    ...partial,
  };
}

describe("kitchen-comanda-print helpers", () => {
  it("kitchenUnitShouldPrint only for PRINTED and BOTH", () => {
    expect(kitchenUnitShouldPrint("KDS")).toBe(false);
    expect(kitchenUnitShouldPrint("PRINTED")).toBe(true);
    expect(kitchenUnitShouldPrint("BOTH")).toBe(true);
  });

  it("replicaIncludesUnit treats empty selection as all", () => {
    expect(
      replicaIncludesUnit({ enabled: true, productionUnitIds: [] }, "up-a"),
    ).toBe(true);
    expect(
      replicaIncludesUnit({ enabled: true, productionUnitIds: ["up-b"] }, "up-a"),
    ).toBe(false);
    expect(
      replicaIncludesUnit({ enabled: false, productionUnitIds: [] }, "up-a"),
    ).toBe(false);
  });

  it("collectKitchenComandaPrintJobs groups by UP and fire", () => {
    const jobs = collectKitchenComandaPrintJobs(
      [
        line({ id: "a", quantity: 2 }),
        line({ id: "b", quantity: 1, notes: "sin mayo" }),
        line({
          id: "c",
          productionUnitId: "up-bar",
          kitchenFireNumber: 3,
          kitchenFireId: "fire-3b",
        }),
        line({ id: "draft", kitchenStatus: "DRAFT" }),
      ],
      ["a", "b", "c"],
      (l) => (l.id === "c" ? "Café" : "Completo"),
    );
    expect(jobs).toHaveLength(2);
    const cocina = jobs.find((j) => j.productionUnitId === "up-cocina");
    expect(cocina?.fireNumber).toBe(3);
    expect(cocina?.lines).toEqual([
      { name: "Completo", quantity: 2, notes: null },
      { name: "Completo", quantity: 1, notes: "sin mayo" },
    ]);
  });
});
