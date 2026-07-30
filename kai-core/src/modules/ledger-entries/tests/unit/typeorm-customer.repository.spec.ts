import { TypeOrmCustomerRepository } from '@modules/ledger-entries/infrastructure/repositories/typeorm-customer.repository';

describe('TypeOrmCustomerRepository', () => {
  let repository: TypeOrmCustomerRepository;
  let ormRepository: {
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(() => {
    ormRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({ tag: 'qb' }),
    };

    repository = new TypeOrmCustomerRepository(ormRepository as any);
  });

  it('should find customer by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'customer-1' });

    const result = await repository.findById('customer-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'customer-1' } });
    expect(result).toMatchObject({ id: 'customer-1' });
  });

  it('should expose the repository query builder', () => {
    const result = repository.createQueryBuilder('customer');

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('customer');
    expect(result).toEqual({ tag: 'qb' });
  });
});