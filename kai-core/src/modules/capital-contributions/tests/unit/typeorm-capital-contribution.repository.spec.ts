import { TypeOrmCapitalContributionRepository } from '@modules/capital-contributions/infrastructure/repositories/typeorm-capital-contribution.repository';

describe('TypeOrmCapitalContributionRepository', () => {
  let repository: TypeOrmCapitalContributionRepository;
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

    repository = new TypeOrmCapitalContributionRepository(ormRepository as any);
  });

  it('should save capital contribution', async () => {
    const contribution = { id: 'cc-1' };
    ormRepository.save.mockResolvedValueOnce(contribution);

    const result = await repository.save(contribution as any);

    expect(ormRepository.save).toHaveBeenCalledWith(contribution);
    expect(result).toBe(contribution);
  });

  it('should find capital contribution by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'cc-1' });

    const result = await repository.findById('cc-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'cc-1' } });
    expect(result).toMatchObject({ id: 'cc-1' });
  });

  it('should list all capital contributions ordered by creation date', async () => {
    ormRepository.find.mockResolvedValueOnce([]);

    await repository.findAll();

    expect(ormRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    });
  });

  it('should paginate and filter contributions by status', async () => {
    queryBuilder.getManyAndCount.mockResolvedValueOnce([[{ id: 'cc-1' }], 1]);

    const result = await repository.findAllPaginated(8, 2, 'APPROVED');

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('contribution');
    expect(queryBuilder.where).toHaveBeenCalledWith('contribution.status = :status', {
      status: 'APPROVED',
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('contribution.createdAt', 'DESC');
    expect(queryBuilder.limit).toHaveBeenCalledWith(8);
    expect(queryBuilder.offset).toHaveBeenCalledWith(2);
    expect(result).toEqual({ items: [{ id: 'cc-1' }], total: 1 });
  });

  it('should update an existing contribution', async () => {
    const entity = { id: 'cc-1', status: 'PENDING' };
    ormRepository.findOneOrFail.mockResolvedValueOnce(entity);
    ormRepository.save.mockResolvedValueOnce({ ...entity, status: 'DONE' });

    const result = await repository.update('cc-1', { status: 'DONE' } as any);

    expect(ormRepository.findOneOrFail).toHaveBeenCalledWith({ where: { id: 'cc-1' } });
    expect(ormRepository.save).toHaveBeenCalledWith({ id: 'cc-1', status: 'DONE' });
    expect(result).toMatchObject({ id: 'cc-1', status: 'DONE' });
  });
});