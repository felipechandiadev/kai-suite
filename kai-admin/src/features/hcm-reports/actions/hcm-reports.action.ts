"use server";

import { HcmReportsRequest } from "../infrastructure/hcm-reports.request";
import type {
  HcmReportCatalogItem,
  HcmReportRunResult,
} from "../types/hcm-report.types";

export async function listHcmReportsCatalogAction(): Promise<{
  success: boolean;
  data?: HcmReportCatalogItem[];
  error?: string;
}> {
  try {
    const data = await HcmReportsRequest.listCatalog();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al listar reportes",
    };
  }
}

export async function runHcmReportAction(
  reportId: string,
  params: Record<string, unknown>,
): Promise<{
  success: boolean;
  data?: HcmReportRunResult;
  error?: string;
}> {
  try {
    const data = await HcmReportsRequest.run(reportId, params);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error al generar el reporte",
    };
  }
}
