import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetAllAccountingAccountsQuery } from './queries/get-all-accounting-accounts.query';
import { GetAccountingAccountByIdQuery } from './queries/get-accounting-account-by-id.query';
import { CreateAccountingAccountCommand } from './commands/create-accounting-account.command';

@Injectable()
export class AccountingAccountsServiceAdapter {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  async getAllAccounts() {
    return this.queryBus.execute(new GetAllAccountingAccountsQuery());
  }

  async getAccountById(id: string) {
    return this.queryBus.execute(new GetAccountingAccountByIdQuery(id));
  }

  async createAccount(payload: {
    companyId: string;
    code: string;
    name: string;
    type: string;
    parentId?: string | null;
    isActive?: boolean;
  }) {
    return this.commandBus.execute(new CreateAccountingAccountCommand(payload));
  }
}
