import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteBankAccountCommand } from '../../commands/delete-bank-account.command';
import { Inject } from '@nestjs/common';
import { BankAccountsRepositoryPort } from '../../ports/bank-accounts.repository.port';

@CommandHandler(DeleteBankAccountCommand)
export class DeleteBankAccountCommandHandler implements ICommandHandler<DeleteBankAccountCommand> {
  constructor(
    @Inject('BankAccountsRepositoryPort')
    private readonly bankAccountsRepository: BankAccountsRepositoryPort,
  ) {}

  async execute(command: DeleteBankAccountCommand) {
    return this.bankAccountsRepository.remove(command.accountKey);
  }
}
