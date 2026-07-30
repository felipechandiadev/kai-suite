"use server";

import { PurchasingReportsRequest } from "../infrastructure/purchasing-reports.request";
import type {
  PurchasingReportCatalogItem,
  PurchasingReportRunResult,
} from "../types/purchasing-report.types";

export async function listPurchasingReportsCatalogAction(): Promise<{
  success: boolean;
  data?: PurchasingReportCatalogItem[];
  error?: string;
}> {
  try {
    const data = await PurchasingReportsRequest.listCatalog();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al listar reportes",
    };
  }
}

export async function runPurchasingReportAction(
  reportId: string,
  params: Record<string, unknown>,
): Promise<{
  success: boolean;
  data?: PurchasingReportRunResult;
  error?: string;
}> {
  try {
    const data = await PurchasingReportsRequest.run(reportId, params);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al generar el reporte",
    };
  }
}
