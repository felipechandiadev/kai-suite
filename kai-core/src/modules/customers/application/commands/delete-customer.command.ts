import { BaseCommand } from '@shared/cqrs';

export class DeleteCustomerCommand extends BaseCommand {
  constructor(
    public readonly customerId: string,
    public readonly userId: string,
  ) {
    super();
  }
}
