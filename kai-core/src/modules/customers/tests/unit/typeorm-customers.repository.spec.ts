import { TypeOrmCustomersRepository } from '@modules/customers/infrastructure/repositories/typeorm-customers.repository';

describe('TypeOrmCustomersRepository', () => {
  let repository: TypeOrmCustomersRepository;
  let customerRepository: {
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let personRepository: {
    findOne: jest.Mock;
  };
  let transactionRepository: {
    find: jest.Mock;
  };
  let queryBuilder: {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    customerRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      update: jest.fn(),
      delete: jest.fn(),
    };
    personRepository = { findOne: jest.fn() };
    transactionRepository = { find: jest.fn() };

    repository = new TypeOrmCustomersRepository(
      customerRepository as any,
      personRepository as any,
      transactionRepository as any,
    );
  });

  it('should find all customers with active filter and relations', async () => {
    customerRepository.find.mockResolvedValueOnce([]);

    await repository.findAll({ isActive: true });

    expect(customerRepository.find).toHaveBeenCalledWith({
      where: { isActive: true },
      relations: ['person'],
      order: { createdAt: 'DESC' },
    });
  });

  it('should paginate customers with search query', async () => {
    queryBuilder.getManyAndCount.mockResolvedValueOnce([[{ id: 'customer-1' }], 1]);

    const result = await repository.findAllWithPagination({ searchQuery: 'Ana' }, 2, 25);

    expect(customerRepository.createQueryBuilder).toHaveBeenCalledWith('c');
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('c.person', 'person');
    expect(queryBuilder.where).toHaveBeenCalledWith('1=1');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining(
        "unaccent(COALESCE(person.firstName, '')) ILIKE unaccent(:q)",
      ),
      { q: '%Ana%' },
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('c.createdAt', 'DESC');
    expect(queryBuilder.skip).toHaveBeenCalledWith(25);
    expect(queryBuilder.take).toHaveBeenCalledWith(25);
    expect(result).toEqual({ customers: [{ id: 'customer-1' }], total: 1 });
  });

  it('should resolve customer by document number when person exists', async () => {
    personRepository.findOne.mockResolvedValueOnce({ id: 'person-1' });
    customerRepository.findOne.mockResolvedValueOnce({ id: 'customer-1', personId: 'person-1' });

    const result = await repository.findByDocumentNumber('123');

    expect(personRepository.findOne).toHaveBeenCalledWith({
      where: { documentNumber: '123' },
      withDeleted: true,
    });
    expect(customerRepository.findOne).toHaveBeenCalledWith({
      where: { personId: 'person-1' },
      withDeleted: true,
    });
    expect(result).toMatchObject({ id: 'customer-1' });
  });

  it('should return null by document number when person is missing', async () => {
    personRepository.findOne.mockResolvedValueOnce(null);

    const result = await repository.findByDocumentNumber('404');

    expect(result).toBeNull();
  });

  it('should update and reload a customer', async () => {
    customerRepository.update.mockResolvedValueOnce(undefined);
    customerRepository.findOne.mockResolvedValueOnce({ id: 'customer-1', isActive: true });

    const result = await repository.update('customer-1', { isActive: true });

    expect(customerRepository.update).toHaveBeenCalledWith('customer-1', { isActive: true });
    expect(result).toMatchObject({ id: 'customer-1', isActive: true });
  });

  it('should soft delete by marking the customer inactive', async () => {
    const customer = { id: 'customer-1', isActive: true };
    customerRepository.findOne.mockResolvedValueOnce(customer);
    customerRepository.save.mockResolvedValueOnce({ ...customer, isActive: false });

    await repository.softDelete('customer-1');

    expect(customer.isActive).toBe(false);
    expect(customerRepository.save).toHaveBeenCalledWith(customer);
  });

  it('should return recent transactions for a customer', async () => {
    transactionRepository.find.mockResolvedValueOnce([{ id: 'tx-1' }]);

    const result = await repository.getTransactions('customer-1');

    expect(transactionRepository.find).toHaveBeenCalledWith({
      where: { customerId: 'customer-1' },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    expect(result).toEqual([{ id: 'tx-1' }]);
  });

  it('should calculate available credit from current balance', async () => {
    customerRepository.findOne.mockResolvedValueOnce({
      id: 'customer-1',
      creditLimit: 1000,
      currentBalance: 350,
    });

    const result = await repository.calculateAvailableCredit('customer-1');

    expect(result).toEqual({ creditLimit: 1000, usedCredit: 350, availableCredit: 650 });
  });
});