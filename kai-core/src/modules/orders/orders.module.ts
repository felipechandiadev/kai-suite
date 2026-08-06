import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { RecipesModule } from '@modules/recipes/recipes.module';
import { ProductionUnitsModule } from '@modules/production-units/production-units.module';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { ProductVariantProductionUnit } from '@modules/product-variants/domain/product-variant-production-unit.entity';
import { ProductVariantProductionAttribute } from '@modules/product-variants/domain/product-variant-production-attribute.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { ProductModeModule } from '@shared/product-mode/product-mode.module';
import { OrdersController } from './presentation/orders.controller';
import { ServiceOrdersController } from './presentation/service-orders.controller';
import { ProductionBatchesController } from './presentation/production-batches.controller';
import { OrderExecutionController } from './presentation/order-execution.controller';
import { CompleteServiceOrderUseCase } from './application/commands/complete-service-order.usecase';
import { CompleteProductionBatchUseCase } from './application/commands/complete-production-batch.usecase';

@Module({
  imports: [
    CqrsModule,
    TransactionsModule,
    RecipesModule,
    ProductionUnitsModule,
    ProductModeModule,
    TypeOrmModule.forFeature([
      Transaction,
      TransactionLine,
      ProductVariant,
      ProductVariantProductionUnit,
      ProductVariantProductionAttribute,
      StockLevel,
      Company,
    ]),
  ],
  controllers: [
    OrdersController,
    ServiceOrdersController,
    ProductionBatchesController,
    OrderExecutionController,
  ],
  providers: [CompleteServiceOrderUseCase, CompleteProductionBatchUseCase],
})
export class OrdersModule {}
