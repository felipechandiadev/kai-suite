import type {
  AnalyticsDashboardResponse,
  AnalyticsOperationQueueItem,
  AnalyticsQueryParams,
  AnalyticsTrendPoint,
} from '../../domain/analytics.types';
import type { ResolvedAnalyticsPeriod } from '../analytics-period.util';

export abstract class AnalyticsRepositoryPort {
  abstract getDashboard(
    companyId: string,
    period: ResolvedAnalyticsPeriod,
    opts: AnalyticsQueryParams,
  ): Promise<AnalyticsDashboardResponse>;

  abstract getSalesTrends(
    companyId: string,
    period: ResolvedAnalyticsPeriod,
    branchId?: string,
  ): Promise<AnalyticsTrendPoint[]>;

  abstract getPurchasesTrends(
    companyId: string,
    period: ResolvedAnalyticsPeriod,
    branchId?: string,
  ): Promise<AnalyticsTrendPoint[]>;

  abstract getOperationsQueues(
    companyId: string,
    period: ResolvedAnalyticsPeriod,
    branchId?: string,
  ): Promise<AnalyticsOperationQueueItem[]>;
}
