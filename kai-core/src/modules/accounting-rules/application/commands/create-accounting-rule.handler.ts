import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { AccountingRule } from '../../domain/accounting-rule.entity';
import { AccountingRuleRepositoryPort } from '../ports/accounting-rule.repository.port';
import { CreateAccountingRuleCommand } from './create-accounting-rule.command';

@CommandHandler(CreateAccountingRuleCommand)
export class CreateAccountingRuleHandler implements ICommandHandler<CreateAccountingRuleCommand> {
  constructor(
    @Inject('AccountingRuleRepositoryPort')
    private readonly repository: AccountingRuleRepositoryPort,
  ) {}

  async execute(command: CreateAccountingRuleCommand): Promise<AccountingRule> {
    const rule = new AccountingRule();
    rule.companyId = command.companyId;
    rule.appliesTo = command.appliesTo;
    rule.transactionType = command.transactionType;
    rule.expenseCategoryId = command.expenseCategoryId;
    rule.taxId = command.taxId;
    rule.paymentMethod = command.paymentMethod;
    rule.debitAccountId = command.debitAccountId;
    rule.creditAccountId = command.creditAccountId;
    rule.priority = command.priority;
    rule.isActive = command.isActive ?? true;

    return this.repository.save(rule);
  }
}
