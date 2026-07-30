import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { AccountingRuleRepositoryPort } from '../ports/accounting-rule.repository.port';
import { DeactivateAccountingRuleCommand } from './deactivate-accounting-rule.command';

@CommandHandler(DeactivateAccountingRuleCommand)
export class DeactivateAccountingRuleHandler implements ICommandHandler<DeactivateAccountingRuleCommand> {
  constructor(
    @Inject('AccountingRuleRepositoryPort')
    private readonly repository: AccountingRuleRepositoryPort,
  ) {}

  async execute(command: DeactivateAccountingRuleCommand): Promise<void> {
    return this.repository.deactivate(command.id);
  }
}
