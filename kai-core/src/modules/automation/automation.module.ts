import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { AutomationRule } from './domain/automation-rule.entity';
import { AutomationAction } from './domain/automation-action.entity';
import { AutomationRulesController } from './presentation/automation-rules.controller';
import { AutomationRulesService } from './application/automation-rules.service';
import { AutomationEngine } from './application/automation.engine';
import { TransactionCreatedAutomationHandler } from './application/handlers/transaction-created.automation-handler';
import { CreateDerivedTransactionActionHandler } from './application/handlers/actions/create-derived-transaction.action';
import { UpdateStockActionHandler } from './application/handlers/actions/update-stock.action';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { StockRealtimeModule } from '@modules/stock-realtime/stock-realtime.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { CompaniesModule } from '@modules/companies/companies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationRule, AutomationAction]),
    CqrsModule,
    TransactionsModule,
    StockRealtimeModule,
    NotificationsModule,
    CompaniesModule,
  ],
  controllers: [AutomationRulesController],
  providers: [
    AutomationRulesService,
    AutomationEngine,
    TransactionCreatedAutomationHandler,
    CreateDerivedTransactionActionHandler,
    UpdateStockActionHandler,
  ],
  exports: [AutomationRulesService, AutomationEngine],
})
export class AutomationModule {}

