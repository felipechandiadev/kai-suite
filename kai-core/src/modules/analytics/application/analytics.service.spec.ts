import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService (legacy stats)', () => {
  let service: AnalyticsService;
  const analyticsRepository = {
    getDashboard: jest.fn(),
    getSalesTrends: jest.fn(),
    getPurchasesTrends: jest.fn(),
    getOperationsQueues: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

  it('should map legacy dashboard stats from full dashboard', async () => {
    analyticsRepository.getDashboard.mockResolvedValue({
      salesToday: 100,
      totalCustomers: 20,
      lowStockItems: 4,
      openOrders: 3,
    });

    const stats = await service.getDashboardStats('company-1');

    expect(stats).toEqual({
      salesToday: 100,
      totalCustomers: 20,
      lowStockItems: 4,
      openOrders: 3,
    });
  });
});
