import { Inject, Injectable } from '@nestjs/common';
import { AnalyticsRepositoryPort } from './ports/analytics.repository.port';
import {
  changePct,
  resolveAnalyticsPeriod,
  resolvePreviousPeriod,
  resolveTrendRange,
} from './analytics-period.util';
import type {
  AnalyticsDashboardResponse,
  AnalyticsOperationQueueItem,
  AnalyticsQueryParams,
  AnalyticsTrendPoint,
} from '../domain/analytics.types';
import type { DashboardStats } from '../domain/dashboard-stats';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject('AnalyticsRepositoryPort')
    private readonly analyticsRepository: AnalyticsRepositoryPort,
  ) {}

  async getDashboard(
    companyId: string,
    params: AnalyticsQueryParams = {},
  ): Promise<AnalyticsDashboardResponse> {
    const period = resolveAnalyticsPeriod(params);
    const dashboard = await this.analyticsRepository.getDashboard(
      companyId,
      period,
      params,
    );

    if (params.compare !== 'previous_period') {
      return dashboard;
    }

    const previous = resolvePreviousPeriod(period);
    const previousDashboard = await this.analyticsRepository.getDashboard(
      companyId,
      previous,
      params,
    );

    return {
      ...dashboard,
      compare: {
        from: previous.from.toISOString(),
        to: previous.to.toISOString(),
        changePct: {
          salesMtd: changePct(dashboard.sales.mtd, previousDashboard.sales.mtd),
          salesToday: changePct(dashboard.sales.today, previousDashboard.sales.today),
          purchasesMtd: changePct(
            dashboard.purchases.mtd,
            previousDashboard.purchases.mtd,
          ),
          payrollNetMtd: changePct(
            dashboard.hr.payrollNetMtd,
            previousDashboard.hr.payrollNetMtd,
          ),
          expensesTotalMtd: changePct(
            dashboard.expenses.totalMtd,
            previousDashboard.expenses.totalMtd,
          ),
          newCustomersMtd: changePct(
            dashboard.commercial.newCustomersMtd,
            previousDashboard.commercial.newCustomersMtd,
          ),
        },
      },
    };
  }

  /** Subconjunto legacy para clientes que solo consumen 4 KPIs. */
  async getDashboardStats(companyId: string): Promise<DashboardStats> {
    const full = await this.getDashboard(companyId);
    return {
      salesToday: full.salesToday,
      totalCustomers: full.totalCustomers,
      lowStockItems: full.lowStockItems,
      openOrders: full.openOrders,
    };
  }

  async getSalesTrends(
    companyId: string,
    params: AnalyticsQueryParams = {},
  ): Promise<AnalyticsTrendPoint[]> {
    const period = resolveTrendRange(
      resolveAnalyticsPeriod(params).to,
      params.trendMonths ?? 12,
    );
    return this.analyticsRepository.getSalesTrends(
      companyId,
      period,
      params.branchId,
    );
  }

  async getPurchasesTrends(
    companyId: string,
    params: AnalyticsQueryParams = {},
  ): Promise<AnalyticsTrendPoint[]> {
    const period = resolveTrendRange(
      resolveAnalyticsPeriod(params).to,
      params.trendMonths ?? 12,
    );
    return this.analyticsRepository.getPurchasesTrends(
      companyId,
      period,
      params.branchId,
    );
  }

  async getOperationsQueues(
    companyId: string,
    params: AnalyticsQueryParams = {},
  ): Promise<AnalyticsOperationQueueItem[]> {
    const period = resolveAnalyticsPeriod(params);
    return this.analyticsRepository.getOperationsQueues(
      companyId,
      period,
      params.branchId,
    );
  }
}
