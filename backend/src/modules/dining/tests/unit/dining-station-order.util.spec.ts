import {
  deriveStationOrderStatus,
  itemPrepDurationMs,
  stationOrderPrepDurationMsForUnit,
} from '../../application/dining-station-order.util';
import {
  DiningStationOrderStatus,
  KitchenItemStatus,
} from '../../domain/dining.enums';

describe('dining-station-order.util', () => {
  describe('deriveStationOrderStatus', () => {
    it('returns OPEN when any line is still pending', () => {
      expect(
        deriveStationOrderStatus([
          KitchenItemStatus.READY,
          KitchenItemStatus.SENT,
        ]),
      ).toBe(DiningStationOrderStatus.OPEN);
    });

    it('returns COMPLETED when all lines are terminal non-cancel', () => {
      expect(
        deriveStationOrderStatus([
          KitchenItemStatus.READY,
          KitchenItemStatus.SERVED,
        ]),
      ).toBe(DiningStationOrderStatus.COMPLETED);
    });

    it('returns CANCELLED when all lines are cancelled', () => {
      expect(
        deriveStationOrderStatus([
          KitchenItemStatus.CANCELLED,
          KitchenItemStatus.CANCELLED,
        ]),
      ).toBe(DiningStationOrderStatus.CANCELLED);
    });
  });

  describe('itemPrepDurationMs', () => {
    it('computes ready − sent', () => {
      expect(
        itemPrepDurationMs({
          sentToKitchenAt: '2026-07-22T12:00:00.000Z',
          readyAt: '2026-07-22T12:04:32.000Z',
        }),
      ).toBe(272_000);
    });

    it('returns null when missing readyAt', () => {
      expect(
        itemPrepDurationMs({
          sentToKitchenAt: '2026-07-22T12:00:00.000Z',
          readyAt: null,
        }),
      ).toBeNull();
    });
  });

  describe('stationOrderPrepDurationMsForUnit', () => {
    it('uses min sent and max ready across non-cancelled lines', () => {
      expect(
        stationOrderPrepDurationMsForUnit([
          {
            kitchenStatus: KitchenItemStatus.READY,
            sentToKitchenAt: '2026-07-22T12:00:00.000Z',
            readyAt: '2026-07-22T12:03:00.000Z',
          },
          {
            kitchenStatus: KitchenItemStatus.READY,
            sentToKitchenAt: '2026-07-22T12:01:00.000Z',
            readyAt: '2026-07-22T12:05:00.000Z',
          },
        ]),
      ).toBe(5 * 60_000);
    });

    it('returns null if any active line lacks readyAt', () => {
      expect(
        stationOrderPrepDurationMsForUnit([
          {
            kitchenStatus: KitchenItemStatus.READY,
            sentToKitchenAt: '2026-07-22T12:00:00.000Z',
            readyAt: '2026-07-22T12:03:00.000Z',
          },
          {
            kitchenStatus: KitchenItemStatus.SENT,
            sentToKitchenAt: '2026-07-22T12:01:00.000Z',
            readyAt: null,
          },
        ]),
      ).toBeNull();
    });
  });
});
