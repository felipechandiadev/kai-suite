import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { GetCashBalanceQuery } from './queries/get-cash-balance.query';
import { GetBankAccountsQuery } from './queries/get-bank-accounts.query';
import { GetBankAccountByIdQuery } from './queries/get-bank-account-by-id.query';
import { CreateBankAccountCommand } from './commands/create-bank-account.command';
import { UpdateBankAccountCommand } from './commands/update-bank-account.command';
import { DeleteBankAccountCommand } from './commands/delete-bank-account.command';
import { BankAccount } from '../domain/bank-account.entity';

@Injectable()
export class BankAccountsServiceAdapter {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  async getCashBalance(): Promise<{ balance: number }> {
    return this.queryBus.execute(new GetCashBalanceQuery());
  }

  async list(): Promise<BankAccount[]> {
    return this.queryBus.execute(new GetBankAccountsQuery());
  }

  async findOne(accountKey: string): Promise<BankAccount | null> {
    return this.queryBus.execute(new GetBankAccountByIdQuery(accountKey));
  }

  async create(data: CreateBankAccountDto): Promise<BankAccount> {
    return this.commandBus.execute(new CreateBankAccountCommand(data));
  }

  async update(
    accountKey: string,
    data: UpdateBankAccountDto,
  ): Promise<BankAccount> {
    return this.commandBus.execute(new UpdateBankAccountCommand(accountKey, data));
  }

  async remove(accountKey: string): Promise<{ success: true }> {
    await this.commandBus.execute(new DeleteBankAccountCommand(accountKey));
    return { success: true };
  }
}
