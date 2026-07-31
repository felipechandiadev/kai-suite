import type { ReportRegistryEntry } from "../types/purchasing-report.types";
import {
  dateRangeForPreset,
  resolveGranularity,
  toIsoDate,
  type CompareWith,
  type DatePreset,
  type ReportGranularity,
} from "@/shared/reports";

export type ReportFormState = {
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  productId: string | null;
  productLabel: string | null;
  supplierId: string | null;
  supplierLabel: string | null;
  storageIds: string[];
  paymentMethod: string;
  branchId: string;
  granularity: ReportGranularity;
  compareWith: CompareWith;
};

export function emptyReportFormState(): ReportFormState {
  const month = dateRangeForPreset("month");
  return {
    datePreset: "month",
    dateFrom: month.dateFrom,
    dateTo: month.dateTo,
    productId: null,
    productLabel: null,
    supplierId: null,
    supplierLabel: null,
    storageIds: [],
    paymentMethod: "",
    branchId: "",
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
  if (kinds.has("product") && state.productId) params.productId = state.productId;
  if (kinds.has("supplier") && state.supplierId) params.supplierId = state.supplierId;
  if (kinds.has("storageMulti") && state.storageIds.length) {
    params.storageIds = state.storageIds;
  }
  if (kinds.has("paymentMethod") && state.paymentMethod) {
    params.paymentMethod = state.paymentMethod;
  }
  if (kinds.has("branch") && state.branchId) {
    params.branchId = state.branchId;
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
  // purchases-period-compare defaults to previousPeriod if none selected
  if (
    entry.id === "purchases-period-compare" &&
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
      if (state.dateFrom > state.dateTo) return "La fecha desde no puede ser posterior a hasta.";
    }
    if (field.kind === "product" && field.required && !state.productId) {
      return "Seleccioná un producto.";
    }
    if (field.kind === "supplier" && field.required && !state.supplierId) {
      return "Seleccioná un proveedor.";
    }
  }
  return null;
}

export { toIsoDate };
