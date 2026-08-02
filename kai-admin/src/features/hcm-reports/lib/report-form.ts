import type { ReportRegistryEntry } from "../types/hcm-report.types";
import {
  dateRangeForPreset,
  type DatePreset,
} from "@/shared/reports/report-dates";

export type ReportFormState = {
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  laborUnitId: string | null;
  employeeIds: string[];
};

export function emptyReportFormState(): ReportFormState {
  const month = dateRangeForPreset("month");
  return {
    datePreset: "month",
    dateFrom: month.dateFrom,
    dateTo: month.dateTo,
    laborUnitId: null,
    employeeIds: [],
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
  if (kinds.has("laborUnit") && state.laborUnitId) {
    params.laborUnitId = state.laborUnitId;
  }
  if (kinds.has("employeeMulti") && state.employeeIds.length) {
    params.employeeIds = state.employeeIds;
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
