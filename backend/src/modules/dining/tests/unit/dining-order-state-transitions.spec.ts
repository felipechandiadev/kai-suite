import {
  DiningOrderStatus,
  KitchenItemStatus,
} from '../../domain/dining.enums';
import {
  assertOrderStatusTransition,
  canAddItems,
  canCancelLine,
  canMarkReady,
  canMarkServed,
  canRequestBill,
  canSendToKitchen,
  reopenFromBilling,
  recomputeOrderStatusFromLines,
} from '../../application/dining-order-status.util';

describe('Dining order state transitions', () => {
  describe('recomputeOrderStatusFromLines', () => {
    it('returns OPEN when all lines are DRAFT', () => {
      expect(
        recomputeOrderStatusFromLines(DiningOrderStatus.OPEN, [
          { kitchenStatus: KitchenItemStatus.DRAFT },
          { kitchenStatus: KitchenItemStatus.DRAFT },
        ]),
      ).toBe(DiningOrderStatus.OPEN);
    });

    it('returns SENT after fire when items are SENT', () => {
      expect(
        recomputeOrderStatusFromLines(DiningOrderStatus.OPEN, [
          { kitchenStatus: KitchenItemStatus.SENT },
          { kitchenStatus: KitchenItemStatus.DRAFT },
        ]),
      ).toBe(DiningOrderStatus.SENT);
    });

    it('returns PARTIAL_READY when some sent items are READY', () => {
      expect(
        recomputeOrderStatusFromLines(DiningOrderStatus.SENT, [
          { kitchenStatus: KitchenItemStatus.READY },
          { kitchenStatus: KitchenItemStatus.SENT },
        ]),
      ).toBe(DiningOrderStatus.PARTIAL_READY);
    });

    it('returns READY when all non-draft sent items are READY or SERVED', () => {
      expect(
        recomputeOrderStatusFromLines(DiningOrderStatus.PARTIAL_READY, [
          { kitchenStatus: KitchenItemStatus.READY },
          { kitchenStatus: KitchenItemStatus.SERVED },
        ]),
      ).toBe(DiningOrderStatus.READY);
    });

    it('ignores CANCELLED lines when recomputing', () => {
      expect(
        recomputeOrderStatusFromLines(DiningOrderStatus.SENT, [
          { kitchenStatus: KitchenItemStatus.CANCELLED },
          { kitchenStatus: KitchenItemStatus.READY },
        ]),
      ).toBe(DiningOrderStatus.READY);
    });

    it('preserves BILLING status', () => {
      expect(
        recomputeOrderStatusFromLines(DiningOrderStatus.BILLING, [
          { kitchenStatus: KitchenItemStatus.SENT },
        ]),
      ).toBe(DiningOrderStatus.BILLING);
    });

    it('preserves CLOSED status', () => {
      expect(
        recomputeOrderStatusFromLines(DiningOrderStatus.CLOSED, [
          { kitchenStatus: KitchenItemStatus.SERVED },
        ]),
      ).toBe(DiningOrderStatus.CLOSED);
    });
  });

  describe('assertOrderStatusTransition', () => {
    it('allows OPEN → SENT', () => {
      expect(() =>
        assertOrderStatusTransition(
          DiningOrderStatus.OPEN,
          DiningOrderStatus.SENT,
        ),
      ).not.toThrow();
    });

    it('allows READY → BILLING', () => {
      expect(() =>
        assertOrderStatusTransition(
          DiningOrderStatus.READY,
          DiningOrderStatus.BILLING,
        ),
      ).not.toThrow();
    });

    it('allows BILLING → CLOSED', () => {
      expect(() =>
        assertOrderStatusTransition(
          DiningOrderStatus.BILLING,
          DiningOrderStatus.CLOSED,
        ),
      ).not.toThrow();
    });

    it('rejects CLOSED → OPEN', () => {
      expect(() =>
        assertOrderStatusTransition(
          DiningOrderStatus.CLOSED,
          DiningOrderStatus.OPEN,
        ),
      ).toThrow('Transición de estado no permitida');
    });
  });

  describe('line action guards', () => {
    it('canSendToKitchen only when DRAFT lines exist', () => {
      expect(
        canSendToKitchen([{ kitchenStatus: KitchenItemStatus.DRAFT }]),
      ).toBe(true);
      expect(
        canSendToKitchen([{ kitchenStatus: KitchenItemStatus.SENT }]),
      ).toBe(false);
    });

    it('canMarkReady for SENT and PREPARING', () => {
      expect(canMarkReady(KitchenItemStatus.SENT)).toBe(true);
      expect(canMarkReady(KitchenItemStatus.PREPARING)).toBe(true);
      expect(canMarkReady(KitchenItemStatus.DRAFT)).toBe(false);
    });

    it('canMarkServed only from READY', () => {
      expect(canMarkServed(KitchenItemStatus.READY)).toBe(true);
      expect(canMarkServed(KitchenItemStatus.SENT)).toBe(false);
    });

    it('canCancelLine for DRAFT and SENT', () => {
      expect(canCancelLine(KitchenItemStatus.DRAFT)).toBe(true);
      expect(canCancelLine(KitchenItemStatus.SENT)).toBe(true);
      expect(canCancelLine(KitchenItemStatus.READY)).toBe(false);
    });

    it('canAddItems allows BILLING so the account can reopen', () => {
      expect(canAddItems(DiningOrderStatus.BILLING)).toBe(true);
      expect(canAddItems(DiningOrderStatus.CLOSED)).toBe(false);
    });

    it('reopenFromBilling recomputes operational status', () => {
      expect(
        reopenFromBilling([{ kitchenStatus: KitchenItemStatus.DRAFT }]),
      ).toBe(DiningOrderStatus.OPEN);
      expect(
        reopenFromBilling([{ kitchenStatus: KitchenItemStatus.SENT }]),
      ).toBe(DiningOrderStatus.SENT);
    });
  });
});
