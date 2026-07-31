import type { ReportRegistryEntry } from "../types/sales-report.types";
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
  customerId: string | null;
  customerLabel: string | null;
  pointOfSaleIds: string[];
  /** POS A / B para comparativo entre dos puntos de venta. */
  posAId: string;
  posBId: string;
  paymentMethod: string;
  cashSessionId: string;
  topN: string;
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
    customerId: null,
    customerLabel: null,
    pointOfSaleIds: [],
    posAId: "",
    posBId: "",
    paymentMethod: "",
    cashSessionId: "",
    topN: "20",
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
  if (kinds.has("customer") && state.customerId) params.customerId = state.customerId;
  if (kinds.has("posMulti") && state.pointOfSaleIds.length) {
    params.pointOfSaleIds = state.pointOfSaleIds;
  }
  if (kinds.has("posPair")) {
    if (state.posAId) params.posAId = state.posAId;
    if (state.posBId) params.posBId = state.posBId;
  }
  if (kinds.has("paymentMethod") && state.paymentMethod) {
    params.paymentMethod = state.paymentMethod;
  }
  if (kinds.has("cashSession") && state.cashSessionId) {
    params.cashSessionId = state.cashSessionId;
  }
  if (kinds.has("topN")) {
    params.topN = Number(state.topN) || 20;
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
  // sales-period-compare defaults to previousPeriod if none selected
  if (entry.id === "sales-period-compare" && (!state.compareWith || state.compareWith === "none")) {
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
    if (field.kind === "customer" && field.required && !state.customerId) {
      return "Seleccioná un cliente.";
    }
    if (field.kind === "posPair") {
      if (!state.posAId || !state.posBId) {
        return "Seleccioná dos puntos de venta para comparar.";
      }
      if (state.posAId === state.posBId) {
        return "Los dos puntos de venta deben ser distintos.";
      }
    }
  }
  if (entry.id === "cash-session-close") {
    if (!state.cashSessionId && (!state.dateFrom || !state.dateTo)) {
      return "Indicá una sesión de caja o un rango de fechas.";
    }
  }
  return null;
}

export { toIsoDate };
