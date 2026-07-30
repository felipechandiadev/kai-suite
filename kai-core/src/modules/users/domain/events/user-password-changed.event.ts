import { BaseDomainEvent } from '@shared/cqrs';

export class UserPasswordChangedEvent extends BaseDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly passwordHash?: string,
  ) {
    super();
    this.aggregateType = 'User';
  }
}
