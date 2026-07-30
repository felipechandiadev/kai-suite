import { BaseDomainEvent } from '@shared/cqrs';

export class CategoryRemovedEvent extends BaseDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly reason?: string,
  ) {
    super();
    this.aggregateType = 'Category';
  }
}
