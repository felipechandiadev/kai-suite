import {
  getReceptionIdFromTransactionMetadata,
  mapTransactionLineIdToReceptionLineId,
} from '../../application/helpers/reception-stock-snapshot.util';

describe('reception-stock-snapshot.util', () => {
  describe('getReceptionIdFromTransactionMetadata', () => {
    it('returns receptionId when origin is RECEPTION', () => {
      expect(
        getReceptionIdFromTransactionMetadata({
          origin: 'RECEPTION',
          receptionId: 'rec-1',
        }),
      ).toBe('rec-1');
    });

    it('returns null when receptionId is missing', () => {
      expect(getReceptionIdFromTransactionMetadata({ origin: 'RECEPTION' })).toBeNull();
    });

    it('returns null when origin is not RECEPTION', () => {
      expect(
        getReceptionIdFromTransactionMetadata({
          origin: 'OTHER',
          receptionId: 'rec-1',
        }),
      ).toBeNull();
    });
  });

  describe('mapTransactionLineIdToReceptionLineId', () => {
    it('maps transaction lines to reception lines by order (skipping zero qty)', () => {
      const map = mapTransactionLineIdToReceptionLineId(
        [
          { id: 'rl-1', lineNumber: 1, quantity: 2 },
          { id: 'rl-2', lineNumber: 2, quantity: 0, receivedQuantity: 0 },
          { id: 'rl-3', lineNumber: 3, quantity: 1 },
        ],
        [
          { id: 'tl-1', lineNumber: 1 },
          { id: 'tl-2', lineNumber: 2 },
        ],
      );
      expect(map.get('tl-1')).toBe('rl-1');
      expect(map.get('tl-2')).toBe('rl-3');
    });
  });
});
