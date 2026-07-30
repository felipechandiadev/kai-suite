import { TypeOrmUserRepository } from '@modules/users/infrastructure/repositories/typeorm-user.repository';

describe('TypeOrmUserRepository', () => {
  let repository: TypeOrmUserRepository;
  let ormRepository: {
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
    softDelete: jest.Mock;
  };
  let queryBuilder: {
    leftJoinAndSelect: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    take: jest.Mock;
    skip: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    ormRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      softDelete: jest.fn(),
    };

    repository = new TypeOrmUserRepository(ormRepository as any);
  });

  it('should save user', async () => {
    const user = { id: 'user-1', userName: 'john' };
    ormRepository.save.mockResolvedValueOnce(user);

    const result = await repository.save(user as any);

    expect(ormRepository.save).toHaveBeenCalledWith(user);
    expect(result).toBe(user);
  });

  it('should find user by id with person relation', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'user-1' });

    const result = await repository.findById('user-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      relations: ['person'],
    });
    expect(result).toMatchObject({ id: 'user-1' });
  });

  it('should find user by username with soft-delete filter', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'user-1', userName: 'john' });

    const result = await repository.findByUsername('john');

    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { userName: 'john', deletedAt: null as any },
      relations: ['person'],
    });
    expect(result).toMatchObject({ id: 'user-1', userName: 'john' });
  });

  it('should search and paginate users', async () => {
    queryBuilder.getManyAndCount.mockResolvedValueOnce([[{ id: 'user-1' }], 1]);

    const result = await repository.findAll({ search: 'john', limit: 25, offset: 5 });

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('user.person', 'person');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      `(
          LOWER(user.userName) LIKE :q OR
          LOWER(user.mail) LIKE :q OR
          LOWER(person.firstName) LIKE :q OR
          LOWER(person.lastName) LIKE :q OR
          LOWER(person.businessName) LIKE :q OR
          LOWER(person.documentNumber) LIKE :q
        )`,
      { q: '%john%' },
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('user.userName', 'ASC');
    expect(queryBuilder.take).toHaveBeenCalledWith(25);
    expect(queryBuilder.skip).toHaveBeenCalledWith(5);
    expect(result).toEqual({ data: [{ id: 'user-1' }], total: 1 });
  });

  it('should use default paging when not provided and omit search filter', async () => {
    queryBuilder.getManyAndCount.mockResolvedValueOnce([[], 0]);

    const result = await repository.findAll({});

    expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    expect(queryBuilder.take).toHaveBeenCalledWith(50);
    expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    expect(result).toEqual({ data: [], total: 0 });
  });

  it('should soft delete user by id', async () => {
    ormRepository.softDelete.mockResolvedValueOnce(undefined);

    await repository.delete('user-1');

    expect(ormRepository.softDelete).toHaveBeenCalledWith('user-1');
  });
});