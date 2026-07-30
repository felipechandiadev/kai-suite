import { BaseCommand } from '@shared/cqrs';

export class PayQuotaCommand extends BaseCommand {
  constructor(
    public readonly paymentId: string,
    public readonly amount: number,
    public readonly userId: string,
    public readonly method?: string,
  ) {
    super();
  }
}
