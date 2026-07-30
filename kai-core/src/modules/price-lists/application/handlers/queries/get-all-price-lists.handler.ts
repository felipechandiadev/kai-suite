import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetAllPriceListsQuery } from '@modules/price-lists/application/queries/get-price-lists.query';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import { PriceListOrmEntity } from '@modules/price-lists/infrastructure/orm-mappers/price-list.orm-entity';

@QueryHandler(GetAllPriceListsQuery)
export class GetAllPriceListsQueryHandler implements IQueryHandler<GetAllPriceListsQuery> {
  constructor(
    @InjectRepository(PriceListOrmEntity)
    private readonly repository: Repository<PriceListOrmEntity>,
  ) {}

  async execute(query: GetAllPriceListsQuery): Promise<PriceList[]> {
    const qb = this.repository.createQueryBuilder('pl');

    // Filter by active status if includeInactive is false
    if (!query.includeInactive) {
      qb.where('pl.isActive = :active', { active: true });
    }

    // Order by priority (ascending) then by name
    qb.orderBy('pl.priority', 'ASC').addOrderBy('pl.name', 'ASC');

    const results = await qb.getMany();

    return results.map((orm) => this.toDomain(orm));
  }

  private toDomain(orm: PriceListOrmEntity): PriceList {
    return {
      id: orm.id,
      name: orm.name,
      priceListType: orm.priceListType as any,
      currency: orm.currency,
      validFrom: orm.validFrom,
      validUntil: orm.validUntil,
      priority: orm.priority,
      isDefault: orm.isDefault,
      isActive: orm.isActive,
      description: orm.description,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
      deletedAt: orm.deletedAt,
    } as PriceList;
  }
}
