import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { AccountingRule } from '../../domain/accounting-rule.entity';
import { AccountingRuleRepositoryPort } from '../ports/accounting-rule.repository.port';
import { UpdateAccountingRuleCommand } from './update-accounting-rule.command';

@CommandHandler(UpdateAccountingRuleCommand)
export class UpdateAccountingRuleHandler implements ICommandHandler<UpdateAccountingRuleCommand> {
  constructor(
    @Inject('AccountingRuleRepositoryPort')
    private readonly repository: AccountingRuleRepositoryPort,
  ) {}

  async execute(command: UpdateAccountingRuleCommand): Promise<AccountingRule> {
    const updateData: Partial<AccountingRule> = {};

    if (command.expenseCategoryId !== undefined)
      updateData.expenseCategoryId = command.expenseCategoryId;
    if (command.taxId !== undefined) updateData.taxId = command.taxId;
    if (command.paymentMethod !== undefined)
      updateData.paymentMethod = command.paymentMethod;
    if (command.debitAccountId !== undefined)
      updateData.debitAccountId = command.debitAccountId;
    if (command.creditAccountId !== undefined)
      updateData.creditAccountId = command.creditAccountId;
    if (command.priority !== undefined) updateData.priority = command.priority;
    if (command.isActive !== undefined) updateData.isActive = command.isActive;

    return this.repository.update(command.id, updateData);
  }
}
