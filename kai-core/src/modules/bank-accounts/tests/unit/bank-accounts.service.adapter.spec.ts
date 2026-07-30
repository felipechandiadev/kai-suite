import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { BankAccountsServiceAdapter } from '@modules/bank-accounts/application/bank-accounts.service.adapter';
import { CreateBankAccountCommand } from '@modules/bank-accounts/application/commands/create-bank-account.command';
import { UpdateBankAccountCommand } from '@modules/bank-accounts/application/commands/update-bank-account.command';
import { DeleteBankAccountCommand } from '@modules/bank-accounts/application/commands/delete-bank-account.command';
import { GetCashBalanceQuery } from '@modules/bank-accounts/application/queries/get-cash-balance.query';
import { GetBankAccountsQuery } from '@modules/bank-accounts/application/queries/get-bank-accounts.query';
import { GetBankAccountByIdQuery } from '@modules/bank-accounts/application/queries/get-bank-account-by-id.query';
import { AccountTypeName, BankName } from '@modules/persons/domain/person.entity';

describe('BankAccountsServiceAdapter', () => {
  let service: BankAccountsServiceAdapter;
  let queryBus: { execute: jest.Mock };
  let commandBus: { execute: jest.Mock };

  beforeEach(() => {
    queryBus = { execute: jest.fn() };
    commandBus = { execute: jest.fn() };

    service = new BankAccountsServiceAdapter(
      queryBus as unknown as QueryBus,
      commandBus as unknown as CommandBus,
    );
  });

  it('should dispatch GetCashBalanceQuery', async () => {
    queryBus.execute.mockResolvedValueOnce({ balance: 1500 });

    const result = await service.getCashBalance();

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetCashBalanceQuery);
    expect(result).toEqual({ balance: 1500 });
  });

  it('should dispatch GetBankAccountsQuery', async () => {
    queryBus.execute.mockResolvedValueOnce([]);

    await service.list();

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetBankAccountsQuery);
  });

  it('should dispatch GetBankAccountByIdQuery', async () => {
    queryBus.execute.mockResolvedValueOnce(null);

    await service.findOne('acc-1');

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetBankAccountByIdQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ accountKey: 'acc-1' });
  });

  it('should dispatch CreateBankAccountCommand', async () => {
    const payload = {
      ownerType: 'person' as const,
      ownerId: 'person-1',
      bankName: BankName.BANCO_ESTADO,
      accountType: AccountTypeName.CUENTA_AHORRO,
      accountNumber: '12345',
      currentBalance: 300,
    };
    commandBus.execute.mockResolvedValueOnce({ accountKey: 'acc-1' });

    await service.create(payload);

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(CreateBankAccountCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({ payload });
  });

  it('should dispatch UpdateBankAccountCommand', async () => {
    const payload = { notes: 'updated', currentBalance: 900 };
    commandBus.execute.mockResolvedValueOnce({ accountKey: 'acc-1' });

    await service.update('acc-1', payload);

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(UpdateBankAccountCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      accountKey: 'acc-1',
      payload,
    });
  });

  it('should dispatch DeleteBankAccountCommand and return success object', async () => {
    commandBus.execute.mockResolvedValueOnce(undefined);

    const result = await service.remove('acc-1');

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(DeleteBankAccountCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({ accountKey: 'acc-1' });
    expect(result).toEqual({ success: true });
  });
});