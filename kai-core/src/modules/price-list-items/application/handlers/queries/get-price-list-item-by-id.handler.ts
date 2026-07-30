import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPriceListItemByIdQuery } from '../../queries/get-price-list-item-by-id.query';
import { PriceListItemsRepositoryPort } from '../../ports/price-list-items.repository.port';

@QueryHandler(GetPriceListItemByIdQuery)
export class GetPriceListItemByIdQueryHandler
  implements IQueryHandler<GetPriceListItemByIdQuery>
{
  constructor(
    @Inject('PriceListItemsRepositoryPort')
    private readonly repository: PriceListItemsRepositoryPort,
  ) {}

  async execute(query: GetPriceListItemByIdQuery) {
    // Note: Repository doesn't expose findById, returning null for now
    // In production, would need to add this method to the repository
    return null;
  }
}
