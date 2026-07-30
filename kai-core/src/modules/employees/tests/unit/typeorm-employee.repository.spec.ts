import { TypeOrmEmployeeRepository } from '@modules/employees/infrastructure/repositories/typeorm-employee.repository';
import {
  EmployeeStatus,
  EmploymentType,
} from '@modules/employees/domain/employee.entity';

describe('TypeOrmEmployeeRepository', () => {
  let repository: TypeOrmEmployeeRepository;
  let employeeRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let companyRepository: {
    findOne: jest.Mock;
  };
  let queryBuilder: {
    leftJoinAndSelect: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    employeeRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    companyRepository = {
      findOne: jest.fn(),
    };

    repository = new TypeOrmEmployeeRepository(employeeRepository as any, companyRepository as any);
  });

  it('should create employee using first company when companyId is missing', async () => {
    companyRepository.findOne.mockResolvedValueOnce({ id: 'company-1' });
    employeeRepository.create.mockReturnValueOnce({ id: 'emp-1' });
    employeeRepository.save.mockResolvedValueOnce({ id: 'emp-1' });
    employeeRepository.findOne.mockResolvedValueOnce({
      id: 'emp-1',
      companyId: 'company-1',
      personId: 'person-1',
      branchId: null,
      resultCenterId: null,
      organizationalUnitId: null,
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2026-01-01',
      terminationDate: null,
      baseSalary: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    const result = await repository.createEmployee({
      personId: 'person-1',
      employmentType: '',
      hireDate: '2026-01-01',
    });

    expect(companyRepository.findOne).toHaveBeenCalledWith({
      where: {},
      order: { createdAt: 'ASC' },
    });
    expect(employeeRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        personId: 'person-1',
        companyId: 'company-1',
        employmentType: EmploymentType.FULL_TIME,
        status: EmployeeStatus.ACTIVE,
      }),
    );
    expect(result).toMatchObject({ id: 'emp-1', companyId: 'company-1' });
  });

  it('should throw when creating employee without any company available', async () => {
    companyRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      repository.createEmployee({
        personId: 'person-1',
        employmentType: EmploymentType.FULL_TIME,
        hireDate: '2026-01-01',
      }),
    ).rejects.toThrow('No company found. Please create a company first.');
  });

  it('should update employee and reload it', async () => {
    employeeRepository.update.mockResolvedValueOnce(undefined);
    employeeRepository.findOne.mockResolvedValueOnce({
      id: 'emp-1',
      companyId: 'company-1',
      personId: 'person-1',
      branchId: 'branch-1',
      resultCenterId: null,
      organizationalUnitId: null,
      employmentType: EmploymentType.PART_TIME,
      status: EmployeeStatus.SUSPENDED,
      hireDate: '2026-01-01',
      terminationDate: null,
      baseSalary: '1000',
      metadata: { note: 'x' },
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    const result = await repository.updateEmployee({
      id: 'emp-1',
      branchId: 'branch-1',
      employmentType: EmploymentType.PART_TIME,
      status: EmployeeStatus.SUSPENDED,
      baseSalary: '1000',
      metadata: { note: 'x' },
    });

    expect(employeeRepository.update).toHaveBeenCalledWith('emp-1', {
      branchId: 'branch-1',
      employmentType: EmploymentType.PART_TIME,
      status: EmployeeStatus.SUSPENDED,
      baseSalary: '1000',
      metadata: { note: 'x' },
    });
    expect(result).toMatchObject({ id: 'emp-1', status: EmployeeStatus.SUSPENDED });
  });

  it('should soft delete employee', async () => {
    employeeRepository.softDelete.mockResolvedValueOnce(undefined);

    const result = await repository.deleteEmployee('emp-1');

    expect(employeeRepository.softDelete).toHaveBeenCalledWith('emp-1');
    expect(result).toEqual({ success: true });
  });

  it('should find employee by id with relations', async () => {
    employeeRepository.findOne.mockResolvedValueOnce({
      id: 'emp-1',
      companyId: 'company-1',
      personId: 'person-1',
      branchId: null,
      resultCenterId: null,
      organizationalUnitId: null,
      employmentType: EmploymentType.FULL_TIME,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2026-01-01',
      terminationDate: null,
      baseSalary: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    const result = await repository.findEmployeeById('emp-1');

    expect(employeeRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'emp-1' },
      relations: ['company', 'person', 'branch', 'resultCenter', 'organizationalUnit'],
    });
    expect(result).toMatchObject({ id: 'emp-1' });
  });

  it('should filter active employees by default', async () => {
    queryBuilder.getMany.mockResolvedValueOnce([]);

    await repository.findAllEmployees({});

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('employee.status != :terminated', {
      terminated: EmployeeStatus.TERMINATED,
    });
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('person.firstName', 'ASC');
    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('person.lastName', 'ASC');
  });

  it('should apply explicit filters when listing employees', async () => {
    queryBuilder.getMany.mockResolvedValueOnce([
      {
        id: 'emp-1',
        companyId: 'company-1',
        personId: 'person-1',
        branchId: 'branch-1',
        resultCenterId: null,
        organizationalUnitId: null,
        employmentType: EmploymentType.CONTRACTOR,
        status: EmployeeStatus.ACTIVE,
        hireDate: '2026-01-01',
        terminationDate: null,
        baseSalary: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);

    const result = await repository.findAllEmployees({
      status: EmployeeStatus.ACTIVE,
      branchId: 'branch-1',
      companyId: 'company-1',
      includeTerminated: true,
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('employee.status = :status', {
      status: EmployeeStatus.ACTIVE,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('employee.branchId = :branchId', {
      branchId: 'branch-1',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('employee.companyId = :companyId', {
      companyId: 'company-1',
    });
    expect(result[0]).toMatchObject({ id: 'emp-1', companyId: 'company-1' });
  });
});