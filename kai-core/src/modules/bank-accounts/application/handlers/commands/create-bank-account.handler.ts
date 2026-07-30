import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateBankAccountCommand } from '../../commands/create-bank-account.command';
import { Inject } from '@nestjs/common';
import { BankAccountsRepositoryPort } from '../../ports/bank-accounts.repository.port';

@CommandHandler(CreateBankAccountCommand)
export class CreateBankAccountCommandHandler implements ICommandHandler<CreateBankAccountCommand> {
  constructor(
    @Inject('BankAccountsRepositoryPort')
    private readonly bankAccountsRepository: BankAccountsRepositoryPort,
  ) {}

  async execute(command: CreateBankAccountCommand) {
    return this.bankAccountsRepository.create(command.payload);
  }
}
