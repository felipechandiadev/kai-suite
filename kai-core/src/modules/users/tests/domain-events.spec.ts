import { UserCreatedEvent } from '../domain/events/user-created.event';
import { UserUpdatedEvent } from '../domain/events/user-updated.event';
import { UserRemovedEvent } from '../domain/events/user-removed.event';
import { UserPasswordChangedEvent } from '../domain/events/user-password-changed.event';

describe('User Domain Events', () => {
  describe('UserCreatedEvent', () => {
    it('should create event with required parameters', () => {
      const event = new UserCreatedEvent(
        'user-1',
        'john_doe',
        'john@example.com',
      );

      expect(event.aggregateId).toBe('user-1');
      expect(event.userName).toBe('john_doe');
      expect(event.mail).toBe('john@example.com');
      expect(event.role).toBe('OPERATOR');
      expect(event.aggregateType).toBe('User');
    });

    it('should create event with custom role', () => {
      const event = new UserCreatedEvent(
        'user-1',
        'john_doe',
        'john@example.com',
        undefined,
        'ADMIN',
      );

      expect(event.role).toBe('ADMIN');
    });

    it('should create event with person id', () => {
      const event = new UserCreatedEvent(
        'user-1',
        'john_doe',
        'john@example.com',
        'person-1',
        'MANAGER',
      );

      expect(event.personId).toBe('person-1');
    });

    it('should have default role OPERATOR when not specified', () => {
      const event = new UserCreatedEvent(
        'user-1',
        'john_doe',
        'john@example.com',
      );

      expect(event.role).toBe('OPERATOR');
    });

    it('should preserve email format exactly', () => {
      const email = 'user.name+tag@example.co.uk';
      const event = new UserCreatedEvent('user-1', 'john_doe', email);

      expect(event.mail).toBe(email);
    });
  });

  describe('UserUpdatedEvent', () => {
    it('should create event with aggregateId only', () => {
      const event = new UserUpdatedEvent('user-1');

      expect(event.aggregateId).toBe('user-1');
      expect(event.aggregateType).toBe('User');
    });

    it('should create event with updated email', () => {
      const event = new UserUpdatedEvent('user-1', 'newemail@example.com');

      expect(event.mail).toBe('newemail@example.com');
    });

    it('should create event with updated role', () => {
      const event = new UserUpdatedEvent('user-1', undefined, 'ADMIN');

      expect(event.role).toBe('ADMIN');
    });

    it('should create event with updated isActive flag', () => {
      const event = new UserUpdatedEvent('user-1', undefined, undefined, false);

      expect(event.isActive).toBe(false);
    });

    it('should create event with all update parameters', () => {
      const event = new UserUpdatedEvent(
        'user-1',
        'updated@example.com',
        'SUPERVISOR',
        true,
      );

      expect(event.mail).toBe('updated@example.com');
      expect(event.role).toBe('SUPERVISOR');
      expect(event.isActive).toBe(true);
    });
  });

  describe('UserRemovedEvent', () => {
    it('should create event with aggregateId only', () => {
      const event = new UserRemovedEvent('user-1');

      expect(event.aggregateId).toBe('user-1');
      expect(event.aggregateType).toBe('User');
    });

    it('should create event with removal reason', () => {
      const event = new UserRemovedEvent('user-1', 'Employee terminated');

      expect(event.reason).toBe('Employee terminated');
    });

    it('should have undefined reason when not provided', () => {
      const event = new UserRemovedEvent('user-1');

      expect(event.reason).toBeUndefined();
    });
  });

  describe('UserPasswordChangedEvent', () => {
    it('should create event with aggregateId only', () => {
      const event = new UserPasswordChangedEvent('user-1');

      expect(event.aggregateId).toBe('user-1');
      expect(event.aggregateType).toBe('User');
    });

    it('should create event with password hash', () => {
      const passwordHash = '$2b$10$abcdefghijklmnopqrstuvwxyz';
      const event = new UserPasswordChangedEvent('user-1', passwordHash);

      expect(event.passwordHash).toBe(passwordHash);
    });

    it('should preserve password hash format exactly', () => {
      const passwordHash = '$argon2id$v=19$m=65540,t=3,p=4$xxx$yyy';
      const event = new UserPasswordChangedEvent('user-1', passwordHash);

      expect(event.passwordHash).toBe(passwordHash);
    });
  });

  describe('BaseDomainEvent inheritance', () => {
    it('all user events should have aggregateType property', () => {
      const createdEvent = new UserCreatedEvent(
        'user-1',
        'john',
        'john@example.com',
      );
      const updatedEvent = new UserUpdatedEvent('user-1');
      const removedEvent = new UserRemovedEvent('user-1');
      const passwordEvent = new UserPasswordChangedEvent('user-1');

      expect(createdEvent.aggregateType).toBe('User');
      expect(updatedEvent.aggregateType).toBe('User');
      expect(removedEvent.aggregateType).toBe('User');
      expect(passwordEvent.aggregateType).toBe('User');
    });

    it('all user events should preserve aggregateId', () => {
      const createdEvent = new UserCreatedEvent(
        'user-123',
        'john',
        'john@example.com',
      );
      const updatedEvent = new UserUpdatedEvent('user-456');
      const removedEvent = new UserRemovedEvent('user-789');
      const passwordEvent = new UserPasswordChangedEvent('user-999');

      expect(createdEvent.aggregateId).toBe('user-123');
      expect(updatedEvent.aggregateId).toBe('user-456');
      expect(removedEvent.aggregateId).toBe('user-789');
      expect(passwordEvent.aggregateId).toBe('user-999');
    });
  });
});
