import { BaseDomainEvent } from '@shared/cqrs';

export class SupplierCreatedEvent extends BaseDomainEvent {
  readonly supplierType: string;
  readonly personId: string;
  readonly alias?: string;
  readonly defaultPaymentTermDays: number;
  readonly isActive: boolean;

  constructor(
    supplierType: string,
    personId: string,
    defaultPaymentTermDays: number,
    alias?: string,
    isActive: boolean = true,
  ) {
    super();
    this.supplierType = supplierType;
    this.personId = personId;
    this.defaultPaymentTermDays = defaultPaymentTermDays;
    this.alias = alias;
    this.isActive = isActive;
    this.aggregateType = 'Supplier';
  }
}
