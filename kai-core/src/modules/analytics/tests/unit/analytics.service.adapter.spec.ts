import { AnalyticsServiceAdapter } from '@modules/analytics/application/analytics.service.adapter';
import { AnalyticsService } from '@modules/analytics/application/analytics.service';

describe('AnalyticsServiceAdapter', () => {
  it('should delegate getDashboard to AnalyticsService', async () => {
    const dashboard = {
      period: { from: 'a', to: 'b' },
      salesToday: 1,
      totalCustomers: 2,
      lowStockItems: 3,
      openOrders: 4,
    };
    const analyticsService = {
      getDashboard: jest.fn().mockResolvedValue(dashboard),
      getDashboardStats: jest.fn(),
      getSalesTrends: jest.fn(),
      getPurchasesTrends: jest.fn(),
      getOperationsQueues: jest.fn(),
    };
    const adapter = new AnalyticsServiceAdapter(
      analyticsService as unknown as AnalyticsService,
    );

    const result = await adapter.getDashboard('company-1', { compare: 'previous_period' });

    expect(analyticsService.getDashboard).toHaveBeenCalledWith('company-1', {
      compare: 'previous_period',
    });
    expect(result).toBe(dashboard);
  });
});
