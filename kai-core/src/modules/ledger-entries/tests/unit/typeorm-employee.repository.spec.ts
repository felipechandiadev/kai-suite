import { TypeOrmEmployeeRepository } from '@modules/ledger-entries/infrastructure/repositories/typeorm-employee.repository';

describe('LedgerEntries TypeOrmEmployeeRepository', () => {
  let repository: TypeOrmEmployeeRepository;
  let ormRepository: {
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(() => {
    ormRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({ tag: 'qb' }),
    };

    repository = new TypeOrmEmployeeRepository(ormRepository as any);
  });

  it('should find employee by id', async () => {
    ormRepository.findOne.mockResolvedValueOnce({ id: 'employee-1' });

    const result = await repository.findById('employee-1');

    expect(ormRepository.findOne).toHaveBeenCalledWith({ where: { id: 'employee-1' } });
    expect(result).toMatchObject({ id: 'employee-1' });
  });

  it('should expose the repository query builder', () => {
    const result = repository.createQueryBuilder('employee');

    expect(ormRepository.createQueryBuilder).toHaveBeenCalledWith('employee');
    expect(result).toEqual({ tag: 'qb' });
  });
});