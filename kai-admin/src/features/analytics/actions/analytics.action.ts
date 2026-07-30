"use server";

import { AnalyticsRequest } from "../infrastructure/analytics.request";
import type { AnalyticsDashboardResponse } from "../types/analytics.types";

export async function getAnalyticsDashboardAction(opts?: {
  from?: string;
  to?: string;
  compare?: "previous_period";
  branchId?: string;
  trendMonths?: number;
}): Promise<AnalyticsDashboardResponse> {
  return AnalyticsRequest.getDashboard(opts);
}
