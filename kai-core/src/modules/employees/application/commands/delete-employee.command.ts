import { BaseCommand } from '@shared/cqrs';

export class DeleteEmployeeCommand extends BaseCommand {
  constructor(readonly id: string) {
    super();
  }
}
