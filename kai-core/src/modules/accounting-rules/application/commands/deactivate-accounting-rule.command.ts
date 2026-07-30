import { Command } from '@nestjs/cqrs';

export class DeactivateAccountingRuleCommand extends Command<void> {
  constructor(public readonly id: string) {
    super();
  }
}
