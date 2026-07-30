import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateBankAccountCommand } from '../../commands/update-bank-account.command';
import { Inject } from '@nestjs/common';
import { BankAccountsRepositoryPort } from '../../ports/bank-accounts.repository.port';

@CommandHandler(UpdateBankAccountCommand)
export class UpdateBankAccountCommandHandler implements ICommandHandler<UpdateBankAccountCommand> {
  constructor(
    @Inject('BankAccountsRepositoryPort')
    private readonly bankAccountsRepository: BankAccountsRepositoryPort,
  ) {}

  async execute(command: UpdateBankAccountCommand) {
    return this.bankAccountsRepository.update(command.accountKey, command.payload);
  }
}
