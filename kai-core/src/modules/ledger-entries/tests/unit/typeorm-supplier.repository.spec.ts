import { TypeOrmSupplierRepository } from '@modules/ledger-entries/infrastructure/repositories/typeorm-supplier.repository';

describe('TypeOrmSupplierRepository', () => {
  let repository: TypeOrmSupplierRepository;
  let ormRepository: {
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(() => {
    ormRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({ tag: 'qb' }),
    };

    repository = new TypeOrmSupplierRepository(ormRepository as any);
  });

  it('should find supplier by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'supplier-1' });

    const result = await repository.findById('supplier-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'supplier-1' } });
    expect(result).toMatchObject({ id: 'supplier-1' });
  });

  it('should expose the repository query builder', () => {
    const result = repository.createQueryBuilder('supplier');

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('supplier');
    expect(result).toEqual({ tag: 'qb' });
  });
});