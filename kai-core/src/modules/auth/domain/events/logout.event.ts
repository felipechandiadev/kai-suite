import { BaseDomainEvent } from '@shared/cqrs';

export class LogoutEvent extends BaseDomainEvent {
  constructor(public readonly userId: string) {
    super();
    this.aggregateType = 'Auth';
  }
}
