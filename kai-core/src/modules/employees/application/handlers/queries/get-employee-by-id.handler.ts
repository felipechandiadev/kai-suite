import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetEmployeeByIdQuery } from '@modules/employees/application/queries/get-employee-by-id.query';
import { EmployeeRepositoryPort } from '@modules/employees/application/ports/employee.repository.port';
import { Employee } from '@modules/employees/domain/employee.entity';

@QueryHandler(GetEmployeeByIdQuery)
export class GetEmployeeByIdQueryHandler implements IQueryHandler<GetEmployeeByIdQuery> {
  constructor(
    @Inject('EmployeeRepositoryPort')
    private readonly employeeRepository: EmployeeRepositoryPort,
  ) {}

  async execute(query: GetEmployeeByIdQuery): Promise<Employee | null> {
    return this.employeeRepository.findEmployeeById(query.id);
  }
}
