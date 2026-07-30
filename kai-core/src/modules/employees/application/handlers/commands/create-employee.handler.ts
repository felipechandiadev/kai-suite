import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateEmployeeCommand } from '@modules/employees/application/commands/create-employee.command';
import { EmployeeRepositoryPort } from '@modules/employees/application/ports/employee.repository.port';
import { Employee } from '@modules/employees/domain/employee.entity';

@CommandHandler(CreateEmployeeCommand)
export class CreateEmployeeCommandHandler implements ICommandHandler<CreateEmployeeCommand> {
  constructor(
    @Inject('EmployeeRepositoryPort')
    private readonly employeeRepository: EmployeeRepositoryPort,
  ) {}

  async execute(command: CreateEmployeeCommand): Promise<Employee> {
    return this.employeeRepository.createEmployee(command);
  }
}
