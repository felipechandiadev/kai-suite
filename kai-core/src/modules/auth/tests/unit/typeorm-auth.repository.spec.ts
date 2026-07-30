import { TypeOrmAuthRepository } from '@modules/auth/infrastructure/repositories/typeorm-auth.repository';

describe('TypeOrmAuthRepository', () => {
  let repository: TypeOrmAuthRepository;
  let ormRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    ormRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    repository = new TypeOrmAuthRepository(ormRepository as any);
  });

  it('should find user by username with person relation and soft-delete filter', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'user-1', userName: 'john' });

    const result = await repository.findUserByUsername('john');

    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { userName: 'john', deletedAt: null as never },
      relations: ['person'],
    });
    expect(result).toMatchObject({ id: 'user-1', userName: 'john' });
  });

  it('should save user through orm repository', async () => {
    const user = { id: 'user-1', userName: 'john' };
    ormRepository.save.mockResolvedValueOnce(user);

    const result = await repository.saveUser(user as any);

    expect(ormRepository.save).toHaveBeenCalledWith(user);
    expect(result).toBe(user);
  });
});