import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetPriceListByIdQuery } from '@modules/price-lists/application/queries/get-price-lists.query';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import { PriceListOrmEntity } from '@modules/price-lists/infrastructure/orm-mappers/price-list.orm-entity';

@QueryHandler(GetPriceListByIdQuery)
export class GetPriceListByIdQueryHandler implements IQueryHandler<GetPriceListByIdQuery> {
  constructor(
    @InjectRepository(PriceListOrmEntity)
    private readonly repository: Repository<PriceListOrmEntity>,
  ) {}

  async execute(query: GetPriceListByIdQuery): Promise<PriceList | null> {
    const result = await this.repository.findOne({
      where: { id: query.id },
    });

    if (!result) {
      return null;
    }

    return this.toDomain(result);
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
