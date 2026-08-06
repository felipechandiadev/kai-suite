import { KAIFOOD_REPORT_REGISTRY, getReportEntry } from "../report-registry";
import {
  emptyReportFormState,
  formStateToParams,
  validateFormForEntry,
} from "../lib/report-form";

describe("kaifood report registry", () => {
  it("includes the four mvp reports", () => {
    expect(KAIFOOD_REPORT_REGISTRY).toHaveLength(4);
    for (const entry of KAIFOOD_REPORT_REGISTRY) {
      expect(entry.id).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.params.some((p) => p.kind === "dateRange")).toBe(true);
    }
    expect(getReportEntry("dining-salon-summary")?.category).toBe("resumen");
    expect(getReportEntry("dining-by-hour")?.category).toBe("operacion");
    expect(getReportEntry("dining-by-table")?.category).toBe("operacion");
    expect(getReportEntry("dining-period-compare")?.category).toBe(
      "comparativos",
    );
  });

  it("requires date range", () => {
    const entry = getReportEntry("dining-salon-summary")!;
    const form = emptyReportFormState();
    form.dateFrom = "";
    form.dateTo = "";
    expect(validateFormForEntry(entry, form)).toMatch(/fechas/i);
    form.dateFrom = "2026-01-01";
    form.dateTo = "2026-01-31";
    expect(validateFormForEntry(entry, form)).toBeNull();
  });

  it("maps form state to API params", () => {
    const entry = getReportEntry("dining-salon-summary")!;
    const form = emptyReportFormState();
    form.dateFrom = "2026-01-01";
    form.dateTo = "2026-01-31";
    form.branchId = "branch-1";
    form.diningRoomId = "room-1";
    form.orderKind = "TABLE";
    form.granularity = "day";
    form.compareWith = "previousPeriod";
    const params = formStateToParams(entry, form);
    expect(params).toMatchObject({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      branchId: "branch-1",
      diningRoomId: "room-1",
      orderKind: "TABLE",
      granularity: "day",
      compareWith: "previousPeriod",
    });
  });

  it("defaults compare for period-compare", () => {
    const entry = getReportEntry("dining-period-compare")!;
    const form = emptyReportFormState();
    form.dateFrom = "2026-02-01";
    form.dateTo = "2026-02-28";
    form.compareWith = "none";
    const params = formStateToParams(entry, form);
    expect(params.compareWith).toBe("previousPeriod");
  });
});
