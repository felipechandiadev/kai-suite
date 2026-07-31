import {
  PURCHASING_REPORT_REGISTRY,
  getReportEntry,
} from "../report-registry";
import {
  emptyReportFormState,
  formStateToParams,
  validateFormForEntry,
} from "../lib/report-form";

describe("purchasing report registry", () => {
  it("includes categorized reports with at least one param", () => {
    expect(PURCHASING_REPORT_REGISTRY.length).toBeGreaterThanOrEqual(7);
    for (const entry of PURCHASING_REPORT_REGISTRY) {
      expect(entry.id).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.params.length).toBeGreaterThan(0);
    }
    expect(
      getReportEntry("purchases-by-product")?.params.some((p) => p.kind === "product"),
    ).toBe(true);
    expect(getReportEntry("purchases-by-period")?.category).toBe("resumen");
    expect(getReportEntry("purchases-by-supplier")?.category).toBe("proveedores");
    expect(getReportEntry("purchases-by-payment-method")?.category).toBe("pagos");
    expect(getReportEntry("purchases-period-compare")?.category).toBe("comparativos");
    expect(
      getReportEntry("purchases-period-compare")?.params.some(
        (p) => p.kind === "compareWith",
      ),
    ).toBe(true);
  });

  it("validates required product and supplier", () => {
    const productEntry = getReportEntry("purchases-by-product")!;
    const form = emptyReportFormState();
    expect(validateFormForEntry(productEntry, form)).toMatch(/producto/i);
    form.productId = "p1";
    expect(validateFormForEntry(productEntry, form)).toBeNull();

    const supplierEntry = getReportEntry("purchases-by-supplier")!;
    const form2 = emptyReportFormState();
    expect(validateFormForEntry(supplierEntry, form2)).toMatch(/proveedor/i);
    form2.supplierId = "s1";
    expect(validateFormForEntry(supplierEntry, form2)).toBeNull();
  });

  it("maps form state to API params", () => {
    const entry = getReportEntry("purchase-detail")!;
    const form = emptyReportFormState();
    form.dateFrom = "2026-01-01";
    form.dateTo = "2026-01-31";
    form.paymentMethod = "TRANSFER";
    form.storageIds = ["st-1"];
    form.supplierId = "sup-1";
    form.granularity = "week";
    const params = formStateToParams(entry, form);
    expect(params).toMatchObject({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      paymentMethod: "TRANSFER",
      storageIds: ["st-1"],
      supplierId: "sup-1",
      granularity: "week",
    });
  });

  it("maps granularity and compare for the period compare report", () => {
    const entry = getReportEntry("purchases-period-compare")!;
    const form = emptyReportFormState();
    form.dateFrom = "2026-01-01";
    form.dateTo = "2026-01-31";
    expect(formStateToParams(entry, form)).toMatchObject({
      granularity: "day",
      compareWith: "previousPeriod",
    });

    form.compareWith = "samePeriodLastYear";
    form.granularity = "month";
    expect(formStateToParams(entry, form)).toMatchObject({
      granularity: "month",
      compareWith: "samePeriodLastYear",
    });
  });
});
