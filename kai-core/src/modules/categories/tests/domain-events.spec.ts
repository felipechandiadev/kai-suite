import { CategoryCreatedEvent } from '../domain/events/category-created.event';
import { CategoryUpdatedEvent } from '../domain/events/category-updated.event';
import { CategoryRemovedEvent } from '../domain/events/category-removed.event';

describe('Category Domain Events', () => {
  describe('CategoryCreatedEvent', () => {
    it('should create event with required parameters', () => {
      const event = new CategoryCreatedEvent('cat-1', 'Electronics');

      expect(event.aggregateId).toBe('cat-1');
      expect(event.name).toBe('Electronics');
      expect(event.aggregateType).toBe('Category');
    });

    it('should create event with all parameters', () => {
      const event = new CategoryCreatedEvent(
        'cat-1',
        'Electronics',
        'ELEC',
        'Electronic products',
        'cat-parent',
      );

      expect(event.aggregateId).toBe('cat-1');
      expect(event.name).toBe('Electronics');
      expect(event.code).toBe('ELEC');
      expect(event.description).toBe('Electronic products');
      expect(event.parentId).toBe('cat-parent');
      expect(event.aggregateType).toBe('Category');
    });

    it('should have optional properties as undefined when not provided', () => {
      const event = new CategoryCreatedEvent('cat-1', 'Electronics');

      expect(event.code).toBeUndefined();
      expect(event.description).toBeUndefined();
      expect(event.parentId).toBeUndefined();
    });
  });

  describe('CategoryUpdatedEvent', () => {
    it('should create event with aggregateId only', () => {
      const event = new CategoryUpdatedEvent('cat-1');

      expect(event.aggregateId).toBe('cat-1');
      expect(event.aggregateType).toBe('Category');
    });

    it('should create event with name update', () => {
      const event = new CategoryUpdatedEvent('cat-1', 'Updated Electronics');

      expect(event.aggregateId).toBe('cat-1');
      expect(event.name).toBe('Updated Electronics');
    });

    it('should create event with description update', () => {
      const event = new CategoryUpdatedEvent(
        'cat-1',
        undefined,
        'Updated description',
      );

      expect(event.description).toBe('Updated description');
    });
  });

  describe('CategoryRemovedEvent', () => {
    it('should create event with required parameters', () => {
      const event = new CategoryRemovedEvent('cat-1');

      expect(event.aggregateId).toBe('cat-1');
      expect(event.aggregateType).toBe('Category');
    });

    it('should create event with removal reason', () => {
      const event = new CategoryRemovedEvent('cat-1', 'Duplicate category');

      expect(event.aggregateId).toBe('cat-1');
      expect(event.reason).toBe('Duplicate category');
    });

    it('should have correct aggregate type', () => {
      const event = new CategoryRemovedEvent('cat-1');

      expect(event.aggregateType).toBe('Category');
    });
  });
});
