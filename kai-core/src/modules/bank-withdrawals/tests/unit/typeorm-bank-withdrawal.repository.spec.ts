import { TypeOrmBankWithdrawalRepository } from '@modules/bank-withdrawals/infrastructure/repositories/typeorm-bank-withdrawal.repository';

describe('TypeOrmBankWithdrawalRepository', () => {
  let repository: TypeOrmBankWithdrawalRepository;
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

    repository = new TypeOrmBankWithdrawalRepository(ormRepository as any);
  });

  it('should save bank withdrawal', async () => {
    const withdrawal = { id: 'wd-1' };
    ormRepository.save.mockResolvedValueOnce(withdrawal);

    const result = await repository.save(withdrawal as any);

    expect(ormRepository.save).toHaveBeenCalledWith(withdrawal);
    expect(result).toBe(withdrawal);
  });

  it('should find bank withdrawal by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'wd-1' });

    const result = await repository.findById('wd-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'wd-1' } });
    expect(result).toMatchObject({ id: 'wd-1' });
  });

  it('should list all bank withdrawals ordered by creation date', async () => {
    ormRepository.find.mockResolvedValueOnce([]);

    await repository.findAll();

    expect(ormRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    });
  });

  it('should paginate and filter bank withdrawals by status', async () => {
    queryBuilder.getManyAndCount.mockResolvedValueOnce([[{ id: 'wd-1' }], 1]);

    const result = await repository.findAllPaginated(12, 4, 'APPROVED');

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('withdrawal');
    expect(queryBuilder.where).toHaveBeenCalledWith('withdrawal.status = :status', {
      status: 'APPROVED',
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('withdrawal.createdAt', 'DESC');
    expect(queryBuilder.limit).toHaveBeenCalledWith(12);
    expect(queryBuilder.offset).toHaveBeenCalledWith(4);
    expect(result).toEqual({ items: [{ id: 'wd-1' }], total: 1 });
  });

  it('should update an existing bank withdrawal', async () => {
    const entity = { id: 'wd-1', status: 'PENDING' };
    ormRepository.findOneOrFail.mockResolvedValueOnce(entity);
    ormRepository.save.mockResolvedValueOnce({ ...entity, status: 'DONE' });

    const result = await repository.update('wd-1', { status: 'DONE' } as any);

    expect(ormRepository.findOneOrFail).toHaveBeenCalledWith({ where: { id: 'wd-1' } });
    expect(ormRepository.save).toHaveBeenCalledWith({ id: 'wd-1', status: 'DONE' });
    expect(result).toMatchObject({ id: 'wd-1', status: 'DONE' });
  });
});