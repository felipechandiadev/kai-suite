import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateProductCommandHandler } from '../../application/handlers/commands/create-product.handler';
import { CreateProductCommand } from '../../application/commands/create-product.command';
import { Product, ProductType } from '../../domain/product.entity';
import { BrandsService } from '@modules/brands/application/brands.service';
import { ProductModeService } from '@shared/product-mode/product-mode.service';

describe('CreateProductCommandHandler', () => {
  let handler: CreateProductCommandHandler;
  let productRepoMock: any;
  let eventBus: EventBus;
  let productModeService: { assertProductTypeAllowed: jest.Mock };

  beforeEach(async () => {
    productRepoMock = {
      create: jest.fn(),
      save: jest.fn(),
    };
    productModeService = {
      assertProductTypeAllowed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateProductCommandHandler,
        {
          provide: getRepositoryToken(Product),
          useValue: productRepoMock,
        },
        {
          provide: EventBus,
          useValue: { publish: jest.fn() },
        },
        {
          provide: BrandsService,
          useValue: { assertBrandInCurrentCompany: jest.fn() },
        },
        {
          provide: ProductModeService,
          useValue: productModeService,
        },
      ],
    }).compile();

    handler = module.get<CreateProductCommandHandler>(
      CreateProductCommandHandler,
    );
    eventBus = module.get<EventBus>(EventBus);
  });

  it('should create product and publish event', async () => {
    const cmd = new CreateProductCommand(
      'prod-1',
      'Product 1',
      'cat-1',
      'Brand',
      'desc',
      true,
    );

    const saved = {
      id: 'prod-1',
      name: 'Product 1',
      categoryId: 'cat-1',
      brand: 'Brand',
      description: 'desc',
      isActive: true,
      productType: ProductType.PHYSICAL,
      taxIds: [],
      resultCenterId: null,
      baseUnitId: null,
      metadata: null,
      changeHistory: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as any;

    productRepoMock.create.mockReturnValue(saved);
    productRepoMock.save.mockResolvedValue(saved);

    const result = await handler.execute(cmd as any);

    expect(result).toBeDefined();
    expect(productRepoMock.create).toHaveBeenCalled();
    expect(productRepoMock.save).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
    expect(productModeService.assertProductTypeAllowed).toHaveBeenCalledWith(
      ProductType.PHYSICAL,
    );
  });
});
