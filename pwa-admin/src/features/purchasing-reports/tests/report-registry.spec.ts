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
  it("includes 6 MVP reports with params", () => {
    expect(PURCHASING_REPORT_REGISTRY).toHaveLength(6);
    for (const entry of PURCHASING_REPORT_REGISTRY) {
      expect(entry.id).toBeTruthy();
      expect(entry.wave).toBe("mvp");
      expect(entry.params.length).toBeGreaterThan(0);
    }
    expect(
      getReportEntry("purchases-by-product")?.params.some((p) => p.kind === "product"),
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
    const params = formStateToParams(entry, form);
    expect(params).toMatchObject({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      paymentMethod: "TRANSFER",
      storageIds: ["st-1"],
      supplierId: "sup-1",
    });
  });
});
