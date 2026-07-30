import { Injectable } from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { GetStockLevelsQuery } from './queries/get-stock-levels.query';
import { AdjustStockCommand } from './commands/adjust-stock.command';

@Injectable()
export class StockLevelsServiceAdapter {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  async getStockLevels(productVariantId?: string, storageId?: string) {
    return this.queryBus.execute(new GetStockLevelsQuery(productVariantId, storageId));
  }

  async adjustStock(
    productVariantId: string,
    storageId: string,
    adjustment: number,
    reason: string,
    userId?: string,
  ) {
    return this.commandBus.execute(
      new AdjustStockCommand(productVariantId, storageId, adjustment, reason),
    );
  }
}