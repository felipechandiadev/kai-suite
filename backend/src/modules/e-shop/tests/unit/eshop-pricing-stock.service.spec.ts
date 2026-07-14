import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EShopPricingStockService } from '../../application/eshop-pricing-stock.service';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { CompaniesService } from '@modules/companies/application/companies.service';

describe('EShopPricingStockService', () => {
  let service: EShopPricingStockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EShopPricingStockService,
        { provide: getRepositoryToken(ProductVariant), useValue: { find: jest.fn() } },
        {
          provide: getRepositoryToken(StockLevel),
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
        { provide: getRepositoryToken(PriceListItem), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(Branch), useValue: { findOne: jest.fn() } },
        {
          provide: CompaniesService,
          useValue: { getEShopFlatSettings: jest.fn().mockResolvedValue({ eShopStockPolicy: 'ALLOW_BACKORDER' }) },
        },
      ],
    }).compile();

    service = module.get(EShopPricingStockService);
  });

  it('returns empty stock map without storage', async () => {
    const map = await service.loadStockMap('company-1', ['v1'], null);
    expect(map.size).toBe(0);
  });
});
