import { ProductCreatedEvent } from '../domain/events/product-created.event';
import { ProductUpdatedEvent } from '../domain/events/product-updated.event';
import { ProductRemovedEvent } from '../domain/events/product-removed.event';

describe('Product Domain Events', () => {
  describe('ProductCreatedEvent', () => {
    it('should create event with required aggregateId and name', () => {
      const event = new ProductCreatedEvent('prod-1', 'Laptop');

      expect(event.aggregateId).toBe('prod-1');
      expect(event.name).toBe('Laptop');
      expect(event.aggregateType).toBe('Product');
    });

    it('should create event with all optional parameters', () => {
      const event = new ProductCreatedEvent(
        'prod-1',
        'Laptop',
        'cat-1',
        'Dell',
        'SKU001',
      );

      expect(event.aggregateId).toBe('prod-1');
      expect(event.name).toBe('Laptop');
      expect(event.categoryId).toBe('cat-1');
      expect(event.brand).toBe('Dell');
      expect(event.sku).toBe('SKU001');
      expect(event.aggregateType).toBe('Product');
    });

    it('should have undefined optional properties when not provided', () => {
      const event = new ProductCreatedEvent('prod-1', 'Laptop');

      expect(event.categoryId).toBeUndefined();
      expect(event.brand).toBeUndefined();
      expect(event.sku).toBeUndefined();
    });

    it('should preserve product name exactly', () => {
      const event = new ProductCreatedEvent(
        'prod-1',
        'Ultra High Performance Gaming Laptop Pro Max',
      );

      expect(event.name).toBe('Ultra High Performance Gaming Laptop Pro Max');
    });
  });

  describe('ProductUpdatedEvent', () => {
    it('should create event with aggregateId only', () => {
      const event = new ProductUpdatedEvent('prod-1');

      expect(event.aggregateId).toBe('prod-1');
      expect(event.aggregateType).toBe('Product');
    });

    it('should create event with name update', () => {
      const event = new ProductUpdatedEvent('prod-1', 'Updated Laptop');

      expect(event.aggregateId).toBe('prod-1');
      expect(event.name).toBe('Updated Laptop');
    });

    it('should create event with description update', () => {
      const event = new ProductUpdatedEvent(
        'prod-1',
        'Laptop',
        'A powerful laptop for professionals',
      );

      expect(event.name).toBe('Laptop');
      expect(event.description).toBe('A powerful laptop for professionals');
    });

    it('should create event with isActive flag', () => {
      const event = new ProductUpdatedEvent(
        'prod-1',
        'Laptop',
        undefined,
        false,
      );

      expect(event.aggregateId).toBe('prod-1');
      expect(event.isActive).toBe(false);
    });

    it('should create event with all update parameters', () => {
      const event = new ProductUpdatedEvent(
        'prod-1',
        'Updated Laptop',
        'Updated description',
        true,
      );

      expect(event.aggregateId).toBe('prod-1');
      expect(event.name).toBe('Updated Laptop');
      expect(event.description).toBe('Updated description');
      expect(event.isActive).toBe(true);
    });

    it('should handle partial updates', () => {
      const eventNameOnly = new ProductUpdatedEvent('prod-1', 'New Name');
      const eventDescriptionOnly = new ProductUpdatedEvent(
        'prod-1',
        undefined,
        'New Description',
      );
      const eventActiveOnly = new ProductUpdatedEvent(
        'prod-1',
        undefined,
        undefined,
        true,
      );

      expect(eventNameOnly.name).toBe('New Name');
      expect(eventNameOnly.description).toBeUndefined();

      expect(eventDescriptionOnly.description).toBe('New Description');
      expect(eventDescriptionOnly.name).toBeUndefined();

      expect(eventActiveOnly.isActive).toBe(true);
    });
  });

  describe('ProductRemovedEvent', () => {
    it('should create event with aggregateId only', () => {
      const event = new ProductRemovedEvent('prod-1');

      expect(event.aggregateId).toBe('prod-1');
      expect(event.aggregateType).toBe('Product');
    });

    it('should create event with removal reason', () => {
      const event = new ProductRemovedEvent(
        'prod-1',
        'Out of stock permanently',
      );

      expect(event.aggregateId).toBe('prod-1');
      expect(event.reason).toBe('Out of stock permanently');
      expect(event.aggregateType).toBe('Product');
    });

    it('should have undefined reason when not provided', () => {
      const event = new ProductRemovedEvent('prod-1');

      expect(event.reason).toBeUndefined();
    });

    it('should preserve reason message exactly', () => {
      const reason = 'Product discontinued due to supplier discontinuation';
      const event = new ProductRemovedEvent('prod-1', reason);

      expect(event.reason).toBe(reason);
    });
  });

  describe('BaseDomainEvent inheritance', () => {
    it('all product events should have aggregateType property', () => {
      const createdEvent = new ProductCreatedEvent('prod-1', 'Laptop');
      const updatedEvent = new ProductUpdatedEvent('prod-1');
      const removedEvent = new ProductRemovedEvent('prod-1');

      expect(createdEvent.aggregateType).toBe('Product');
      expect(updatedEvent.aggregateType).toBe('Product');
      expect(removedEvent.aggregateType).toBe('Product');
    });

    it('all product events should preserve aggregateId', () => {
      const createdEvent = new ProductCreatedEvent('prod-123', 'Laptop');
      const updatedEvent = new ProductUpdatedEvent('prod-456');
      const removedEvent = new ProductRemovedEvent('prod-789');

      expect(createdEvent.aggregateId).toBe('prod-123');
      expect(updatedEvent.aggregateId).toBe('prod-456');
      expect(removedEvent.aggregateId).toBe('prod-789');
    });
  });
});
