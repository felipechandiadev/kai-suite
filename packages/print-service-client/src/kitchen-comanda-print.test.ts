import { describe, expect, it } from "vitest";
import {
  collectKitchenComandaPrintJobs,
  kitchenUnitPrintBindingConfigured,
  kitchenUnitRequiresPrintBinding,
  kitchenUnitShouldPrint,
  migrateKitchenBindingsFromServer,
  replicaIncludesUnit,
  resolveKitchenUnitPrintBinding,
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
      replicaIncludesUnit({ enabled: true, productionUnitIds: [] }, "up-a", "PRINTED"),
    ).toBe(true);
    expect(
      replicaIncludesUnit({ enabled: true, productionUnitIds: ["up-b"] }, "up-a", "PRINTED"),
    ).toBe(false);
    expect(
      replicaIncludesUnit({ enabled: false, productionUnitIds: [] }, "up-a", "PRINTED"),
    ).toBe(false);
  });

  it("replicaIncludesUnit skips KDS-only units", () => {
    expect(
      replicaIncludesUnit({ enabled: true, productionUnitIds: [] }, "up-a", "KDS"),
    ).toBe(false);
  });

  it("kitchenUnitRequiresPrintBinding matches PRINTED and BOTH", () => {
    expect(kitchenUnitRequiresPrintBinding("KDS")).toBe(false);
    expect(kitchenUnitRequiresPrintBinding("PRINTED")).toBe(true);
    expect(kitchenUnitRequiresPrintBinding("BOTH")).toBe(true);
  });

  it("resolveKitchenUnitPrintBinding reads per-UP map", () => {
    const bindings = {
      "up-a": { printAgentId: "agent-1", printerDisplayLabel: "Cocina" },
    };
    expect(resolveKitchenUnitPrintBinding(bindings, "up-a")?.printerDisplayLabel).toBe(
      "Cocina",
    );
    expect(resolveKitchenUnitPrintBinding(bindings, "up-missing")).toBeNull();
  });

  it("kitchenUnitPrintBindingConfigured requires agent or alias", () => {
    expect(kitchenUnitPrintBindingConfigured(null)).toBe(false);
    expect(
      kitchenUnitPrintBindingConfigured({ printerDisplayLabel: "Barra" }),
    ).toBe(true);
    expect(
      kitchenUnitPrintBindingConfigured({ printAgentId: "x" }),
    ).toBe(true);
  });

  it("migrateKitchenBindingsFromServer copies legacy server settings once", () => {
    const storage = new Map<string, string>();
    const ls = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storage.set(k, v);
      },
      removeItem: (k: string) => {
        storage.delete(k);
      },
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: ls,
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: globalThis,
      configurable: true,
    });

    const units = [
      {
        id: "up-1",
        name: "Cocina",
        kitchenFulfillmentMode: "PRINTED" as const,
        kitchenPrintSettings: {
          printAgentId: "legacy-agent",
          printerDisplayLabel: "Cocina",
        },
      },
      {
        id: "up-2",
        name: "Bar",
        kitchenFulfillmentMode: "KDS" as const,
        kitchenPrintSettings: {
          printAgentId: "ignored",
          printerDisplayLabel: "X",
        },
      },
    ];

    const migrated = migrateKitchenBindingsFromServer("pos", units);
    expect(migrated["up-1"]).toEqual({
      printAgentId: "legacy-agent",
      printerDisplayLabel: "Cocina",
    });
    expect(migrated["up-2"]).toBeUndefined();

    // @ts-expect-error cleanup
    delete globalThis.window;
    // @ts-expect-error cleanup
    delete globalThis.localStorage;
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
