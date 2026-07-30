import { BaseDomainEvent } from '@shared/cqrs';

export class ProductRemovedEvent extends BaseDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly reason?: string,
  ) {
    super();
    this.aggregateType = 'Product';
  }
}
