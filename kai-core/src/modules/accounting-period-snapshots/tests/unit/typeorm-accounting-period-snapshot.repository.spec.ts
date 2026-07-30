import { TypeOrmAccountingPeriodSnapshotRepository } from '@modules/accounting-period-snapshots/infrastructure/repositories/type-orm-accounting-period-snapshot.repository';

describe('TypeOrmAccountingPeriodSnapshotRepository', () => {
  let repository: TypeOrmAccountingPeriodSnapshotRepository;
  let ormRepository: {
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
    update: jest.Mock;
  };
  let queryBuilder: {
    leftJoinAndSelect: jest.Mock;
    orderBy: jest.Mock;
    andWhere: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    ormRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      update: jest.fn(),
    };

    repository = new TypeOrmAccountingPeriodSnapshotRepository(ormRepository as any);
  });

  it('should save a snapshot', async () => {
    const snapshot = { id: 'snap-1' };
    ormRepository.save.mockResolvedValueOnce(snapshot);

    const result = await repository.save(snapshot as any);

    expect(ormRepository.save).toHaveBeenCalledWith(snapshot);
    expect(result).toBe(snapshot);
  });

  it('should find snapshot by id with relations', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'snap-1' });

    const result = await repository.findById('snap-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'snap-1' },
      relations: ['period', 'account'],
    });
    expect(result).toMatchObject({ id: 'snap-1' });
  });

  it('should find all snapshots ordered by creation date', async () => {
    ormRepository.find.mockResolvedValueOnce([]);

    await repository.findAll();

    expect(ormRepository.find).toHaveBeenCalledWith({
      relations: ['period', 'account'],
      order: { createdAt: 'DESC' },
    });
  });

  it('should paginate snapshots with optional filters', async () => {
    queryBuilder.getManyAndCount.mockResolvedValueOnce([[{ id: 'snap-1' }], 1]);

    const result = await repository.findAllPaginated(20, 5, 'period-1', 'account-1');

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('snapshot');
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('snapshot.period', 'period');
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('snapshot.account', 'account');
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('snapshot.createdAt', 'DESC');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('snapshot.periodId = :periodId', {
      periodId: 'period-1',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('snapshot.accountId = :accountId', {
      accountId: 'account-1',
    });
    expect(queryBuilder.skip).toHaveBeenCalledWith(5);
    expect(queryBuilder.take).toHaveBeenCalledWith(20);
    expect(result).toEqual({ items: [{ id: 'snap-1' }], total: 1 });
  });

  it('should update and reload a snapshot', async () => {
    ormRepository.update.mockResolvedValueOnce(undefined);
    ormRepository.findOne.mockResolvedValueOnce({ id: 'snap-1', amount: 50 });

    const result = await repository.update('snap-1', { amount: 50 } as any);

    expect(ormRepository.update).toHaveBeenCalledWith('snap-1', { amount: 50 });
    expect(result).toMatchObject({ id: 'snap-1', amount: 50 });
  });

  it('should throw when updated snapshot cannot be reloaded', async () => {
    ormRepository.update.mockResolvedValueOnce(undefined);
    ormRepository.findOne.mockResolvedValueOnce(null);

    await expect(repository.update('missing', {} as any)).rejects.toThrow(
      'AccountingPeriodSnapshot with id missing not found after update',
    );
  });
});