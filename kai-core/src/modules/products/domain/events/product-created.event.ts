import { BaseDomainEvent } from '@shared/cqrs';

export class ProductCreatedEvent extends BaseDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly name: string,
    public readonly categoryId?: string,
    public readonly brand?: string,
    public readonly sku?: string,
  ) {
    super();
    this.aggregateType = 'Product';
  }
}
