import type { ReportRegistryEntry } from "../types/inventory-report.types";
import { dateRangeForPreset } from "./report-dates";

export type ReportFormState = {
  dateFrom: string;
  dateTo: string;
  productId: string | null;
  productLabel: string | null;
  storageIds: string[];
  stockUnitIds: string[];
  categoryIds: string[];
};

export function emptyReportFormState(): ReportFormState {
  const month = dateRangeForPreset("month");
  return {
    dateFrom: month.dateFrom,
    dateTo: month.dateTo,
    productId: null,
    productLabel: null,
    storageIds: [],
    stockUnitIds: [],
    categoryIds: [],
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
