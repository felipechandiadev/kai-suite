import type { ReportRegistryEntry } from "../types/inventory-report.types";
import {
  dateRangeForPreset,
  resolveGranularity,
  type CompareWith,
  type DatePreset,
  type ReportGranularity,
  toIsoDate,
} from "./report-dates";

export type ReportFormState = {
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  productId: string | null;
  productLabel: string | null;
  storageIds: string[];
  stockUnitIds: string[];
  categoryIds: string[];
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
    storageIds: [],
    stockUnitIds: [],
    categoryIds: [],
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
  if (kinds.has("storageMulti") && state.storageIds.length) {
    params.storageIds = state.storageIds;
  }
  if (kinds.has("stockUnitMulti") && state.stockUnitIds.length) {
    params.stockUnitIds = state.stockUnitIds;
  }
  if (kinds.has("categoryMulti") && state.categoryIds.length) {
    params.categoryIds = state.categoryIds;
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
  // inventory-period-compare siempre compara: default período anterior
  if (
    entry.id === "inventory-period-compare" &&
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
    if (
      field.kind === "stockUnitMulti" &&
      field.required &&
      state.stockUnitIds.length === 0
    ) {
      return "Seleccioná al menos una unidad de stock.";
    }
  }
  return null;
}

export { toIsoDate };
