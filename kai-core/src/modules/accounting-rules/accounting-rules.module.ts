import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { AccountingRule } from '@modules/accounting-rules/domain/accounting-rule.entity';
import { AccountingRuleLine } from '@modules/accounting-rules/domain/accounting-rule-line.entity';
import { AccountingRulesService } from '@modules/accounting-rules/application/accounting-rules.service';
import { AccountingRulesServiceAdapter } from '@modules/accounting-rules/application/accounting-rules.service.adapter';
import { AccountingRulesController } from '@modules/accounting-rules/presentation/accounting-rules.controller';
import { TypeOrmAccountingRuleRepository } from '@modules/accounting-rules/infrastructure/repositories/typeorm-accounting-rule.repository';
import { AccountingRuleRepositoryPort } from '@modules/accounting-rules/application/ports/accounting-rule.repository.port';

// Command Handlers
import { CreateAccountingRuleHandler } from '@modules/accounting-rules/application/commands/create-accounting-rule.handler';
import { UpdateAccountingRuleHandler } from '@modules/accounting-rules/application/commands/update-accounting-rule.handler';
import { DeactivateAccountingRuleHandler } from '@modules/accounting-rules/application/commands/deactivate-accounting-rule.handler';

// Query Handlers
import { GetAccountingRulesHandler } from '@modules/accounting-rules/application/queries/get-accounting-rules.handler';
import { GetAccountingRuleByIdHandler } from '@modules/accounting-rules/application/queries/get-accounting-rule-by-id.handler';
import { GetAccountingRulesByTransactionTypeHandler } from '@modules/accounting-rules/application/queries/get-accounting-rules-by-transaction-type.handler';

@Module({
  imports: [TypeOrmModule.forFeature([AccountingRule, AccountingRuleLine]), CqrsModule],
  controllers: [AccountingRulesController],
  providers: [
    // Legacy service for backward compatibility
    AccountingRulesService,

    // CQRS Adapter
    AccountingRulesServiceAdapter,

    // Repository
    {
      provide: 'AccountingRuleRepositoryPort',
      useClass: TypeOrmAccountingRuleRepository,
    },

    // Command Handlers
    CreateAccountingRuleHandler,
    UpdateAccountingRuleHandler,
    DeactivateAccountingRuleHandler,

    // Query Handlers
    GetAccountingRulesHandler,
    GetAccountingRuleByIdHandler,
    GetAccountingRulesByTransactionTypeHandler,
  ],
  exports: [AccountingRulesService, AccountingRulesServiceAdapter],
})
export class AccountingRulesModule {}
