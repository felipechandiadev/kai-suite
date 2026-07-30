import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetAllPriceListItemsQuery } from './queries/get-all-price-list-items.query';
import { GetPriceListItemByIdQuery } from './queries/get-price-list-item-by-id.query';

@Injectable()
export class PriceListItemsServiceAdapter {
  constructor(private readonly queryBus: QueryBus) {}

  async getAllItems() {
    return this.queryBus.execute(new GetAllPriceListItemsQuery());
  }

  async getItemById(id: string) {
    return this.queryBus.execute(new GetPriceListItemByIdQuery(id));
  }
}
