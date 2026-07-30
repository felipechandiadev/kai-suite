import { BaseDomainEvent } from '@shared/cqrs';

export class UserUpdatedEvent extends BaseDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly mail?: string,
    public readonly role?: string,
    public readonly isActive?: boolean,
  ) {
    super();
    this.aggregateType = 'User';
  }
}
