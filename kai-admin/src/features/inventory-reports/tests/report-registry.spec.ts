import {
  INVENTORY_REPORT_REGISTRY,
  getReportEntry,
} from "../report-registry";
import {
  INVENTORY_REPORT_CATEGORY_LABEL,
  INVENTORY_REPORT_CATEGORY_ORDER,
} from "../types/inventory-report.types";
import {
  emptyReportFormState,
  formStateToParams,
  validateFormForEntry,
} from "../lib/report-form";

describe("inventory report registry", () => {
  it("includes every report with category and params", () => {
    expect(INVENTORY_REPORT_REGISTRY.length).toBeGreaterThanOrEqual(8);
    for (const entry of INVENTORY_REPORT_REGISTRY) {
      expect(entry.id).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(INVENTORY_REPORT_CATEGORY_ORDER).toContain(entry.category);
      expect(INVENTORY_REPORT_CATEGORY_LABEL[entry.category]).toBeTruthy();
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

  it("maps categories per report family", () => {
    expect(getReportEntry("stock-valuation")?.category).toBe("valuacion");
    expect(getReportEntry("stock-alerts")?.category).toBe("alertas");
    expect(getReportEntry("stock-by-storage")?.category).toBe("stock");
    expect(getReportEntry("stock-by-category")?.category).toBe("stock");
    expect(getReportEntry("stock-movement-trend")?.category).toBe("movimientos");
    expect(getReportEntry("inventory-transfers")?.category).toBe("movimientos");
    expect(getReportEntry("inventory-adjustments")?.category).toBe("movimientos");
    expect(getReportEntry("inventory-period-compare")?.category).toBe("comparativos");
  });

  it("offers granularity and compare only on date-range reports", () => {
    for (const id of [
      "stock-movement-trend",
      "inventory-transfers",
      "inventory-adjustments",
      "inventory-period-compare",
    ]) {
      const entry = getReportEntry(id)!;
      expect(entry.params.some((p) => p.kind === "granularity")).toBe(true);
      expect(entry.params.some((p) => p.kind === "compareWith")).toBe(true);
    }
    for (const id of ["stock-valuation", "stock-alerts"]) {
      const entry = getReportEntry(id)!;
      expect(entry.params.some((p) => p.kind === "dateRange")).toBe(false);
      expect(entry.params.some((p) => p.kind === "granularity")).toBe(false);
      expect(entry.params.some((p) => p.kind === "compareWith")).toBe(false);
    }
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

  it("maps form state to API params including stock units and granularity", () => {
    const entry = getReportEntry("stock-movement-trend")!;
    const form = emptyReportFormState();
    form.dateFrom = "2026-01-01";
    form.dateTo = "2026-01-31";
    form.storageIds = ["st-1"];
    form.productId = "p-1";
    form.stockUnitIds = ["u-kg", "u-un"];
    form.granularity = "week";
    form.compareWith = "previousPeriod";
    const params = formStateToParams(entry, form);
    expect(params).toMatchObject({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      storageIds: ["st-1"],
      productId: "p-1",
      stockUnitIds: ["u-kg", "u-un"],
      granularity: "week",
      compareWith: "previousPeriod",
    });
  });

  it("resolves auto granularity from range length", () => {
    const entry = getReportEntry("inventory-adjustments")!;
    const form = emptyReportFormState();
    form.dateFrom = "2026-01-01";
    form.dateTo = "2026-12-31";
    form.granularity = "auto";
    expect(formStateToParams(entry, form).granularity).toBe("month");
    form.dateTo = "2026-01-20";
    expect(formStateToParams(entry, form).granularity).toBe("day");
  });

  it("defaults inventory-period-compare to previousPeriod", () => {
    const entry = getReportEntry("inventory-period-compare")!;
    const form = emptyReportFormState();
    form.stockUnitIds = ["u-un"];
    expect(form.compareWith).toBe("none");
    expect(formStateToParams(entry, form).compareWith).toBe("previousPeriod");
    expect(validateFormForEntry(entry, form)).toBeNull();
    form.stockUnitIds = [];
    expect(validateFormForEntry(entry, form)).toMatch(/unidad/i);
  });

  it("snapshot reports omit dateRange from params", () => {
    const entry = getReportEntry("stock-valuation")!;
    const form = emptyReportFormState();
    form.storageIds = ["st-1"];
    const params = formStateToParams(entry, form);
    expect(params.dateFrom).toBeUndefined();
    expect(params.granularity).toBeUndefined();
    expect(params.storageIds).toEqual(["st-1"]);
  });
});
