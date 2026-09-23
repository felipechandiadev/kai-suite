import { coreFetch } from "@/lib/http";
import { stripMarginFromSalesReport } from "@/features/sales-reports/lib/strip-margin";
import type { SalesReportRunResult } from "@/features/sales-reports/types/sales-report.types";

export async function runSalesReport(
  reportId: string,
  params: Record<string, unknown>,
): Promise<{ success: true; data: SalesReportRunResult } | { success: false; error: string }> {
  try {
    const data = await coreFetch<SalesReportRunResult>(
      `/sales-reports/${encodeURIComponent(reportId)}/run`,
      {
        method: "POST",
        body: JSON.stringify({ params }),
      },
    );
    return { success: true, data: stripMarginFromSalesReport(data) };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "No se pudo generar el reporte",
    };
  }
}
