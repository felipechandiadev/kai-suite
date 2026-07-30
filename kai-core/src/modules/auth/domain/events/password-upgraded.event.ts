import { BaseDomainEvent } from '@shared/cqrs';

export class PasswordUpgradedEvent extends BaseDomainEvent {
  constructor(public readonly userId: string) {
    super();
    this.aggregateType = 'Auth';
  }
}
