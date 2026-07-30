import { BaseCommand } from '@shared/cqrs';

export class CreateMultiplePaymentsCommand extends BaseCommand {
  constructor(
    public readonly saleTransactionId: string,
    public readonly payments: Array<any>,
    public readonly userId: string,
  ) {
    super();
  }
}
