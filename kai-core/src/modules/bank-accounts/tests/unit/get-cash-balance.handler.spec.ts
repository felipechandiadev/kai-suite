import { Test, TestingModule } from '@nestjs/testing';
import { GetCashBalanceQueryHandler } from '@modules/bank-accounts/application/handlers/queries/get-cash-balance.handler';
import { GetCashBalanceQuery } from '@modules/bank-accounts/application/queries/get-cash-balance.query';
import { BankAccountsRepositoryPort } from '@modules/bank-accounts/application/ports/bank-accounts.repository.port';

describe('GetCashBalanceQueryHandler', () => {
  let handler: GetCashBalanceQueryHandler;
  let repository: jest.Mocked<BankAccountsRepositoryPort>;

  beforeEach(async () => {
    repository = {
      getCashBalance: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCashBalanceQueryHandler,
        {
          provide: 'BankAccountsRepositoryPort',
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetCashBalanceQueryHandler);
  });

  it('should return cash balance from repository', async () => {
    repository.getCashBalance.mockResolvedValueOnce({ balance: 2500 });

    const result = await handler.execute();

    expect(repository.getCashBalance).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ balance: 2500 });
  });
});