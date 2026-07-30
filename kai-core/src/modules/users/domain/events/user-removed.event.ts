import { BaseDomainEvent } from '@shared/cqrs';

export class UserRemovedEvent extends BaseDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly reason?: string,
  ) {
    super();
    this.aggregateType = 'User';
  }
}
