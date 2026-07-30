/** Punto de serie temporal (ventas / compras). */
export type AnalyticsTrendPoint = {
  period: string;
  label: string;
  total: number;
};

export type AnalyticsPeriodDto = {
  from: string;
  to: string;
};

export type AnalyticsCompareDto = {
  from: string;
  to: string;
  changePct: Record<string, number | null>;
};

export type AnalyticsSalesBlock = {
  today: number;
  mtd: number;
  mtdCount: number;
  mtdAverageTicket: number;
};

export type AnalyticsPurchasesBlock = {
  mtd: number;
  openPurchaseOrders: number;
};

export type AnalyticsInventoryBlock = {
  thresholdAlertCount: number;
  outOfStockCount: number;
};

export type AnalyticsCommercialBlock = {
  activeCustomers: number;
  newCustomersMtd: number;
  openQuotations: number;
  activeBackorders: number;
};

export type AnalyticsTreasuryBlock = {
  openCashSessions: number;
  receivablesOutstanding: number;
  overdueInstallments: number;
};

export type AnalyticsHrBlock = {
  activeEmployees: number;
  payrollNetMtd: number;
};

export type AnalyticsExpensesBlock = {
  countMtd: number;
  totalMtd: number;
  netMtd: number;
  pendingApproval: number;
};

export type AnalyticsTrendsBlock = {
  sales: AnalyticsTrendPoint[];
  purchases: AnalyticsTrendPoint[];
};

export type AnalyticsOperationQueueItem = {
  key: string;
  label: string;
  value: number;
  kind: 'count' | 'money';
};

/** Respuesta principal del dashboard (API v2). */
export type AnalyticsDashboardResponse = {
  period: AnalyticsPeriodDto;
  compare?: AnalyticsCompareDto;
  sales: AnalyticsSalesBlock;
  purchases: AnalyticsPurchasesBlock;
  inventory: AnalyticsInventoryBlock;
  commercial: AnalyticsCommercialBlock;
  treasury: AnalyticsTreasuryBlock;
  hr: AnalyticsHrBlock;
  expenses: AnalyticsExpensesBlock;
  trends: AnalyticsTrendsBlock;
  operations: AnalyticsOperationQueueItem[];
  /** Campos legacy para compatibilidad con clientes antiguos. */
  salesToday: number;
  totalCustomers: number;
  lowStockItems: number;
  openOrders: number;
};

export type AnalyticsQueryParams = {
  from?: string;
  to?: string;
  compare?: 'previous_period';
  branchId?: string;
  trendMonths?: number;
};
