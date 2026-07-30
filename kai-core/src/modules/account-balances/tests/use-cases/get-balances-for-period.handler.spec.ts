import { Test, TestingModule } from '@nestjs/testing';
import { GetBalancesForPeriodHandler } from '../../application/query-handlers/get-balances-for-period.handler';
import { GetBalancesForPeriodQuery } from '../../application/queries/get-balances-for-period.query';
import { AccountBalanceRepositoryPort } from '../../application/ports/account-balance.repository.port';
import { AccountBalance } from '../../domain/account-balance.entity';

describe('GetBalancesForPeriodHandler', () => {
  let handler: GetBalancesForPeriodHandler;
  let repositoryMock: jest.Mocked<AccountBalanceRepositoryPort>;

  beforeEach(async () => {
    repositoryMock = {
      updateBalancesForLedgerEntries: jest.fn(),
      freezeBalancesForPeriod: jest.fn(),
      findBalancesForPeriod: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBalancesForPeriodHandler,
        {
          provide: 'AccountBalanceRepositoryPort',
          useValue: repositoryMock,
        },
      ],
    }).compile();

    handler = module.get<GetBalancesForPeriodHandler>(
      GetBalancesForPeriodHandler,
    );
  });

  it('should query the repository for balances', async () => {
    const balance = new AccountBalance();
    balance.companyId = 'company-1';
    balance.periodId = 'period-1';

    repositoryMock.findBalancesForPeriod.mockResolvedValue([balance]);

    const query = new GetBalancesForPeriodQuery('company-1', 'period-1');
    const result = await handler.execute(query);

    expect(repositoryMock.findBalancesForPeriod).toHaveBeenCalledTimes(1);
    expect(repositoryMock.findBalancesForPeriod).toHaveBeenCalledWith(
      'company-1',
      'period-1',
    );
    expect(result).toEqual([balance]);
  });
});
