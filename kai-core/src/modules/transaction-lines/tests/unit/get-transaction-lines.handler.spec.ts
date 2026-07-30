import { Test, TestingModule } from '@nestjs/testing';
import { GetTransactionLinesQueryHandler } from '@modules/transaction-lines/application/handlers/queries/get-transaction-lines.handler';
import { GetTransactionLinesQuery } from '@modules/transaction-lines/application/queries/get-transaction-lines.query';
import { TransactionLinesRepositoryPort } from '@modules/transaction-lines/application/ports/transaction-lines.repository.port';

describe('GetTransactionLinesQueryHandler', () => {
  let handler: GetTransactionLinesQueryHandler;
  let repository: jest.Mocked<TransactionLinesRepositoryPort>;

  beforeEach(async () => {
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTransactionLinesQueryHandler,
        {
          provide: 'TransactionLinesRepositoryPort',
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetTransactionLinesQueryHandler);
  });

  it('should fetch transaction lines by transaction id', async () => {
    repository.findByTransactionId.mockResolvedValueOnce([]);

    await handler.execute(new GetTransactionLinesQuery('tx-1'));

    expect(repository.findByTransactionId).toHaveBeenCalledWith('tx-1');
    expect(repository.findAll).not.toHaveBeenCalled();
  });

  it('should fetch all transaction lines when transaction id is absent', async () => {
    repository.findAll.mockResolvedValueOnce([]);

    await handler.execute(new GetTransactionLinesQuery());

    expect(repository.findAll).toHaveBeenCalledTimes(1);
    expect(repository.findByTransactionId).not.toHaveBeenCalled();
  });
});