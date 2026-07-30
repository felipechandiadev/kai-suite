import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetStockLevelsQuery } from '../application/queries/get-stock-levels.query';

@Controller('stock-levels')
export class StockLevelsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getStockLevels(
    @Query('productVariantId') productVariantId?: string,
    @Query('storageId') storageId?: string,
  ) {
    const query = new GetStockLevelsQuery(productVariantId, storageId);
    return this.queryBus.execute(query);
  }
}