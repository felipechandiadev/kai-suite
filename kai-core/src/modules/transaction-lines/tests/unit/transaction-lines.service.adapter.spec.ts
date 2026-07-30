import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { TransactionLinesServiceAdapter } from '@modules/transaction-lines/application/transaction-lines.service.adapter';
import { GetTransactionLinesQuery } from '@modules/transaction-lines/application/queries/get-transaction-lines.query';
import { GetTransactionLineByIdQuery } from '@modules/transaction-lines/application/queries/get-transaction-line-by-id.query';

describe('TransactionLinesServiceAdapter', () => {
  let service: TransactionLinesServiceAdapter;
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionLinesServiceAdapter,
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    service = module.get(TransactionLinesServiceAdapter);
  });

  it('should dispatch GetTransactionLinesQuery', async () => {
    queryBus.execute.mockResolvedValueOnce([]);

    await service.getTransactionLines('tx-1');

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetTransactionLinesQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({
      transactionId: 'tx-1',
    });
  });

  it('should dispatch GetTransactionLineByIdQuery', async () => {
    queryBus.execute.mockResolvedValueOnce(null);

    await service.getTransactionLineById('line-1');

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetTransactionLineByIdQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ id: 'line-1' });
  });
});