import { TypeOrmBankMovementRepository } from '@modules/bank-movements/infrastructure/repositories/typeorm-bank-movement.repository';

describe('TypeOrmBankMovementRepository', () => {
  let repository: TypeOrmBankMovementRepository;
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

    repository = new TypeOrmBankMovementRepository(ormRepository as any);
  });

  it('should save bank movement', async () => {
    const movement = { id: 'mov-1' };
    ormRepository.save.mockResolvedValueOnce(movement);

    const result = await repository.save(movement as any);

    expect(ormRepository.save).toHaveBeenCalledWith(movement);
    expect(result).toBe(movement);
  });

  it('should find bank movement by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'mov-1' });

    const result = await repository.findById('mov-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'mov-1' } });
    expect(result).toMatchObject({ id: 'mov-1' });
  });

  it('should list all bank movements ordered by creation date', async () => {
    ormRepository.find.mockResolvedValueOnce([]);

    await repository.findAll();

    expect(ormRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    });
  });

  it('should paginate and filter bank movements by direction', async () => {
    queryBuilder.getManyAndCount.mockResolvedValueOnce([[{ id: 'mov-1' }], 1]);

    const result = await repository.findAllPaginated(10, 5, 'IN');

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('movement');
    expect(queryBuilder.where).toHaveBeenCalledWith('movement.direction = :direction', {
      direction: 'IN',
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('movement.createdAt', 'DESC');
    expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    expect(queryBuilder.offset).toHaveBeenCalledWith(5);
    expect(result).toEqual({ items: [{ id: 'mov-1' }], total: 1 });
  });

  it('should update an existing bank movement', async () => {
    const entity = { id: 'mov-1', notes: 'old' };
    ormRepository.findOneOrFail.mockResolvedValueOnce(entity);
    ormRepository.save.mockResolvedValueOnce({ ...entity, notes: 'new' });

    const result = await repository.update('mov-1', { notes: 'new' } as any);

    expect(ormRepository.findOneOrFail).toHaveBeenCalledWith({ where: { id: 'mov-1' } });
    expect(ormRepository.save).toHaveBeenCalledWith({ id: 'mov-1', notes: 'new' });
    expect(result).toMatchObject({ id: 'mov-1', notes: 'new' });
  });
});