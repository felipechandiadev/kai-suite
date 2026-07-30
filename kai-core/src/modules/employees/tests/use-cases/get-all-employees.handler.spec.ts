import { Test, TestingModule } from '@nestjs/testing';
import { GetAllEmployeesQueryHandler } from '../../application/handlers/queries/get-all-employees.handler';
import { GetAllEmployeesQuery } from '../../application/queries/get-all-employees.query';
import { EmployeeRepositoryPort } from '../../application/ports/employee.repository.port';
import {
  Employee,
  EmployeeStatus,
  EmploymentType,
  WorkRegime,
} from '../../domain/employee.entity';

describe('GetAllEmployeesQueryHandler', () => {
  let handler: GetAllEmployeesQueryHandler;
  let employeeRepositoryMock: jest.Mocked<EmployeeRepositoryPort>;

  beforeEach(async () => {
    employeeRepositoryMock = {
      createEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      deleteEmployee: jest.fn(),
      findEmployeeById: jest.fn(),
      findAllEmployees: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllEmployeesQueryHandler,
        {
          provide: 'EmployeeRepositoryPort',
          useValue: employeeRepositoryMock,
        },
      ],
    }).compile();

    handler = module.get<GetAllEmployeesQueryHandler>(
      GetAllEmployeesQueryHandler,
    );
  });

  it('should query employees through the repository port', async () => {
    const employee: Employee = {
      id: 'emp-2',
      companyId: 'comp-1',
      personId: 'person-1',
      branchId: null,
      resultCenterId: null,
      organizationalUnitId: null,
      employmentType: EmploymentType.FULL_TIME,
      workRegime: WorkRegime.ORDINARY,
      status: EmployeeStatus.ACTIVE,
      hireDate: '2026-04-19',
      terminationDate: null,
      baseSalary: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: undefined,
    };

    employeeRepositoryMock.findAllEmployees.mockResolvedValue([employee]);

    const query = new GetAllEmployeesQuery(
      false,
      undefined,
      undefined,
      undefined,
    );
    const result = await handler.execute(query);

    expect(employeeRepositoryMock.findAllEmployees).toHaveBeenCalledTimes(1);
    expect(employeeRepositoryMock.findAllEmployees).toHaveBeenCalledWith({
      includeTerminated: false,
      status: undefined,
      branchId: undefined,
      companyId: undefined,
    });
    expect(result).toEqual([employee]);
  });
});
