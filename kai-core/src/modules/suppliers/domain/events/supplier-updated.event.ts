import { BaseDomainEvent } from '@shared/cqrs';

export class SupplierUpdatedEvent extends BaseDomainEvent {
  readonly supplierType?: string;
  readonly alias?: string;
  readonly defaultPaymentTermDays?: number;
  readonly isActive?: boolean;
  readonly notes?: string;

  constructor(
    supplierType?: string,
    alias?: string,
    defaultPaymentTermDays?: number,
    isActive?: boolean,
    notes?: string,
  ) {
    super();
    this.supplierType = supplierType;
    this.alias = alias;
    this.defaultPaymentTermDays = defaultPaymentTermDays;
    this.isActive = isActive;
    this.notes = notes;
    this.aggregateType = 'Supplier';
  }
}
