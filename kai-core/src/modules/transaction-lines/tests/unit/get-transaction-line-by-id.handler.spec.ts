import { Test, TestingModule } from '@nestjs/testing';
import { GetTransactionLineByIdQueryHandler } from '@modules/transaction-lines/application/handlers/queries/get-transaction-line-by-id.handler';
import { GetTransactionLineByIdQuery } from '@modules/transaction-lines/application/queries/get-transaction-line-by-id.query';
import { TransactionLinesRepositoryPort } from '@modules/transaction-lines/application/ports/transaction-lines.repository.port';

describe('GetTransactionLineByIdQueryHandler', () => {
  let handler: GetTransactionLineByIdQueryHandler;
  let repository: jest.Mocked<TransactionLinesRepositoryPort>;

  beforeEach(async () => {
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByTransactionId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTransactionLineByIdQueryHandler,
        {
          provide: 'TransactionLinesRepositoryPort',
          useValue: repository,
        },
      ],
    }).compile();

    handler = module.get(GetTransactionLineByIdQueryHandler);
  });

  it('should fetch a transaction line by id', async () => {
    repository.findById.mockResolvedValueOnce(null);

    await handler.execute(new GetTransactionLineByIdQuery('line-1'));

    expect(repository.findById).toHaveBeenCalledWith('line-1');
  });
});