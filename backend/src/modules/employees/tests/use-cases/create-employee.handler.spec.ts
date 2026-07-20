import { Test, TestingModule } from '@nestjs/testing';
import { CreateEmployeeCommandHandler } from '../../application/handlers/commands/create-employee.handler';
import { CreateEmployeeCommand } from '../../application/commands/create-employee.command';
import { EmployeeRepositoryPort } from '../../application/ports/employee.repository.port';
import {
  Employee,
  EmployeeStatus,
  EmploymentType,
  WorkRegime,
} from '../../domain/employee.entity';

describe('CreateEmployeeCommandHandler', () => {
  let handler: CreateEmployeeCommandHandler;
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
        CreateEmployeeCommandHandler,
        {
          provide: 'EmployeeRepositoryPort',
          useValue: employeeRepositoryMock,
        },
      ],
    }).compile();

    handler = module.get<CreateEmployeeCommandHandler>(
      CreateEmployeeCommandHandler,
    );
  });

  it('should create an employee through the repository port', async () => {
    const createdEmployee: Employee = {
      id: 'emp-1',
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

    employeeRepositoryMock.createEmployee.mockResolvedValue(createdEmployee);

    const command = new CreateEmployeeCommand(
      'person-1',
      'comp-1',
      undefined,
      undefined,
      undefined,
      undefined,
      EmploymentType.FULL_TIME,
      '2026-04-19',
      undefined,
      undefined,
    );

    const result = await handler.execute(command);

    expect(employeeRepositoryMock.createEmployee).toHaveBeenCalledTimes(1);
    expect(employeeRepositoryMock.createEmployee).toHaveBeenCalledWith(command);
    expect(result).toEqual(createdEmployee);
  });
});
