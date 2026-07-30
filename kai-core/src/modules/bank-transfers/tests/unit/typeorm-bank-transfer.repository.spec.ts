import { TypeOrmBankTransferRepository } from '@modules/bank-transfers/infrastructure/repositories/typeorm-bank-transfer.repository';

describe('TypeOrmBankTransferRepository', () => {
  let repository: TypeOrmBankTransferRepository;
  let ormRepository: {
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
    findOneOrFail: jest.Mock;
  };
  let queryBuilder: {
    where: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    offset: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    ormRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOneOrFail: jest.fn(),
    };

    repository = new TypeOrmBankTransferRepository(ormRepository as any);
  });

  it('should save bank transfer', async () => {
    const transfer = { id: 'tr-1' };
    ormRepository.save.mockResolvedValueOnce(transfer);

    const result = await repository.save(transfer as any);

    expect(ormRepository.save).toHaveBeenCalledWith(transfer);
    expect(result).toBe(transfer);
  });

  it('should find bank transfer by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'tr-1' });

    const result = await repository.findById('tr-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'tr-1' } });
    expect(result).toMatchObject({ id: 'tr-1' });
  });

  it('should list all bank transfers ordered by creation date', async () => {
    ormRepository.find.mockResolvedValueOnce([]);

    await repository.findAll();

    expect(ormRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    });
  });

  it('should paginate and filter bank transfers by status', async () => {
    queryBuilder.getManyAndCount.mockResolvedValueOnce([[{ id: 'tr-1' }], 1]);

    const result = await repository.findAllPaginated(12, 4, 'PENDING');

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('transfer');
    expect(queryBuilder.where).toHaveBeenCalledWith('transfer.status = :status', {
      status: 'PENDING',
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('transfer.createdAt', 'DESC');
    expect(queryBuilder.limit).toHaveBeenCalledWith(12);
    expect(queryBuilder.offset).toHaveBeenCalledWith(4);
    expect(result).toEqual({ items: [{ id: 'tr-1' }], total: 1 });
  });

  it('should update an existing bank transfer', async () => {
    const entity = { id: 'tr-1', status: 'PENDING' };
    ormRepository.findOneOrFail.mockResolvedValueOnce(entity);
    ormRepository.save.mockResolvedValueOnce({ ...entity, status: 'DONE' });

    const result = await repository.update('tr-1', { status: 'DONE' } as any);

    expect(ormRepository.findOneOrFail).toHaveBeenCalledWith({ where: { id: 'tr-1' } });
    expect(ormRepository.save).toHaveBeenCalledWith({ id: 'tr-1', status: 'DONE' });
    expect(result).toMatchObject({ id: 'tr-1', status: 'DONE' });
  });
});