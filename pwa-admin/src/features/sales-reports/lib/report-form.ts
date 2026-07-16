import type { ReportRegistryEntry } from "../types/sales-report.types";
import {
  dateRangeForPreset,
  toIsoDate,
} from "./report-dates";

export type ReportFormState = {
  dateFrom: string;
  dateTo: string;
  productId: string | null;
  productLabel: string | null;
  customerId: string | null;
  customerLabel: string | null;
  pointOfSaleIds: string[];
  paymentMethod: string;
  cashSessionId: string;
  topN: string;
};

export function emptyReportFormState(): ReportFormState {
  const month = dateRangeForPreset("month");
  return {
    dateFrom: month.dateFrom,
    dateTo: month.dateTo,
    productId: null,
    productLabel: null,
    customerId: null,
    customerLabel: null,
    pointOfSaleIds: [],
    paymentMethod: "",
    cashSessionId: "",
    topN: "20",
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
  if (kinds.has("paymentMethod") && state.paymentMethod) {
    params.paymentMethod = state.paymentMethod;
  }
  if (kinds.has("cashSession") && state.cashSessionId) {
    params.cashSessionId = state.cashSessionId;
  }
  if (kinds.has("topN")) {
    params.topN = Number(state.topN) || 20;
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
  }
  if (entry.id === "cash-session-close") {
    if (!state.cashSessionId && (!state.dateFrom || !state.dateTo)) {
      return "Indicá una sesión de caja o un rango de fechas.";
    }
  }
  return null;
}

export { toIsoDate };
