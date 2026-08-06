import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiningOrder } from '@modules/dining/domain/dining-order.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TipLedgerEntry } from '@modules/tips/domain/tip-ledger-entry.entity';
import { DiningReportsController } from './presentation/dining-reports.controller';
import { DiningReportRunner } from './application/dining-report.runner';
import { DiningReportsQueryService } from './application/dining-reports-query.service';
import {
  DiningByHourHandler,
  DiningByTableHandler,
  DiningSalonSummaryHandler,
} from './application/handlers/mvp.handlers';
import { DiningPeriodCompareHandler } from './application/handlers/compare.handlers';

@Module({
  imports: [
    TypeOrmModule.forFeature([DiningOrder, Transaction, TipLedgerEntry]),
  ],
  controllers: [DiningReportsController],
  providers: [
    DiningReportsQueryService,
    DiningReportRunner,
    DiningSalonSummaryHandler,
    DiningByHourHandler,
    DiningByTableHandler,
    DiningPeriodCompareHandler,
  ],
  exports: [DiningReportRunner, DiningReportsQueryService],
})
export class DiningReportsModule {}
