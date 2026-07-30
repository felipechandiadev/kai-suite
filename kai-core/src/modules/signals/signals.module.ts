import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { CompanyPaymentMethodEntity } from '@modules/companies/domain/company-payment-method.entity';
import { SalesReportsModule } from '@modules/sales-reports/sales-reports.module';
import { SignalBoardService } from './application/signal-board.service';
import { SignalsQueryService } from './application/signals-query.service';
import { SIGNAL_PROVIDERS } from './application/providers/signal-provider';
import { ReorderQueueProvider } from './application/providers/reorder-queue.provider';
import { SalesWeekdayPaceProvider } from './application/providers/sales-weekday-pace.provider';
import { VoidRateProvider } from './application/providers/void-rate.provider';
import { PaymentFeeDragProvider } from './application/providers/payment-fee-drag.provider';
import { DeadStockCapitalProvider } from './application/providers/dead-stock-capital.provider';
import { StockDaysCoverProvider } from './application/providers/stock-days-cover.provider';
import { BuyNowProvider } from './application/providers/buy-now.provider';
import { SignalsController } from './presentation/signals.controller';

const providers = [
  ReorderQueueProvider,
  SalesWeekdayPaceProvider,
  VoidRateProvider,
  PaymentFeeDragProvider,
  DeadStockCapitalProvider,
  StockDaysCoverProvider,
  BuyNowProvider,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StockLevel,
      Transaction,
      TransactionLine,
      CompanyPaymentMethodEntity,
    ]),
    SalesReportsModule,
  ],
  controllers: [SignalsController],
  providers: [
    SignalsQueryService,
    SignalBoardService,
    ...providers,
    {
      provide: SIGNAL_PROVIDERS,
      useFactory: (
        reorder: ReorderQueueProvider,
        pace: SalesWeekdayPaceProvider,
        voids: VoidRateProvider,
        fees: PaymentFeeDragProvider,
        dead: DeadStockCapitalProvider,
        cover: StockDaysCoverProvider,
        buy: BuyNowProvider,
      ) => [pace, reorder, voids, fees, dead, cover, buy],
      inject: [
        ReorderQueueProvider,
        SalesWeekdayPaceProvider,
        VoidRateProvider,
        PaymentFeeDragProvider,
        DeadStockCapitalProvider,
        StockDaysCoverProvider,
        BuyNowProvider,
      ],
    },
  ],
  exports: [SignalBoardService],
})
export class SignalsModule {}
