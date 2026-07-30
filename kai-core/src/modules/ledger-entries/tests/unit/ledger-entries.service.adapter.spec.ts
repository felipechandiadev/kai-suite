import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { LedgerEntriesServiceAdapter } from '@modules/ledger-entries/application/ledger-entries.service.adapter';
import { GetAccountBalanceQuery } from '@modules/ledger-entries/application/queries/get-account-balance.query';
import { GetPersonBalanceQuery } from '@modules/ledger-entries/application/queries/get-person-balance.query';
import { GenerateLedgerEntriesCommand } from '@modules/ledger-entries/application/commands/generate-ledger-entries.command';

describe('LedgerEntriesServiceAdapter', () => {
  let adapter: LedgerEntriesServiceAdapter;
  let queryBus: { execute: jest.Mock };
  let commandBus: { execute: jest.Mock };

  beforeEach(() => {
    queryBus = { execute: jest.fn() };
    commandBus = { execute: jest.fn() };
    adapter = new LedgerEntriesServiceAdapter(
      queryBus as unknown as QueryBus,
      commandBus as unknown as CommandBus,
    );
  });

  it('should dispatch getAccountBalance query and return the balance', async () => {
    const beforeDate = new Date('2026-01-31');
    queryBus.execute.mockResolvedValueOnce({ balance: 120 });

    const result = await adapter.getAccountBalance('acc-1', beforeDate, 'company-1');

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetAccountBalanceQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      accountId: 'acc-1',
      fromDate: undefined,
      toDate: beforeDate,
    });
    expect(result).toBe(120);
  });

  it('should dispatch getPersonBalance query and return the balance', async () => {
    queryBus.execute.mockResolvedValueOnce({ balance: 80 });

    const result = await adapter.getPersonBalance('person-1', 'CUSTOMER', 'company-1');

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetPersonBalanceQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      personId: 'person-1',
      personType: 'CUSTOMER',
      fromDate: undefined,
      toDate: undefined,
    });
    expect(result).toBe(80);
  });

  it('should dispatch generateEntriesForTransaction command', async () => {
    commandBus.execute.mockResolvedValueOnce({ status: 'SUCCESS' });
    const transaction = { id: 'tx-1', companyId: 'company-1' };

    const result = await adapter.generateEntriesForTransaction(transaction);

    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(GenerateLedgerEntriesCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      transaction,
      companyId: 'company-1',
      manager: undefined,
    });
    expect(result).toEqual({ status: 'SUCCESS' });
  });
});