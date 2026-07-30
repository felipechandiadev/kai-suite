export interface DomainEvent {
  getAggregateId(): string;
  occurredOn?: Date;
}
