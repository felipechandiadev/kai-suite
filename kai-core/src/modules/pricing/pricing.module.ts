import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationalExpense } from '@modules/operational-expenses/domain/operational-expense.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { PricingWeeklySnapshot } from './domain/pricing-weekly-snapshot.entity';
import { PricingWeeklySnapshotLine } from './domain/pricing-weekly-snapshot-line.entity';
import { PricingQueryService } from './application/pricing-query.service';
import { PricingService } from './application/pricing.service';
import { PricingController } from './presentation/pricing.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OperationalExpense,
      Transaction,
      TransactionLine,
      ProductVariant,
      PriceListItem,
      PricingWeeklySnapshot,
      PricingWeeklySnapshotLine,
    ]),
  ],
  controllers: [PricingController],
  providers: [PricingQueryService, PricingService],
  exports: [PricingService],
})
export class PricingModule {}
