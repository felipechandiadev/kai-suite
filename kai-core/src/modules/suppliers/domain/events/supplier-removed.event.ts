import { BaseDomainEvent } from '@shared/cqrs';

export class SupplierRemovedEvent extends BaseDomainEvent {
  readonly reason?: string;

  constructor(reason?: string) {
    super();
    this.reason = reason;
    this.aggregateType = 'Supplier';
  }
}
