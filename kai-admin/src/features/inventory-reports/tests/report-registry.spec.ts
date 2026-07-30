import {
  INVENTORY_REPORT_REGISTRY,
  getReportEntry,
} from "../report-registry";
import {
  emptyReportFormState,
  formStateToParams,
  validateFormForEntry,
} from "../lib/report-form";

describe("inventory report registry", () => {
  it("includes MVP reports with category and movement trend", () => {
    expect(INVENTORY_REPORT_REGISTRY.length).toBeGreaterThanOrEqual(7);
    for (const entry of INVENTORY_REPORT_REGISTRY) {
      expect(entry.id).toBeTruthy();
      expect(entry.wave).toBe("mvp");
      expect(entry.params.length).toBeGreaterThan(0);
    }
    expect(getReportEntry("inventory-transfers")?.params.some((p) => p.kind === "dateRange")).toBe(
      true,
    );
    expect(
      getReportEntry("stock-by-category")?.params.some(
        (p) => p.kind === "stockUnitMulti" && p.required,
      ),
    ).toBe(true);
    expect(
      getReportEntry("stock-movement-trend")?.params.some(
        (p) => p.kind === "stockUnitMulti" && p.required,
      ),
    ).toBe(true);
  });

  it("validates required date range for transfers", () => {
    const entry = getReportEntry("inventory-transfers")!;
    const form = emptyReportFormState();
    form.dateFrom = "";
    form.dateTo = "";
    expect(validateFormForEntry(entry, form)).toMatch(/fecha/i);
    form.dateFrom = "2026-01-01";
    form.dateTo = "2026-01-31";
    expect(validateFormForEntry(entry, form)).toBeNull();
  });

  it("requires stock unit for stock-by-category", () => {
    const entry = getReportEntry("stock-by-category")!;
    const form = emptyReportFormState();
    expect(validateFormForEntry(entry, form)).toMatch(/unidad/i);
    form.stockUnitIds = ["unit-1"];
    expect(validateFormForEntry(entry, form)).toBeNull();
  });

  it("maps form state to API params including stock units", () => {
    const entry = getReportEntry("stock-movement-trend")!;
    const form = emptyReportFormState();
    form.dateFrom = "2026-01-01";
    form.dateTo = "2026-01-31";
    form.storageIds = ["st-1"];
    form.productId = "p-1";
    form.stockUnitIds = ["u-kg", "u-un"];
    const params = formStateToParams(entry, form);
    expect(params).toMatchObject({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      storageIds: ["st-1"],
      productId: "p-1",
      stockUnitIds: ["u-kg", "u-un"],
    });
  });

  it("snapshot reports omit dateRange from params", () => {
    const entry = getReportEntry("stock-valuation")!;
    const form = emptyReportFormState();
    form.storageIds = ["st-1"];
    const params = formStateToParams(entry, form);
    expect(params.dateFrom).toBeUndefined();
    expect(params.storageIds).toEqual(["st-1"]);
  });
});
