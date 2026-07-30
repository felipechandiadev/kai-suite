import { TypeOrmBudgetRepository } from '@modules/budgets/infrastructure/repositories/type-orm-budget.repository';

describe('TypeOrmBudgetRepository', () => {
  let repository: TypeOrmBudgetRepository;
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

    repository = new TypeOrmBudgetRepository(ormRepository as any);
  });

  it('should save budget', async () => {
    const budget = { id: 'budget-1' };
    ormRepository.save.mockResolvedValueOnce(budget);

    const result = await repository.save(budget as any);

    expect(ormRepository.save).toHaveBeenCalledWith(budget);
    expect(result).toBe(budget);
  });

  it('should find budget by id with relations', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'budget-1' });

    const result = await repository.findById('budget-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'budget-1' },
      relations: ['company', 'resultCenter', 'createdByUser'],
    });
    expect(result).toMatchObject({ id: 'budget-1' });
  });

  it('should find all budgets ordered by creation date', async () => {
    ormRepository.find.mockResolvedValueOnce([]);

    await repository.findAll();

    expect(ormRepository.find).toHaveBeenCalledWith({
      relations: ['company', 'resultCenter', 'createdByUser'],
      order: { createdAt: 'DESC' },
    });
  });

  it('should paginate budgets with optional filters', async () => {
    queryBuilder.getManyAndCount.mockResolvedValueOnce([[{ id: 'budget-1' }], 1]);

    const result = await repository.findAllPaginated(15, 3, 'company-1', 'OPEN');

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('budget');
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('budget.company', 'company');
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('budget.resultCenter', 'resultCenter');
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('budget.createdByUser', 'createdByUser');
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('budget.createdAt', 'DESC');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('budget.companyId = :companyId', {
      companyId: 'company-1',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('budget.status = :status', {
      status: 'OPEN',
    });
    expect(queryBuilder.skip).toHaveBeenCalledWith(3);
    expect(queryBuilder.take).toHaveBeenCalledWith(15);
    expect(result).toEqual({ items: [{ id: 'budget-1' }], total: 1 });
  });

  it('should update and reload a budget', async () => {
    ormRepository.update.mockResolvedValueOnce(undefined);
    ormRepository.findOne.mockResolvedValueOnce({ id: 'budget-1', status: 'OPEN' });

    const result = await repository.update('budget-1', { status: 'OPEN' } as any);

    expect(ormRepository.update).toHaveBeenCalledWith('budget-1', { status: 'OPEN' });
    expect(result).toMatchObject({ id: 'budget-1', status: 'OPEN' });
  });

  it('should throw when updated budget cannot be reloaded', async () => {
    ormRepository.update.mockResolvedValueOnce(undefined);
    ormRepository.findOne.mockResolvedValueOnce(null);

    await expect(repository.update('missing', {} as any)).rejects.toThrow(
      'Budget with id missing not found after update',
    );
  });
});