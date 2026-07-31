import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { PromotionRedemption } from '@modules/promotions/domain/promotion-redemption.entity';
import { SalesReportsController } from './presentation/sales-reports.controller';
import { SalesReportRunner } from './application/sales-report.runner';
import { SalesReportsQueryService } from './application/sales-reports-query.service';
import {
  CashSessionCloseHandler,
  CustomerPurchasesHandler,
  CustomerReturnsHandler,
  SalesByPeriodHandler,
  SalesByProductHandler,
  SalesDetailHandler,
} from './application/handlers/mvp.handlers';
import {
  BackordersStatusHandler,
  CreditNotesHandler,
  PromotionRedemptionsHandler,
  QuotationsFunnelHandler,
  SalesByCategoryHandler,
  SalesByPaymentMethodHandler,
  SalesByPosHandler,
  TopProductsHandler,
} from './application/handlers/p1.handlers';
import {
  PosCompareHandler,
  SalesPeriodCompareHandler,
} from './application/handlers/compare.handlers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionLine,
      CashSession,
      Customer,
      PromotionRedemption,
    ]),
  ],
  controllers: [SalesReportsController],
  providers: [
    SalesReportsQueryService,
    SalesReportRunner,
    SalesByPeriodHandler,
    SalesDetailHandler,
    SalesByProductHandler,
    CustomerReturnsHandler,
    CustomerPurchasesHandler,
    CashSessionCloseHandler,
    TopProductsHandler,
    SalesByPaymentMethodHandler,
    SalesByPosHandler,
    CreditNotesHandler,
    PromotionRedemptionsHandler,
    QuotationsFunnelHandler,
    BackordersStatusHandler,
    SalesByCategoryHandler,
    SalesPeriodCompareHandler,
    PosCompareHandler,
  ],
  exports: [SalesReportRunner, SalesReportsQueryService],
})
export class SalesReportsModule {}
