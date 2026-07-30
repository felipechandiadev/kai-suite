import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetAllEmployeesQuery } from '@modules/employees/application/queries/get-all-employees.query';
import { EmployeeRepositoryPort } from '@modules/employees/application/ports/employee.repository.port';
import { Employee } from '@modules/employees/domain/employee.entity';

@QueryHandler(GetAllEmployeesQuery)
export class GetAllEmployeesQueryHandler implements IQueryHandler<GetAllEmployeesQuery> {
  constructor(
    @Inject('EmployeeRepositoryPort')
    private readonly employeeRepository: EmployeeRepositoryPort,
  ) {}

  async execute(query: GetAllEmployeesQuery): Promise<Employee[]> {
    return this.employeeRepository.findAllEmployees({
      includeTerminated: query.includeTerminated,
      status: query.status,
      branchId: query.branchId,
      companyId: query.companyId,
    });
  }
}
