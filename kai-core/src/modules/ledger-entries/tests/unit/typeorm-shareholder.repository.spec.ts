import { TypeOrmShareholderRepository } from '@modules/ledger-entries/infrastructure/repositories/typeorm-shareholder.repository';

describe('TypeOrmShareholderRepository', () => {
  let repository: TypeOrmShareholderRepository;
  let ormRepository: {
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(() => {
    ormRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({ tag: 'qb' }),
    };

    repository = new TypeOrmShareholderRepository(ormRepository as any);
  });

  it('should find shareholder by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'shareholder-1' });

    const result = await repository.findById('shareholder-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'shareholder-1' } });
    expect(result).toMatchObject({ id: 'shareholder-1' });
  });

  it('should expose the repository query builder', () => {
    const result = repository.createQueryBuilder('shareholder');

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('shareholder');
    expect(result).toEqual({ tag: 'qb' });
  });
});