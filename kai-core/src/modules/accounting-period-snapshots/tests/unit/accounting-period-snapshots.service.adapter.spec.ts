import { QueryBus } from '@nestjs/cqrs';
import { AccountingPeriodSnapshotsServiceAdapter } from '@modules/accounting-period-snapshots/application/accounting-period-snapshots.service.adapter';
import { GetAllAccountingPeriodSnapshotsQuery } from '@modules/accounting-period-snapshots/application/queries/get-all-accounting-period-snapshots.query';
import { GetAccountingPeriodSnapshotQuery } from '@modules/accounting-period-snapshots/application/queries/get-accounting-period-snapshot.query';

describe('AccountingPeriodSnapshotsServiceAdapter', () => {
  let service: AccountingPeriodSnapshotsServiceAdapter;
  let queryBus: { execute: jest.Mock };

  beforeEach(() => {
    queryBus = { execute: jest.fn() };

    service = new AccountingPeriodSnapshotsServiceAdapter(
      queryBus as unknown as QueryBus,
    );
  });

  it('should dispatch GetAllAccountingPeriodSnapshotsQuery and return items', async () => {
    queryBus.execute.mockResolvedValueOnce({ items: [{ id: 'snapshot-1' }] });

    const result = await service.findAll({
      limit: 20,
      offset: 5,
      periodId: 'period-1',
      accountId: 'account-1',
    });

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(
      GetAllAccountingPeriodSnapshotsQuery,
    );
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      limit: 20,
      offset: 5,
      periodId: 'period-1',
      accountId: 'account-1',
    });
    expect(result).toEqual([{ id: 'snapshot-1' }]);
  });

  it('should dispatch GetAccountingPeriodSnapshotQuery', async () => {
    queryBus.execute.mockResolvedValueOnce({ id: 'snapshot-1' });

    await service.findOne('snapshot-1');

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(
      GetAccountingPeriodSnapshotQuery,
    );
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      snapshotId: 'snapshot-1',
    });
  });
});