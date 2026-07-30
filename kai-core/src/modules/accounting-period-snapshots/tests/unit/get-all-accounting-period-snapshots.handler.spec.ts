import { Test, TestingModule } from '@nestjs/testing';
import { GetAllAccountingPeriodSnapshotsQueryHandler } from '@modules/accounting-period-snapshots/application/handlers/queries/get-all-accounting-period-snapshots.handler';
import { GetAllAccountingPeriodSnapshotsQuery } from '@modules/accounting-period-snapshots/application/queries/get-all-accounting-period-snapshots.query';
import { AccountingPeriodSnapshotRepositoryPort } from '@modules/accounting-period-snapshots/application/ports/accounting-period-snapshot.repository.port';

describe('GetAllAccountingPeriodSnapshotsQueryHandler', () => {
  let handler: GetAllAccountingPeriodSnapshotsQueryHandler;
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
        GetAllAccountingPeriodSnapshotsQueryHandler,
        {
          provide: 'AccountingPeriodSnapshotRepositoryPort',
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetAllAccountingPeriodSnapshotsQueryHandler);
  });

  it('should return paginated snapshots with metadata', async () => {
    repository.findAllPaginated.mockResolvedValueOnce({
      items: [{ id: 'snapshot-1', closingBalance: 1000 } as any],
      total: 1,
    });

    const result = await handler.execute(
      new GetAllAccountingPeriodSnapshotsQuery(20, 5, 'period-1', 'account-1'),
    );

    expect(repository.findAllPaginated).toHaveBeenCalledWith(
      20,
      5,
      'period-1',
      'account-1',
    );
    expect(result).toEqual({
      items: [{ id: 'snapshot-1', closingBalance: 1000 }],
      total: 1,
      limit: 20,
      offset: 5,
    });
  });

  it('should preserve default pagination and undefined filters', async () => {
    repository.findAllPaginated.mockResolvedValueOnce({ items: [], total: 0 });

    const result = await handler.execute(
      new GetAllAccountingPeriodSnapshotsQuery(),
    );

    expect(repository.findAllPaginated).toHaveBeenCalledWith(
      100,
      0,
      undefined,
      undefined,
    );
    expect(result).toEqual({
      items: [],
      total: 0,
      limit: 100,
      offset: 0,
    });
  });
});