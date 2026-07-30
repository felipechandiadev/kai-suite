import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { PriceList } from './domain/price-list.entity';
import { PriceListsService } from './application/price-lists.service';
import { PriceListsServiceAdapter } from './application/price-lists.service.adapter';
import { PriceListsController } from './presentation/price-lists.controller';
import { TypeOrmPriceListRepository } from './infrastructure/repositories/type-orm-price-list.repository';
import { PriceListOrmEntity } from './infrastructure/orm-mappers/price-list.orm-entity';

// CQRS Handlers
import { GetAllPriceListsQueryHandler } from './application/handlers/queries/get-all-price-lists.handler';
import { GetPriceListByIdQueryHandler } from './application/handlers/queries/get-price-list-by-id.handler';

@Module({
  imports: [TypeOrmModule.forFeature([PriceList, PriceListOrmEntity]), CqrsModule],
  controllers: [PriceListsController],
  providers: [
    PriceListsService,
    PriceListsServiceAdapter,
    GetAllPriceListsQueryHandler,
    GetPriceListByIdQueryHandler,
    {
      provide: 'PriceListRepositoryPort',
      useClass: TypeOrmPriceListRepository,
    },
  ],
  exports: [PriceListsService, PriceListsServiceAdapter],
})
export class PriceListsModule {}
