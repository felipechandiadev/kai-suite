"use server";

import { KaifoodReportsRequest } from "../infrastructure/kaifood-reports.request";
import type {
  DiningReportCatalogItem,
  DiningReportRunResult,
} from "../types/kaifood-report.types";

export async function listKaifoodReportsCatalogAction(): Promise<{
  success: boolean;
  data?: DiningReportCatalogItem[];
  error?: string;
}> {
  try {
    const data = await KaifoodReportsRequest.listCatalog();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al listar reportes",
    };
  }
}

export async function runKaifoodReportAction(
  reportId: string,
  params: Record<string, unknown>,
): Promise<{
  success: boolean;
  data?: DiningReportRunResult;
  error?: string;
}> {
  try {
    const data = await KaifoodReportsRequest.run(reportId, params);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al generar el reporte",
    };
  }
}
