"use server";

import { InventoryReportsRequest } from "../infrastructure/inventory-reports.request";
import type {
  InventoryReportCatalogItem,
  InventoryReportRunResult,
} from "../types/inventory-report.types";

export async function listInventoryReportsCatalogAction(): Promise<{
  success: boolean;
  data?: InventoryReportCatalogItem[];
  error?: string;
}> {
  try {
    const data = await InventoryReportsRequest.listCatalog();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al listar reportes",
    };
  }
}

export async function runInventoryReportAction(
  reportId: string,
  params: Record<string, unknown>,
): Promise<{
  success: boolean;
  data?: InventoryReportRunResult;
  error?: string;
}> {
  try {
    const data = await InventoryReportsRequest.run(reportId, params);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al generar el reporte",
    };
  }
}
