import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetAccountingPeriodSnapshotQueryHandler } from '@modules/accounting-period-snapshots/application/handlers/queries/get-accounting-period-snapshot.handler';
import { GetAccountingPeriodSnapshotQuery } from '@modules/accounting-period-snapshots/application/queries/get-accounting-period-snapshot.query';
import { AccountingPeriodSnapshotRepositoryPort } from '@modules/accounting-period-snapshots/application/ports/accounting-period-snapshot.repository.port';

describe('GetAccountingPeriodSnapshotQueryHandler', () => {
  let handler: GetAccountingPeriodSnapshotQueryHandler;
  let repository: jest.Mocked<AccountingPeriodSnapshotRepositoryPort>;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAccountingPeriodSnapshotQueryHandler,
        {
          provide: 'AccountingPeriodSnapshotRepositoryPort',
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetAccountingPeriodSnapshotQueryHandler);
  });

  it('should return snapshot when repository finds it', async () => {
    repository.findById.mockResolvedValueOnce({
      id: 'snapshot-1',
      periodId: 'period-1',
      accountId: 'account-1',
      closingBalance: 1000,
    } as any);

    const result = await handler.execute(
      new GetAccountingPeriodSnapshotQuery('snapshot-1'),
    );

    expect(repository.findById).toHaveBeenCalledWith('snapshot-1');
    expect(result).toMatchObject({
      id: 'snapshot-1',
      periodId: 'period-1',
      accountId: 'account-1',
    });
  });

  it('should throw when snapshot does not exist', async () => {
    repository.findById.mockResolvedValueOnce(null);

    await expect(
      handler.execute(new GetAccountingPeriodSnapshotQuery('missing')),
    ).rejects.toThrow(new NotFoundException('Accounting period snapshot missing not found'));
  });
});