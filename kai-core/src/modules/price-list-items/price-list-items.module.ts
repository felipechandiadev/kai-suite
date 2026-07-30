import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { PriceListItem } from './domain/price-list-item.entity';
import { PriceListItemsServiceAdapter } from './application/price-list-items.service.adapter';
import { PriceListItemsController } from './presentation/price-list-items.controller';
import { GetAllPriceListItemsQueryHandler } from './application/handlers/queries/get-all-price-list-items.handler';
import { GetPriceListItemByIdQueryHandler } from './application/handlers/queries/get-price-list-item-by-id.handler';
import { TypeOrmPriceListItemsRepository } from './infrastructure/repositories/typeorm-price-list-items.repository';
import { PRICE_LIST_ITEMS_REPOSITORY } from './application/ports/price-list-items.repository.port';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([PriceListItem])],
  controllers: [PriceListItemsController],
  providers: [
    PriceListItemsServiceAdapter,
    {
      provide: 'PriceListItemsRepositoryPort',
      useClass: TypeOrmPriceListItemsRepository,
    },
    {
      provide: PRICE_LIST_ITEMS_REPOSITORY,
      useClass: TypeOrmPriceListItemsRepository,
    },
    GetAllPriceListItemsQueryHandler,
    GetPriceListItemByIdQueryHandler,
  ],
  exports: [
    PriceListItemsServiceAdapter,
    'PriceListItemsRepositoryPort',
    PRICE_LIST_ITEMS_REPOSITORY,
  ],
})
export class PriceListItemsModule {}
