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
  it("includes 5 MVP reports", () => {
    expect(INVENTORY_REPORT_REGISTRY).toHaveLength(5);
    for (const entry of INVENTORY_REPORT_REGISTRY) {
      expect(entry.id).toBeTruthy();
      expect(entry.wave).toBe("mvp");
      expect(entry.params.length).toBeGreaterThan(0);
    }
    expect(getReportEntry("inventory-transfers")?.params.some((p) => p.kind === "dateRange")).toBe(
      true,
    );
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

  it("maps form state to API params", () => {
    const entry = getReportEntry("inventory-adjustments")!;
    const form = emptyReportFormState();
    form.dateFrom = "2026-01-01";
    form.dateTo = "2026-01-31";
    form.storageIds = ["st-1"];
    form.productId = "p-1";
    const params = formStateToParams(entry, form);
    expect(params).toMatchObject({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      storageIds: ["st-1"],
      productId: "p-1",
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
