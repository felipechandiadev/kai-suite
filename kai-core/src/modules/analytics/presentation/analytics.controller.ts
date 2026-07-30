import { Controller, Get, Query } from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { AnalyticsServiceAdapter } from '../application/analytics.service.adapter';
import type { AnalyticsDashboardResponse } from '../domain/analytics.types';
import type { DashboardStats } from '../domain/dashboard-stats';
import {
  AnalyticsDashboardQueryDto,
  AnalyticsTrendsQueryDto,
} from './dto/analytics-query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsServiceAdapter) {}

  @Get('dashboard')
  async dashboard(
    @CurrentCompany() companyId: string,
    @Query() query: AnalyticsDashboardQueryDto,
  ): Promise<AnalyticsDashboardResponse> {
    return this.analyticsService.getDashboard(companyId, {
      from: query.from,
      to: query.to,
      compare: query.compare,
      branchId: query.branchId,
      trendMonths: query.trendMonths,
    });
  }

  @Get('sales/trends')
  async salesTrends(
    @CurrentCompany() companyId: string,
    @Query() query: AnalyticsTrendsQueryDto,
  ) {
    return this.analyticsService.getSalesTrends(companyId, {
      from: query.from,
      to: query.to,
      branchId: query.branchId,
      trendMonths: query.months,
    });
  }

  @Get('purchases/trends')
  async purchasesTrends(
    @CurrentCompany() companyId: string,
    @Query() query: AnalyticsTrendsQueryDto,
  ) {
    return this.analyticsService.getPurchasesTrends(companyId, {
      from: query.from,
      to: query.to,
      branchId: query.branchId,
      trendMonths: query.months,
    });
  }

  @Get('operations/queues')
  async operationsQueues(
    @CurrentCompany() companyId: string,
    @Query() query: AnalyticsDashboardQueryDto,
  ) {
    return this.analyticsService.getOperationsQueues(companyId, {
      from: query.from,
      to: query.to,
      branchId: query.branchId,
    });
  }

  /** @deprecated Preferir GET /analytics/dashboard */
  @Get('report')
  async report(@CurrentCompany() companyId: string): Promise<DashboardStats> {
    return this.analyticsService.getDashboardStats(companyId);
  }
}
