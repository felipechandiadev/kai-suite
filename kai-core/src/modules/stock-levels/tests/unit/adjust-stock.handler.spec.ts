import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdjustStockCommandHandler } from '@modules/stock-levels/application/handlers/commands/adjust-stock.handler';
import { AdjustStockCommand } from '@modules/stock-levels/application/commands/adjust-stock.command';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';

describe('AdjustStockCommandHandler', () => {
  let handler: AdjustStockCommandHandler;
  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdjustStockCommandHandler,
        {
          provide: getRepositoryToken(StockLevel),
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(AdjustStockCommandHandler);
  });

  it('should create a stock level when none exists', async () => {
    const createdStockLevel = {
      id: 'sl-1',
      productVariantId: 'variant-1',
      storageId: 'storage-1',
      physicalStock: 0,
      committedStock: 0,
      availableStock: 0,
      incomingStock: 0,
    };

    repository.findOne.mockResolvedValueOnce(null);
    repository.create.mockReturnValueOnce(createdStockLevel);
    repository.save.mockImplementation(async (entity) => entity);

    const result = await handler.execute(
      new AdjustStockCommand('variant-1', 'storage-1', 5, 'initial-load'),
    );

    expect(repository.create).toHaveBeenCalledWith({
      productVariantId: 'variant-1',
      storageId: 'storage-1',
      physicalStock: 0,
      committedStock: 0,
      availableStock: 0,
      incomingStock: 0,
    });
    expect(repository.save).toHaveBeenCalledWith({
      ...createdStockLevel,
      physicalStock: 5,
      availableStock: 5,
    });
    expect(result).toEqual({
      success: true,
      stockLevel: {
        id: 'sl-1',
        physicalStock: 5,
        availableStock: 5,
      },
    });
  });

  it('should update an existing stock level', async () => {
    const existingStockLevel = {
      id: 'sl-2',
      productVariantId: 'variant-1',
      storageId: 'storage-1',
      physicalStock: 10,
      committedStock: 4,
      availableStock: 6,
      incomingStock: 0,
    };

    repository.findOne.mockResolvedValueOnce(existingStockLevel);
    repository.save.mockImplementation(async (entity) => entity);

    const result = await handler.execute(
      new AdjustStockCommand('variant-1', 'storage-1', -2, 'adjustment'),
    );

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith({
      ...existingStockLevel,
      physicalStock: 8,
      availableStock: 4,
    });
    expect(result.stockLevel).toEqual({
      id: 'sl-2',
      physicalStock: 8,
      availableStock: 4,
    });
  });
});