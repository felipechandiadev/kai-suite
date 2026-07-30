import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DeleteEmployeeCommand } from '@modules/employees/application/commands/delete-employee.command';
import { EmployeeRepositoryPort } from '@modules/employees/application/ports/employee.repository.port';

@CommandHandler(DeleteEmployeeCommand)
export class DeleteEmployeeCommandHandler implements ICommandHandler<DeleteEmployeeCommand> {
  constructor(
    @Inject('EmployeeRepositoryPort')
    private readonly employeeRepository: EmployeeRepositoryPort,
  ) {}

  async execute(command: DeleteEmployeeCommand): Promise<{ success: true }> {
    return this.employeeRepository.deleteEmployee(command.id);
  }
}
