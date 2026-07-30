import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ACCOUNTING_ACCOUNT_REPOSITORY } from '../../ports/accounting-account.repository.port';
import type { AccountingAccountRepositoryPort } from '../../ports/accounting-account.repository.port';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { CreateAccountingAccountCommand } from '../../commands/create-accounting-account.command';

@CommandHandler(CreateAccountingAccountCommand)
export class CreateAccountingAccountCommandHandler
  implements ICommandHandler<CreateAccountingAccountCommand>
{
  constructor(
    @Inject(ACCOUNTING_ACCOUNT_REPOSITORY)
    private readonly accountingAccountRepository: AccountingAccountRepositoryPort,
  ) {}

  async execute(command: CreateAccountingAccountCommand) {
    const p = command.payload;
    const account = new AccountingAccount({
      companyId: p.companyId,
      code: String(p.code ?? '').trim(),
      name: String(p.name ?? '').trim(),
      type: p.type as any,
      parentId: p.parentId ?? null,
      isActive: p.isActive ?? true,
    });

    return this.accountingAccountRepository.save(account);
  }
}

