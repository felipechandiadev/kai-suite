import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { InventoryController } from './presentation/inventory.controller';
import { InventoryService } from './application/inventory.service';
import { InventoryServiceAdapter } from './application/inventory.service.adapter';
import { StoragesModule } from '../storages/storages.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { ProductVariantsModule } from '../product-variants/product-variants.module';
import { User } from '@modules/users/domain/user.entity';
import { StockLevelOrmEntity } from '@modules/stock-levels/infrastructure/orm-mappers/stock-level.orm-entity';
import { STOCK_LEVELS_REPOSITORY } from './application/ports/stock-levels.repository.port';
import { StockLevelsRepository } from './infrastructure/repositories/stock-levels.repository';

// CQRS Handlers
import { GetStockFiltersQueryHandler } from './application/handlers/queries/get-stock.handlers';
import { GetAllStocksQueryHandler } from './application/handlers/queries/get-stock.handlers';
import { GetStockByIdQueryHandler } from './application/handlers/queries/get-stock.handlers';
import { GetLowStockItemsQueryHandler } from './application/handlers/queries/get-stock.handlers';
import { GetStockMovementHistoryQueryHandler } from './application/handlers/queries/get-stock.handlers';
import { StockLevelThresholdSchemaBootstrap } from './application/stock-level-threshold-schema.bootstrap';
import { InventorySearchBootstrap } from './application/inventory-search.bootstrap';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, StockLevelOrmEntity]),
    StoragesModule,
    TransactionsModule,
    ProductVariantsModule,
    CqrsModule,
    NotificationsModule,
  ],
  controllers: [InventoryController],
  providers: [
    StockLevelThresholdSchemaBootstrap,
    InventorySearchBootstrap,
    InventoryService,
    InventoryServiceAdapter,
    {
      provide: STOCK_LEVELS_REPOSITORY,
      useClass: StockLevelsRepository,
    },
    StockLevelsRepository,
    GetStockFiltersQueryHandler,
    GetAllStocksQueryHandler,
    GetStockByIdQueryHandler,
    GetLowStockItemsQueryHandler,
    GetStockMovementHistoryQueryHandler,
  ],
  exports: [InventoryService, InventoryServiceAdapter],
})
export class InventoryModule {}
