import { BaseCommand } from '@shared/cqrs';

export class FreezeBalancesForPeriodCommand extends BaseCommand {
  constructor(public readonly periodId: string) {
    super();
  }
}
