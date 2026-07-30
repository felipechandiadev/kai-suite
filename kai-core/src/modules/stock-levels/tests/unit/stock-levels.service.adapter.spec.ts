import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { StockLevelsServiceAdapter } from '@modules/stock-levels/application/stock-levels.service.adapter';
import { GetStockLevelsQuery } from '@modules/stock-levels/application/queries/get-stock-levels.query';
import { AdjustStockCommand } from '@modules/stock-levels/application/commands/adjust-stock.command';

describe('StockLevelsServiceAdapter', () => {
  let service: StockLevelsServiceAdapter;
  let queryBus: { execute: jest.Mock };
  let commandBus: { execute: jest.Mock };

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };
    commandBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockLevelsServiceAdapter,
        { provide: QueryBus, useValue: queryBus },
        { provide: CommandBus, useValue: commandBus },
      ],
    }).compile();

    service = module.get(StockLevelsServiceAdapter);
  });

  it('should dispatch GetStockLevelsQuery', async () => {
    queryBus.execute.mockResolvedValueOnce({ stockLevels: [] });

    await service.getStockLevels('variant-1', 'storage-1');

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetStockLevelsQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      productVariantId: 'variant-1',
      storageId: 'storage-1',
    });
  });

  it('should dispatch AdjustStockCommand', async () => {
    commandBus.execute.mockResolvedValueOnce({ success: true });

    await service.adjustStock('variant-1', 'storage-1', 5, 'initial-load', 'user-1');

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(AdjustStockCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      productVariantId: 'variant-1',
      storageId: 'storage-1',
      adjustment: 5,
      reason: 'initial-load',
    });
  });
});