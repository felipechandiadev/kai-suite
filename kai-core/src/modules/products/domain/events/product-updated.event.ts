import { BaseDomainEvent } from '@shared/cqrs';

export class ProductUpdatedEvent extends BaseDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly name?: string,
    public readonly description?: string,
    public readonly isActive?: boolean,
  ) {
    super();
    this.aggregateType = 'Product';
  }
}
