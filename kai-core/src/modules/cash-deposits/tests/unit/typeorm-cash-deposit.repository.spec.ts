import { TypeOrmCashDepositRepository } from '@modules/cash-deposits/infrastructure/repositories/typeorm-cash-deposit.repository';

describe('TypeOrmCashDepositRepository', () => {
  let repository: TypeOrmCashDepositRepository;
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

    repository = new TypeOrmCashDepositRepository(ormRepository as any);
  });

  it('should save cash deposit', async () => {
    const deposit = { id: 'dep-1' };
    ormRepository.save.mockResolvedValueOnce(deposit);

    const result = await repository.save(deposit as any);

    expect(ormRepository.save).toHaveBeenCalledWith(deposit);
    expect(result).toBe(deposit);
  });

  it('should find cash deposit by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'dep-1' });

    const result = await repository.findById('dep-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'dep-1' } });
    expect(result).toMatchObject({ id: 'dep-1' });
  });

  it('should list all cash deposits ordered by creation date', async () => {
    ormRepository.find.mockResolvedValueOnce([]);

    await repository.findAll();

    expect(ormRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    });
  });

  it('should paginate and filter deposits by status', async () => {
    queryBuilder.getManyAndCount.mockResolvedValueOnce([[{ id: 'dep-1' }], 1]);

    const result = await repository.findAllPaginated(8, 2, 'PENDING');

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('deposit');
    expect(queryBuilder.where).toHaveBeenCalledWith('deposit.status = :status', {
      status: 'PENDING',
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('deposit.createdAt', 'DESC');
    expect(queryBuilder.limit).toHaveBeenCalledWith(8);
    expect(queryBuilder.offset).toHaveBeenCalledWith(2);
    expect(result).toEqual({ items: [{ id: 'dep-1' }], total: 1 });
  });

  it('should update an existing deposit', async () => {
    const entity = { id: 'dep-1', status: 'PENDING' };
    ormRepository.findOneOrFail.mockResolvedValueOnce(entity);
    ormRepository.save.mockResolvedValueOnce({ ...entity, status: 'DONE' });

    const result = await repository.update('dep-1', { status: 'DONE' } as any);

    expect(ormRepository.findOneOrFail).toHaveBeenCalledWith({ where: { id: 'dep-1' } });
    expect(ormRepository.save).toHaveBeenCalledWith({ id: 'dep-1', status: 'DONE' });
    expect(result).toMatchObject({ id: 'dep-1', status: 'DONE' });
  });
});