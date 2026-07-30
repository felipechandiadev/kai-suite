import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AccountingRule } from '../domain/accounting-rule.entity';
import { AccountingRulesService } from './accounting-rules.service';
import { CreateAccountingRuleCommand } from './commands/create-accounting-rule.command';
import { UpdateAccountingRuleCommand } from './commands/update-accounting-rule.command';
import { DeactivateAccountingRuleCommand } from './commands/deactivate-accounting-rule.command';
import { GetAccountingRulesQuery } from './queries/get-accounting-rules.query';
import { GetAccountingRuleByIdQuery } from './queries/get-accounting-rule-by-id.query';
import { GetAccountingRulesByTransactionTypeQuery } from './queries/get-accounting-rules-by-transaction-type.query';

@Injectable()
export class AccountingRulesServiceAdapter extends AccountingRulesService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {
    super(null as any, null as any); // We don't need the original repositories
  }

  async create(dto: any): Promise<AccountingRule> {
    return this.commandBus.execute(
      new CreateAccountingRuleCommand(
        dto.companyId,
        dto.appliesTo,
        dto.transactionType,
        dto.debitAccountId,
        dto.creditAccountId,
        dto.priority,
        dto.expenseCategoryId,
        dto.taxId,
        dto.paymentMethod,
        dto.isActive,
      ),
    );
  }

  async findAll(companyId: string): Promise<AccountingRule[]> {
    return this.queryBus.execute(new GetAccountingRulesQuery(companyId));
  }

  async findById(id: string): Promise<AccountingRule | null> {
    return this.queryBus.execute(new GetAccountingRuleByIdQuery(id));
  }

  async update(id: string, dto: any): Promise<AccountingRule> {
    return this.commandBus.execute(
      new UpdateAccountingRuleCommand(
        id,
        dto.expenseCategoryId,
        dto.taxId,
        dto.paymentMethod,
        dto.debitAccountId,
        dto.creditAccountId,
        dto.priority,
        dto.isActive,
      ),
    );
  }

  async deactivate(id: string): Promise<void> {
    return this.commandBus.execute(new DeactivateAccountingRuleCommand(id));
  }

  async findByTransactionType(
    companyId: string,
    transactionType: string,
  ): Promise<AccountingRule[]> {
    return this.queryBus.execute(
      new GetAccountingRulesByTransactionTypeQuery(companyId, transactionType),
    );
  }
}
