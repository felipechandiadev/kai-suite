import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiningRealtimeModule } from '@modules/dining-realtime/dining-realtime.module';
import { Branch } from '@modules/branches/domain/branch.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductionUnit } from '@modules/production-units/domain/production-unit.entity';
import { DiningRoom } from './domain/dining-room.entity';
import { DiningTable } from './domain/dining-table.entity';
import { DiningOrder } from './domain/dining-order.entity';
import { DiningOrderLine } from './domain/dining-order-line.entity';
import { DiningBranchSettings } from './domain/dining-branch-settings.entity';
import { DiningOrderSequence } from './domain/dining-order-sequence.entity';
import { RecipesModule } from '@modules/recipes/recipes.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { DiningBackflushService } from './application/dining-backflush.service';
import { DiningOrderNumberService } from './application/dining-order-number.service';
import { DiningService } from './application/dining.service';
import { DiningController } from './presentation/dining.controller';
import { ProductVariantsModule } from '@modules/product-variants/product-variants.module';

@Module({
  imports: [
    forwardRef(() => DiningRealtimeModule),
    RecipesModule,
    TransactionsModule,
    ProductVariantsModule,
    TypeOrmModule.forFeature([
      DiningRoom,
      DiningTable,
      DiningOrder,
      DiningOrderLine,
      DiningBranchSettings,
      DiningOrderSequence,
      Branch,
      ProductVariant,
      ProductionUnit,
    ]),
  ],
  controllers: [DiningController],
  providers: [DiningService, DiningBackflushService, DiningOrderNumberService],
  exports: [DiningService, DiningOrderNumberService],
})
export class DiningModule {}
