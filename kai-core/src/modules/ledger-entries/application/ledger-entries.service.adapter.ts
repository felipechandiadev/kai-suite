import { Injectable } from '@nestjs/common';
import { QueryBus, CommandBus } from '@nestjs/cqrs';
import { LedgerEntriesService } from './ledger-entries.service';
import {
  GetAccountBalanceQuery,
  GetAccountBalanceResult,
} from './queries/get-account-balance.query';
import {
  GetPersonBalanceQuery,
  GetPersonBalanceResult,
} from './queries/get-person-balance.query';
import {
  GenerateLedgerEntriesCommand,
  GenerateLedgerEntriesResult,
} from './commands/generate-ledger-entries.command';

@Injectable()
export class LedgerEntriesServiceAdapter extends LedgerEntriesService {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {
    super(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
    ); // We don't need the repositories since we're delegating to CQRS
  }

  async getAccountBalance(
    accountId: string,
    beforeDate: Date,
    _companyId?: string,
  ): Promise<number> {
    const result: GetAccountBalanceResult = await this.queryBus.execute(
      new GetAccountBalanceQuery(accountId, undefined, beforeDate),
    );
    return result.balance;
  }

  async getPersonBalance(
    personId: string,
    personType: 'CUSTOMER' | 'SUPPLIER' | 'SHAREHOLDER' | 'EMPLOYEE',
    _companyId?: string,
  ): Promise<number> {
    const result: GetPersonBalanceResult = await this.queryBus.execute(
      new GetPersonBalanceQuery(personId, personType),
    );
    return result.balance;
  }

  async generateEntriesForTransaction(transaction: any): Promise<any> {
    const result: GenerateLedgerEntriesResult = await this.commandBus.execute(
      new GenerateLedgerEntriesCommand(transaction, transaction.companyId),
    );
    return result;
  }
}
