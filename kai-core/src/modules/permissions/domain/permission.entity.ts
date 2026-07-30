import { BaseEntity } from '@shared/domain/base.entity';
import { PermissionCreatedEvent } from './events/permission-created.event';
import { PermissionUpdatedEvent } from './events/permission-updated.event';
import { PermissionRemovedEvent } from './events/permission-removed.event';

export class Permission extends BaseEntity {
  private _userId?: string;
  private _ability: string;
  private _description?: string;

  constructor(
    id: string,
    ability: string,
    userId?: string,
    description?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._ability = ability;
    this._userId = userId;
    this._description = description;
  }

  static create(
    id: string,
    ability: string,
    userId?: string,
    description?: string,
  ): Permission {
    const permission = new Permission(id, ability, userId, description);
    permission.addDomainEvent(new PermissionCreatedEvent(id, ability, userId));
    return permission;
  }

  update(description?: string): void {
    this._description = description;
    this.updatedAt = new Date();
    this.addDomainEvent(
      new PermissionUpdatedEvent(this.id, this._ability, this._userId),
    );
  }

  remove(): void {
    this.addDomainEvent(
      new PermissionRemovedEvent(this.id, this._ability, this._userId),
    );
  }

  // Getters
  get userId(): string | undefined {
    return this._userId;
  }

  get ability(): string {
    return this._ability;
  }

  get description(): string | undefined {
    return this._description;
  }

  // Business logic
  canPerformAbility(ability: string): boolean {
    return this._ability === ability;
  }

  belongsToUser(userId: string): boolean {
    return this._userId === userId;
  }
}
