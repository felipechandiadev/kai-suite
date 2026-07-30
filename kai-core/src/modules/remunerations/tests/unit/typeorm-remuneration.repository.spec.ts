import { TypeOrmRemunerationRepository } from '@modules/remunerations/infrastructure/repositories/typeorm-remuneration.repository';

describe('TypeOrmRemunerationRepository', () => {
  let repository: TypeOrmRemunerationRepository;
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

    repository = new TypeOrmRemunerationRepository(ormRepository as any);
  });

  it('should save remuneration', async () => {
    const remuneration = { id: 'rem-1' };
    ormRepository.save.mockResolvedValueOnce(remuneration);

    const result = await repository.save(remuneration as any);

    expect(ormRepository.save).toHaveBeenCalledWith(remuneration);
    expect(result).toBe(remuneration);
  });

  it('should find remuneration by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'rem-1' });

    const result = await repository.findById('rem-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'rem-1' } });
    expect(result).toMatchObject({ id: 'rem-1' });
  });

  it('should list all remunerations ordered by creation date', async () => {
    ormRepository.find.mockResolvedValueOnce([]);

    await repository.findAll();

    expect(ormRepository.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
  });

  it('should paginate and filter remunerations by status', async () => {
    queryBuilder.getManyAndCount.mockResolvedValueOnce([[{ id: 'rem-1' }], 1]);

    const result = await repository.findAllPaginated(10, 3, 'PAID');

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('remuneration');
    expect(queryBuilder.where).toHaveBeenCalledWith('remuneration.status = :status', {
      status: 'PAID',
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('remuneration.createdAt', 'DESC');
    expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    expect(queryBuilder.offset).toHaveBeenCalledWith(3);
    expect(result).toEqual({ items: [{ id: 'rem-1' }], total: 1 });
  });

  it('should update an existing remuneration', async () => {
    const entity = { id: 'rem-1', status: 'PENDING' };
    ormRepository.findOneOrFail.mockResolvedValueOnce(entity);
    ormRepository.save.mockResolvedValueOnce({ ...entity, status: 'PAID' });

    const result = await repository.update('rem-1', { status: 'PAID' } as any);

    expect(ormRepository.findOneOrFail).toHaveBeenCalledWith({ where: { id: 'rem-1' } });
    expect(ormRepository.save).toHaveBeenCalledWith({ id: 'rem-1', status: 'PAID' });
    expect(result).toMatchObject({ id: 'rem-1', status: 'PAID' });
  });
});