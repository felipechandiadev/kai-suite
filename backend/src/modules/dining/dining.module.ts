import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiningRealtimeModule } from '@modules/dining-realtime/dining-realtime.module';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { DiningRoom } from './domain/dining-room.entity';
import { DiningTable } from './domain/dining-table.entity';
import { DiningOrder } from './domain/dining-order.entity';
import { DiningOrderLine } from './domain/dining-order-line.entity';
import { DiningBranchSettings } from './domain/dining-branch-settings.entity';
import { DiningOrderSequence } from './domain/dining-order-sequence.entity';
import { DiningKitchenFireSequence } from './domain/dining-kitchen-fire-sequence.entity';
import { DiningStationOrder } from './domain/dining-station-order.entity';
import { RecipesModule } from '@modules/recipes/recipes.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { StockLevelsModule } from '@modules/stock-levels/stock-levels.module';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { DiningBackflushService } from './application/dining-backflush.service';
import { DiningMaterialReservationService } from './application/dining-material-reservation.service';
import { DiningOrderNumberService } from './application/dining-order-number.service';
import { DiningSchemaBootstrap } from './application/dining-schema.bootstrap';
import { DiningService } from './application/dining.service';
import { DiningController } from './presentation/dining.controller';
import { ProductVariantsModule } from '@modules/product-variants/product-variants.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { DiningReadyNotificationService } from './application/dining-ready-notification.service';

@Module({
  imports: [
    forwardRef(() => DiningRealtimeModule),
    RecipesModule,
    TransactionsModule,
    StockLevelsModule,
    ProductVariantsModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      DiningRoom,
      DiningTable,
      DiningOrder,
      DiningOrderLine,
      DiningBranchSettings,
      DiningOrderSequence,
      DiningKitchenFireSequence,
      DiningStationOrder,
      Branch,
      Category,
      ProductVariant,
      ProductionUnit,
      Transaction,
    ]),
  ],
  controllers: [DiningController],
  providers: [
    DiningService,
    DiningBackflushService,
    DiningMaterialReservationService,
    DiningOrderNumberService,
    DiningSchemaBootstrap,
    DiningReadyNotificationService,
  ],
  exports: [DiningService, DiningOrderNumberService],
})
export class DiningModule {}
