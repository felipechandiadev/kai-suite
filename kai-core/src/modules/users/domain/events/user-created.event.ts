import { BaseDomainEvent } from '@shared/cqrs';

export class UserCreatedEvent extends BaseDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly userName: string,
    public readonly mail: string,
    public readonly personId?: string,
    public readonly role: string = 'OPERATOR',
  ) {
    super();
    this.aggregateType = 'User';
  }
}
