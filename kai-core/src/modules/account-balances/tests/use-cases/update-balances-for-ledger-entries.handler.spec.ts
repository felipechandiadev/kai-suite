import { Test, TestingModule } from '@nestjs/testing';
import { UpdateBalancesForLedgerEntriesHandler } from '../../application/command-handlers/update-balances-for-ledger-entries.handler';
import { UpdateBalancesForLedgerEntriesCommand } from '../../application/commands/update-balances-for-ledger-entries.command';
import { AccountBalanceRepositoryPort } from '../../application/ports/account-balance.repository.port';

describe('UpdateBalancesForLedgerEntriesHandler', () => {
  let handler: UpdateBalancesForLedgerEntriesHandler;
  let repositoryMock: jest.Mocked<AccountBalanceRepositoryPort>;

  beforeEach(async () => {
    repositoryMock = {
      updateBalancesForLedgerEntries: jest.fn(),
      freezeBalancesForPeriod: jest.fn(),
      findBalancesForPeriod: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateBalancesForLedgerEntriesHandler,
        {
          provide: 'AccountBalanceRepositoryPort',
          useValue: repositoryMock,
        },
      ],
    }).compile();

    handler = module.get<UpdateBalancesForLedgerEntriesHandler>(
      UpdateBalancesForLedgerEntriesHandler,
    );
  });

  it('should forward ledger entries to the repository', async () => {
    const entries = [
      {
        transactionId: 'tx-1',
        accountId: 'acc-1',
        debit: 100,
        credit: 0,
      },
    ];

    const command = new UpdateBalancesForLedgerEntriesCommand(entries);

    await handler.execute(command);

    expect(repositoryMock.updateBalancesForLedgerEntries).toHaveBeenCalledTimes(
      1,
    );
    expect(repositoryMock.updateBalancesForLedgerEntries).toHaveBeenCalledWith(
      entries,
    );
  });
});
