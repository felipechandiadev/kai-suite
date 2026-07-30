import { BaseDomainEvent } from '@shared/cqrs';

export class PermissionUpdatedEvent extends BaseDomainEvent {
  constructor(
    public readonly permissionId: string,
    public readonly ability: string,
    public readonly userId?: string,
  ) {
    super();
    this.aggregateId = permissionId;
  }

  getAggregateId(): string {
    return this.permissionId;
  }
}
