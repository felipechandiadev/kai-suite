import { TypeOrmHealthMetricRepository } from '@modules/health/infrastructure/repositories/typeorm-health-metric.repository';

describe('TypeOrmHealthMetricRepository', () => {
  let repository: TypeOrmHealthMetricRepository;
  let ormRepository: {
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
    update: jest.Mock;
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
      update: jest.fn(),
      findOneOrFail: jest.fn(),
    };

    repository = new TypeOrmHealthMetricRepository(ormRepository as any);
  });

  it('should save health metric', async () => {
    const metric = { id: 'hm-1' };
    ormRepository.save.mockResolvedValueOnce(metric);

    const result = await repository.save(metric as any);

    expect(ormRepository.save).toHaveBeenCalledWith(metric);
    expect(result).toBe(metric);
  });

  it('should find health metric by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'hm-1' });

    const result = await repository.findById('hm-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'hm-1' } });
    expect(result).toMatchObject({ id: 'hm-1' });
  });

  it('should list health metrics ordered by creation date', async () => {
    ormRepository.find.mockResolvedValueOnce([]);

    await repository.findAll();

    expect(ormRepository.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
  });

  it('should paginate and filter health metrics by service', async () => {
    queryBuilder.getManyAndCount.mockResolvedValueOnce([[{ id: 'hm-1' }], 1]);

    const result = await repository.findAllPaginated(5, 1, 'api');

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('metric');
    expect(queryBuilder.where).toHaveBeenCalledWith('metric.service = :service', {
      service: 'api',
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('metric.createdAt', 'DESC');
    expect(queryBuilder.limit).toHaveBeenCalledWith(5);
    expect(queryBuilder.offset).toHaveBeenCalledWith(1);
    expect(result).toEqual({ items: [{ id: 'hm-1' }], total: 1 });
  });

  it('should update and reload health metric', async () => {
    ormRepository.update.mockResolvedValueOnce(undefined);
    ormRepository.findOneOrFail.mockResolvedValueOnce({ id: 'hm-1', service: 'api' });

    const result = await repository.update('hm-1', { service: 'api' } as any);

    expect(ormRepository.update).toHaveBeenCalledWith('hm-1', { service: 'api' });
    expect(ormRepository.findOneOrFail).toHaveBeenCalledWith({ where: { id: 'hm-1' } });
    expect(result).toMatchObject({ id: 'hm-1', service: 'api' });
  });
});