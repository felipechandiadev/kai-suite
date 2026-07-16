"use server";

import { SalesReportsRequest } from "../infrastructure/sales-reports.request";
import type {
  SalesReportCatalogItem,
  SalesReportRunResult,
} from "../types/sales-report.types";

export async function listSalesReportsCatalogAction(): Promise<{
  success: boolean;
  data?: SalesReportCatalogItem[];
  error?: string;
}> {
  try {
    const data = await SalesReportsRequest.listCatalog();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al listar reportes",
    };
  }
}

export async function runSalesReportAction(
  reportId: string,
  params: Record<string, unknown>,
): Promise<{
  success: boolean;
  data?: SalesReportRunResult;
  error?: string;
}> {
  try {
    const data = await SalesReportsRequest.run(reportId, params);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al generar el reporte",
    };
  }
}
