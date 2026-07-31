import { SALES_REPORT_REGISTRY, getReportEntry } from "../report-registry";
import {
  emptyReportFormState,
  formStateToParams,
  validateFormForEntry,
} from "../lib/report-form";

describe("sales report registry", () => {
  it("includes MVP and P1 reports with at least one param", () => {
    expect(SALES_REPORT_REGISTRY.length).toBeGreaterThanOrEqual(16);
    for (const entry of SALES_REPORT_REGISTRY) {
      expect(entry.id).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.params.length).toBeGreaterThan(0);
    }
    expect(getReportEntry("sales-by-product")?.params.some((p) => p.kind === "product")).toBe(
      true,
    );
    expect(getReportEntry("sales-period-compare")?.category).toBe("comparativos");
    expect(getReportEntry("pos-compare")?.params.some((p) => p.kind === "posPair")).toBe(true);
  });

  it("validates required product and customer", () => {
    const productEntry = getReportEntry("sales-by-product")!;
    const form = emptyReportFormState();
    expect(validateFormForEntry(productEntry, form)).toMatch(/producto/i);
    form.productId = "p1";
    expect(validateFormForEntry(productEntry, form)).toBeNull();

    const customerEntry = getReportEntry("customer-purchases")!;
    const form2 = emptyReportFormState();
    expect(validateFormForEntry(customerEntry, form2)).toMatch(/cliente/i);
  });

  it("validates pos pair for pos-compare", () => {
    const entry = getReportEntry("pos-compare")!;
    const form = emptyReportFormState();
    expect(validateFormForEntry(entry, form)).toMatch(/dos puntos/i);
    form.posAId = "pos-a";
    form.posBId = "pos-a";
    expect(validateFormForEntry(entry, form)).toMatch(/distintos/i);
    form.posBId = "pos-b";
    expect(validateFormForEntry(entry, form)).toBeNull();
  });

  it("maps form state to API params including branch and compare", () => {
    const entry = getReportEntry("sales-by-period")!;
    const form = emptyReportFormState();
    form.dateFrom = "2026-01-01";
    form.dateTo = "2026-01-31";
    form.branchId = "branch-1";
    form.granularity = "week";
    form.compareWith = "previousPeriod";
    form.pointOfSaleIds = ["pos-1"];
    const params = formStateToParams(entry, form);
    expect(params).toMatchObject({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      branchId: "branch-1",
      granularity: "week",
      compareWith: "previousPeriod",
      pointOfSaleIds: ["pos-1"],
    });
  });
});
