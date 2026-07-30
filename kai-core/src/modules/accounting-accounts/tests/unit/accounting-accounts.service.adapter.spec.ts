import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AccountingAccountsServiceAdapter } from '@modules/accounting-accounts/application/accounting-accounts.service.adapter';
import { GetAllAccountingAccountsQuery } from '@modules/accounting-accounts/application/queries/get-all-accounting-accounts.query';
import { GetAccountingAccountByIdQuery } from '@modules/accounting-accounts/application/queries/get-accounting-account-by-id.query';

describe('AccountingAccountsServiceAdapter', () => {
  let adapter: AccountingAccountsServiceAdapter;
  let queryBus: { execute: jest.Mock };
  let commandBus: { execute: jest.Mock };

  beforeEach(() => {
    queryBus = { execute: jest.fn() };
    commandBus = { execute: jest.fn() };
    adapter = new AccountingAccountsServiceAdapter(
      queryBus as unknown as QueryBus,
      commandBus as unknown as CommandBus,
    );
  });

  it('should dispatch getAllAccounts query', async () => {
    queryBus.execute.mockResolvedValueOnce([{ id: 'acc-1' }]);

    const result = await adapter.getAllAccounts();

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetAllAccountingAccountsQuery);
    expect(result).toEqual([{ id: 'acc-1' }]);
  });

  it('should dispatch getAccountById query', async () => {
    queryBus.execute.mockResolvedValueOnce({ id: 'acc-1' });

    const result = await adapter.getAccountById('acc-1');

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetAccountingAccountByIdQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ id: 'acc-1' });
    expect(result).toEqual({ id: 'acc-1' });
  });
});