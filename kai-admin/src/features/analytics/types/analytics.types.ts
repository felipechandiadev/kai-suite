export type AnalyticsTrendPoint = {
  period: string;
  label: string;
  total: number;
};

export type AnalyticsPeriod = {
  from: string;
  to: string;
};

export type AnalyticsCompare = {
  from: string;
  to: string;
  changePct: Record<string, number | null>;
};

export type AnalyticsDashboardResponse = {
  period: AnalyticsPeriod;
  compare?: AnalyticsCompare;
  sales: {
    today: number;
    mtd: number;
    mtdCount: number;
    mtdAverageTicket: number;
  };
  purchases: {
    mtd: number;
    openPurchaseOrders: number;
  };
  inventory: {
    thresholdAlertCount: number;
    outOfStockCount: number;
  };
  commercial: {
    activeCustomers: number;
    newCustomersMtd: number;
    openQuotations: number;
    activeBackorders: number;
  };
  treasury: {
    openCashSessions: number;
    receivablesOutstanding: number;
    overdueInstallments: number;
  };
  hr: {
    activeEmployees: number;
    payrollNetMtd: number;
  };
  expenses: {
    countMtd: number;
    totalMtd: number;
    netMtd: number;
    pendingApproval: number;
  };
  trends: {
    sales: AnalyticsTrendPoint[];
    purchases: AnalyticsTrendPoint[];
  };
  operations: Array<{
    key: string;
    label: string;
    value: number;
    kind: "count" | "money";
  }>;
  salesToday: number;
  totalCustomers: number;
  lowStockItems: number;
  openOrders: number;
};
