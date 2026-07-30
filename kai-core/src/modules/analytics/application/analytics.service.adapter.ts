import { Injectable } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import type {
  AnalyticsDashboardResponse,
  AnalyticsOperationQueueItem,
  AnalyticsQueryParams,
  AnalyticsTrendPoint,
} from '../domain/analytics.types';
import type { DashboardStats } from '../domain/dashboard-stats';

@Injectable()
export class AnalyticsServiceAdapter {
  constructor(private readonly analyticsService: AnalyticsService) {}

  getDashboard(
    companyId: string,
    params?: AnalyticsQueryParams,
  ): Promise<AnalyticsDashboardResponse> {
    return this.analyticsService.getDashboard(companyId, params ?? {});
  }

  getDashboardStats(companyId: string): Promise<DashboardStats> {
    return this.analyticsService.getDashboardStats(companyId);
  }

  getSalesTrends(
    companyId: string,
    params?: AnalyticsQueryParams,
  ): Promise<AnalyticsTrendPoint[]> {
    return this.analyticsService.getSalesTrends(companyId, params ?? {});
  }

  getPurchasesTrends(
    companyId: string,
    params?: AnalyticsQueryParams,
  ): Promise<AnalyticsTrendPoint[]> {
    return this.analyticsService.getPurchasesTrends(companyId, params ?? {});
  }

  getOperationsQueues(
    companyId: string,
    params?: AnalyticsQueryParams,
  ): Promise<AnalyticsOperationQueueItem[]> {
    return this.analyticsService.getOperationsQueues(companyId, params ?? {});
  }
}
