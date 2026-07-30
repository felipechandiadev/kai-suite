import { Test } from '@nestjs/testing';
import { AnalyticsService } from '@modules/analytics/application/analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  const analyticsRepository = {
    getDashboard: jest.fn(),
    getSalesTrends: jest.fn(),
    getPurchasesTrends: jest.fn(),
    getOperationsQueues: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: 'AnalyticsRepositoryPort',
          useValue: analyticsRepository,
        },
      ],
    }).compile();

    service = module.get(AnalyticsService);
    jest.clearAllMocks();
  });

  it('should attach compare block when requested', async () => {
    const baseDashboard = {
      period: { from: '2026-05-01', to: '2026-05-27' },
      sales: { today: 100, mtd: 5000, mtdCount: 10, mtdAverageTicket: 500 },
      purchases: { mtd: 2000, openPurchaseOrders: 3 },
      inventory: { thresholdAlertCount: 4, outOfStockCount: 1 },
      commercial: {
        activeCustomers: 20,
        newCustomersMtd: 5,
        openQuotations: 2,
        activeBackorders: 1,
      },
      treasury: {
        openCashSessions: 2,
        receivablesOutstanding: 1000,
        overdueInstallments: 1,
      },
      hr: { activeEmployees: 8, payrollNetMtd: 900 },
      expenses: { countMtd: 3, totalMtd: 400, netMtd: 300, pendingApproval: 1 },
      trends: { sales: [], purchases: [] },
      operations: [],
      salesToday: 100,
      totalCustomers: 20,
      lowStockItems: 4,
      openOrders: 3,
    };

    analyticsRepository.getDashboard
      .mockResolvedValueOnce(baseDashboard)
      .mockResolvedValueOnce({
        ...baseDashboard,
        sales: { ...baseDashboard.sales, mtd: 4000 },
      });

    const result = await service.getDashboard('company-1', {
      compare: 'previous_period',
    });

    expect(analyticsRepository.getDashboard).toHaveBeenCalledTimes(2);
    expect(result.compare?.changePct.salesMtd).toBe(25);
  });
});
