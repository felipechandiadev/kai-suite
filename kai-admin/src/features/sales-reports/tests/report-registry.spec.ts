import { SALES_REPORT_REGISTRY, getReportEntry } from "../report-registry";
import {
  emptyReportFormState,
  formStateToParams,
  validateFormForEntry,
} from "../lib/report-form";

describe("sales report registry", () => {
  it("includes MVP and P1 reports with at least one param", () => {
    expect(SALES_REPORT_REGISTRY.length).toBeGreaterThanOrEqual(14);
    for (const entry of SALES_REPORT_REGISTRY) {
      expect(entry.id).toBeTruthy();
      expect(entry.params.length).toBeGreaterThan(0);
    }
    expect(getReportEntry("sales-by-product")?.params.some((p) => p.kind === "product")).toBe(
      true,
    );
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

  it("maps form state to API params", () => {
    const entry = getReportEntry("sales-detail")!;
    const form = emptyReportFormState();
    form.dateFrom = "2026-01-01";
    form.dateTo = "2026-01-31";
    form.paymentMethod = "CASH";
    form.pointOfSaleIds = ["pos-1"];
    const params = formStateToParams(entry, form);
    expect(params).toMatchObject({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      paymentMethod: "CASH",
      pointOfSaleIds: ["pos-1"],
    });
  });
});
