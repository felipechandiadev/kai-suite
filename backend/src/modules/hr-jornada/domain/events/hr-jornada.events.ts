import { BaseDomainEvent } from '@shared/cqrs/base.domain-event';

export class ShiftExceptionSettledEvent extends BaseDomainEvent {
  constructor(
    public readonly companyId: string,
    public readonly employeeId: string,
    public readonly exceptionId: string,
    public readonly exceptionType: string,
    public readonly minutes: number,
    public readonly amountCents: string,
    public readonly periodStart: string,
    public readonly periodEnd: string,
    public readonly workDate: string,
  ) {
    super();
    this.aggregateId = exceptionId;
    this.aggregateType = 'HrShiftException';
  }
}

export class OvertimeGeneratedEvent extends BaseDomainEvent {
  constructor(
    public readonly companyId: string,
    public readonly employeeId: string,
    public readonly assignmentId: string,
    public readonly overtimeMinutes: number,
    public readonly amountCents: string,
    public readonly periodStart: string,
    public readonly periodEnd: string,
    public readonly workDate: string,
  ) {
    super();
    this.aggregateId = assignmentId;
    this.aggregateType = 'HrShiftAssignment';
  }
}

export class CompensatoryRestCreditedEvent extends BaseDomainEvent {
  constructor(
    public readonly companyId: string,
    public readonly employeeId: string,
    public readonly ledgerEntryId: string,
    public readonly minutes: number,
    public readonly workDate: string,
  ) {
    super();
    this.aggregateId = ledgerEntryId;
    this.aggregateType = 'HrCompensatoryLedgerEntry';
  }
}

export class CompensatoryRestRedeemedEvent extends BaseDomainEvent {
  constructor(
    public readonly companyId: string,
    public readonly employeeId: string,
    public readonly ledgerEntryId: string,
    public readonly minutes: number,
  ) {
    super();
    this.aggregateId = ledgerEntryId;
    this.aggregateType = 'HrCompensatoryLedgerEntry';
  }
}
