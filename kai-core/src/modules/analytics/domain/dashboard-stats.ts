import type { AnalyticsDashboardResponse } from './analytics.types';

/** @deprecated Usar AnalyticsDashboardResponse; se mantiene el subconjunto legacy. */
export type DashboardStats = Pick<
  AnalyticsDashboardResponse,
  'salesToday' | 'totalCustomers' | 'lowStockItems' | 'openOrders'
>;
