import { Test, TestingModule } from '@nestjs/testing';
import { StockCommitmentService } from '@modules/stock-levels/application/stock-commitment.service';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { StockRealtimePublisher } from '@modules/stock-realtime/stock-realtime.publisher';

describe('StockCommitmentService', () => {
  let service: StockCommitmentService;
  let stockRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let variantRepo: { findOne: jest.Mock };
  let stockRealtime: { emitStockUpdated: jest.Mock };

  const manager = {
    getRepository: jest.fn(),
  };

  beforeEach(async () => {
    stockRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
    };
    variantRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'v1',
        minimumStock: 0,
        maximumStock: 0,
        reorderPoint: 0,
      }),
    };
    stockRealtime = { emitStockUpdated: jest.fn() };

    manager.getRepository.mockImplementation((entity: unknown) => {
      if (entity === StockLevel) return stockRepo;
      if (entity === ProductVariant) return variantRepo;
      return stockRepo;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockCommitmentService,
        { provide: StockRealtimePublisher, useValue: stockRealtime },
      ],
    }).compile();

    service = module.get(StockCommitmentService);
  });

  it('reserve increments committed without requiring physical stock', async () => {
    stockRepo.findOne.mockResolvedValue({
      companyId: 'c1',
      productVariantId: 'v1',
      storageId: 's1',
      physicalStock: 0,
      committedStock: 0,
      availableStock: 0,
    });

    const result = await service.reserve(manager as any, {
      companyId: 'c1',
      variantId: 'v1',
      storageId: 's1',
      qty: 3,
    });

    expect(result.committedStock).toBe(3);
    expect(result.availableStock).toBe(-3);
    expect(stockRepo.save).toHaveBeenCalled();
  });

  it('release decreases committed', async () => {
    stockRepo.findOne.mockResolvedValue({
      companyId: 'c1',
      productVariantId: 'v1',
      storageId: 's1',
      physicalStock: 10,
      committedStock: 5,
      availableStock: 5,
    });

    const result = await service.release(manager as any, {
      companyId: 'c1',
      variantId: 'v1',
      storageId: 's1',
      qty: 2,
    });

    expect(result.committedStock).toBe(3);
    expect(result.availableStock).toBe(7);
  });

  it('recalculateAvailable uses physical minus committed', () => {
    const sl = {
      physicalStock: 8,
      committedStock: 5,
      availableStock: 99,
    } as StockLevel;
    service.recalculateAvailable(sl);
    expect(sl.availableStock).toBe(3);
  });
});
