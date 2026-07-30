import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetAllPriceListsQuery, GetPriceListByIdQuery } from './queries/get-price-lists.query';

@Injectable()
export class PriceListsServiceAdapter {
  constructor(private readonly queryBus: QueryBus) {}

  async getAllPriceLists(includeInactive: boolean = false) {
    const result = await this.queryBus.execute(new GetAllPriceListsQuery(includeInactive));
    return result;
  }

  async getPriceListById(id: string) {
    return this.queryBus.execute(new GetPriceListByIdQuery(id));
  }
}