import {
  StockAdjustedEvent,
  StockTransferredEvent,
  PMPRecalculatedEvent,
  InventoryValueChangedEvent,
} from '../domain/events/stock-adjusted.event';

describe('Inventory Domain Events', () => {
  describe('StockAdjustedEvent', () => {
    it('should create event with all parameters including reason', () => {
      const event = new StockAdjustedEvent(
        'variant-1',
        'storage-1',
        100,
        110,
        10,
        'IN',
        'counting-adjustment',
      );

      expect(event.variantId).toBe('variant-1');
      expect(event.storageId).toBe('storage-1');
      expect(event.previousQty).toBe(100);
      expect(event.newQty).toBe(110);
      expect(event.diff).toBe(10);
      expect(event.adjustmentType).toBe('IN');
      expect(event.reason).toBe('counting-adjustment');
    });

    it('should create event without reason', () => {
      const event = new StockAdjustedEvent(
        'variant-2',
        'storage-2',
        50,
        45,
        -5,
        'OUT',
      );

      expect(event.variantId).toBe('variant-2');
      expect(event.adjustmentType).toBe('OUT');
      expect(event.reason).toBeUndefined();
    });

    it('should preserve adjustment type (IN or OUT)', () => {
      const eventIN = new StockAdjustedEvent('v1', 's1', 0, 10, 10, 'IN');
      const eventOUT = new StockAdjustedEvent('v1', 's1', 10, 0, -10, 'OUT');

      expect(eventIN.adjustmentType).toBe('IN');
      expect(eventOUT.adjustmentType).toBe('OUT');
    });
  });

  describe('StockTransferredEvent', () => {
    it('should create transfer event with all parameters', () => {
      const event = new StockTransferredEvent(
        'variant-1',
        'storage-1',
        'storage-2',
        25,
        ['DOC0001', 'DOC0002'],
      );

      expect(event.variantId).toBe('variant-1');
      expect(event.sourceStorageId).toBe('storage-1');
      expect(event.targetStorageId).toBe('storage-2');
      expect(event.quantity).toBe(25);
      expect(event.documentNumbers).toEqual(['DOC0001', 'DOC0002']);
    });

    it('should handle zero quantity transfer', () => {
      const event = new StockTransferredEvent(
        'variant-1',
        'storage-1',
        'storage-2',
        0,
        ['DOC0001', 'DOC0002'],
      );

      expect(event.quantity).toBe(0);
    });

    it('should handle large quantities', () => {
      const event = new StockTransferredEvent(
        'variant-1',
        'storage-1',
        'storage-2',
        999999,
        ['DOC0001', 'DOC0002'],
      );

      expect(event.quantity).toBe(999999);
    });
  });

  describe('PMPRecalculatedEvent', () => {
    it('should create PMP recalculation event', () => {
      const event = new PMPRecalculatedEvent(
        'variant-1',
        'storage-1',
        100.5,
        102.75,
      );

      expect(event.variantId).toBe('variant-1');
      expect(event.storageId).toBe('storage-1');
      expect(event.previousPmp).toBe(100.5);
      expect(event.newPmp).toBe(102.75);
    });

    it('should handle decimal PMP values', () => {
      const event = new PMPRecalculatedEvent(
        'variant-1',
        'storage-1',
        10.999,
        11.001,
      );

      expect(event.previousPmp).toBeCloseTo(10.999, 3);
      expect(event.newPmp).toBeCloseTo(11.001, 3);
    });
  });

  describe('InventoryValueChangedEvent', () => {
    it('should create inventory value changed event', () => {
      const event = new InventoryValueChangedEvent(
        'variant-1',
        'storage-1',
        1000,
        1250,
        250,
      );

      expect(event.variantId).toBe('variant-1');
      expect(event.storageId).toBe('storage-1');
      expect(event.previousValue).toBe(1000);
      expect(event.newValue).toBe(1250);
      expect(event.valueDiff).toBe(250);
    });

    it('should handle negative value differences', () => {
      const event = new InventoryValueChangedEvent(
        'variant-1',
        'storage-1',
        5000,
        4000,
        -1000,
      );

      expect(event.valueDiff).toBe(-1000);
    });

    it('should handle zero value difference', () => {
      const event = new InventoryValueChangedEvent(
        'variant-1',
        'storage-1',
        1000,
        1000,
        0,
      );

      expect(event.valueDiff).toBe(0);
    });
  });
});
