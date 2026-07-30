import { BaseDomainEvent } from '@shared/cqrs';

export class CategoryCreatedEvent extends BaseDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly name: string,
    public readonly code?: string,
    public readonly description?: string,
    public readonly parentId?: string,
  ) {
    super();
    this.aggregateType = 'Category';
  }
}
