import type { ReportRegistryEntry } from "../types/kaifood-report.types";
import {
  dateRangeForPreset,
  resolveGranularity,
  type CompareWith,
  type DatePreset,
  type ReportGranularity,
} from "@/shared/reports";

export type ReportFormState = {
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  branchId: string;
  diningRoomId: string;
  orderKind: string;
  granularity: ReportGranularity;
  compareWith: CompareWith;
};

export function emptyReportFormState(): ReportFormState {
  const month = dateRangeForPreset("month");
  return {
    datePreset: "month",
    dateFrom: month.dateFrom,
    dateTo: month.dateTo,
    branchId: "",
    diningRoomId: "",
    orderKind: "",
    granularity: "auto",
    compareWith: "none",
  };
}

export function formStateToParams(
  entry: ReportRegistryEntry,
  state: ReportFormState,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const kinds = new Set(entry.params.map((p) => p.kind));

  if (kinds.has("dateRange")) {
    params.dateFrom = state.dateFrom;
    params.dateTo = state.dateTo;
  }
  if (kinds.has("branch") && state.branchId) {
    params.branchId = state.branchId;
  }
  if (kinds.has("diningRoom") && state.diningRoomId) {
    params.diningRoomId = state.diningRoomId;
  }
  if (kinds.has("orderKind") && state.orderKind) {
    params.orderKind = state.orderKind;
  }
  if (kinds.has("granularity")) {
    params.granularity = resolveGranularity(
      state.granularity,
      state.dateFrom,
      state.dateTo,
    );
  }
  if (kinds.has("compareWith") && state.compareWith && state.compareWith !== "none") {
    params.compareWith = state.compareWith;
  }
  if (
    entry.id === "dining-period-compare" &&
    (!state.compareWith || state.compareWith === "none")
  ) {
    params.compareWith = "previousPeriod";
  }
  return params;
}

export function validateFormForEntry(
  entry: ReportRegistryEntry,
  state: ReportFormState,
): string | null {
  for (const field of entry.params) {
    if (field.kind === "dateRange" && field.required !== false) {
      if (!state.dateFrom || !state.dateTo) return "Indicá el rango de fechas.";
      if (state.dateFrom > state.dateTo) {
        return "La fecha desde no puede ser posterior a hasta.";
      }
    }
  }
  return null;
}
