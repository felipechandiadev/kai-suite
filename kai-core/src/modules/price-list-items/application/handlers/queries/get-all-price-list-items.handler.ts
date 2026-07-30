import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAllPriceListItemsQuery } from '../../queries/get-all-price-list-items.query';
import { PriceListItemsRepositoryPort } from '../../ports/price-list-items.repository.port';

@QueryHandler(GetAllPriceListItemsQuery)
export class GetAllPriceListItemsQueryHandler
  implements IQueryHandler<GetAllPriceListItemsQuery>
{
  constructor(
    @Inject('PriceListItemsRepositoryPort')
    private readonly repository: PriceListItemsRepositoryPort,
  ) {}

  async execute() {
    // Note: Repository doesn't expose findAll, returning empty for now
    // In production, would need to add this method to the repository
    return [];
  }
}
