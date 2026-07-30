import { Permission } from '../../domain/permission.entity';
import { PermissionCreatedEvent } from '../../domain/events/permission-created.event';
import { PermissionUpdatedEvent } from '../../domain/events/permission-updated.event';
import { PermissionRemovedEvent } from '../../domain/events/permission-removed.event';

describe('Permission Entity', () => {
  describe('create', () => {
    it('should create a permission with required fields', () => {
      const permission = Permission.create('1', 'read:users', 'user-1');

      expect(permission.id).toBe('1');
      expect(permission.ability).toBe('read:users');
      expect(permission.userId).toBe('user-1');
      expect(permission.description).toBeUndefined();
      expect(permission.domainEvents).toHaveLength(1);
      expect(permission.domainEvents[0]).toBeInstanceOf(PermissionCreatedEvent);
    });

    it('should create a permission with description', () => {
      const permission = Permission.create(
        '1',
        'read:users',
        'user-1',
        'Can read users',
      );

      expect(permission.description).toBe('Can read users');
    });

    it('should create a permission without userId', () => {
      const permission = Permission.create('1', 'read:users');

      expect(permission.userId).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update description and emit event', () => {
      const permission = Permission.create('1', 'read:users', 'user-1');

      permission.update('Updated description');

      expect(permission.description).toBe('Updated description');
      expect(permission.domainEvents).toHaveLength(2);
      expect(permission.domainEvents[1]).toBeInstanceOf(PermissionUpdatedEvent);
    });

    it('should update with undefined description', () => {
      const permission = Permission.create(
        '1',
        'read:users',
        'user-1',
        'Old description',
      );

      permission.update(undefined);

      expect(permission.description).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should emit remove event', () => {
      const permission = Permission.create('1', 'read:users', 'user-1');

      permission.remove();

      expect(permission.domainEvents).toHaveLength(2);
      expect(permission.domainEvents[1]).toBeInstanceOf(PermissionRemovedEvent);
    });
  });

  describe('business logic', () => {
    it('should check if can perform ability', () => {
      const permission = Permission.create('1', 'read:users', 'user-1');

      expect(permission.canPerformAbility('read:users')).toBe(true);
      expect(permission.canPerformAbility('write:users')).toBe(false);
    });

    it('should check if belongs to user', () => {
      const permission = Permission.create('1', 'read:users', 'user-1');

      expect(permission.belongsToUser('user-1')).toBe(true);
      expect(permission.belongsToUser('user-2')).toBe(false);
    });

    it('should return false for belongsToUser when no userId', () => {
      const permission = Permission.create('1', 'read:users');

      expect(permission.belongsToUser('user-1')).toBe(false);
    });
  });
});
