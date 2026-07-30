import { BaseDomainEvent } from '@shared/cqrs';

export class LoginEvent extends BaseDomainEvent {
  constructor(
    public readonly userId: string,
    public readonly userName: string,
    public readonly userRole: string,
  ) {
    super();
    this.aggregateType = 'Auth';
  }
}
