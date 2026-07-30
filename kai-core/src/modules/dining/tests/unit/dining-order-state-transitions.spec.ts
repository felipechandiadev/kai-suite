import {
  DiningOrderKind,
  DiningOrderStatus,
  KitchenItemStatus,
} from '../../domain/dining.enums';
import {
  assertOrderStatusTransition,
  canAddItems,
  canCancelLine,
  canIssueBillOrCharge,
  canMarkReady,
  canMarkReadyForPickup,
  canMarkServed,
  canRequestBill,
  canSendToKitchen,
  effectiveKitchenFireId,
  lineNeedsKitchenComanda,
  reopenFromBilling,
  recomputeOrderStatusFromLines,
  selectLinesForKitchenFireReady,
  countPendingKitchenLines,
  selectReadyLinesForKitchenFire,
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

    it('canMarkReadyForPickup only from kitchen READY', () => {
      expect(canMarkReadyForPickup(KitchenItemStatus.READY)).toBe(true);
      expect(canMarkReadyForPickup(KitchenItemStatus.SENT)).toBe(false);
      expect(canMarkReadyForPickup(KitchenItemStatus.READY_FOR_PICKUP)).toBe(
        false,
      );
    });

    it('canMarkServed from READY_FOR_PICKUP always; READY only for TABLE', () => {
      expect(canMarkServed(KitchenItemStatus.READY_FOR_PICKUP)).toBe(true);
      expect(canMarkServed(KitchenItemStatus.READY)).toBe(false);
      expect(
        canMarkServed(KitchenItemStatus.READY, DiningOrderKind.TABLE),
      ).toBe(true);
      expect(
        canMarkServed(KitchenItemStatus.READY, DiningOrderKind.COUNTER),
      ).toBe(false);
      expect(
        canMarkServed(KitchenItemStatus.READY, DiningOrderKind.TAKEAWAY),
      ).toBe(false);
      expect(canMarkServed(KitchenItemStatus.SENT)).toBe(false);
    });

    it('canCancelLine for DRAFT and SENT', () => {
      expect(canCancelLine(KitchenItemStatus.DRAFT)).toBe(true);
      expect(canCancelLine(KitchenItemStatus.SENT)).toBe(true);
      expect(canCancelLine(KitchenItemStatus.READY)).toBe(false);
    });

    it('canAddItems rejects BILLING; use reopen instead', () => {
      expect(canAddItems(DiningOrderStatus.BILLING)).toBe(false);
      expect(canAddItems(DiningOrderStatus.READY)).toBe(true);
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

    it('lineNeedsKitchenComanda only for PREPARADO', () => {
      expect(lineNeedsKitchenComanda('PREPARADO')).toBe(true);
      expect(lineNeedsKitchenComanda('ELABORADO')).toBe(false);
      expect(lineNeedsKitchenComanda('MANUFACTURADO')).toBe(false);
      expect(lineNeedsKitchenComanda('PHYSICAL')).toBe(false);
    });

    it('canIssueBillOrCharge skips gate when no PREPARADO', () => {
      expect(
        canIssueBillOrCharge(
          [
            {
              productVariantId: 'v1',
              kitchenStatus: KitchenItemStatus.DRAFT,
            },
          ],
          { v1: 'PHYSICAL' },
        ),
      ).toBe(true);
      expect(
        canIssueBillOrCharge(
          [
            {
              productVariantId: 'v1',
              kitchenStatus: KitchenItemStatus.DRAFT,
            },
          ],
          { v1: 'ELABORADO' },
        ),
      ).toBe(true);
    });

    it('canIssueBillOrCharge requires PREPARADO ready', () => {
      expect(
        canIssueBillOrCharge(
          [
            {
              productVariantId: 'v1',
              kitchenStatus: KitchenItemStatus.SENT,
            },
          ],
          { v1: 'PREPARADO' },
        ),
      ).toBe(false);
      expect(
        canIssueBillOrCharge(
          [
            {
              productVariantId: 'v1',
              kitchenStatus: KitchenItemStatus.READY,
            },
            {
              productVariantId: 'v2',
              kitchenStatus: KitchenItemStatus.DRAFT,
            },
          ],
          { v1: 'PREPARADO', v2: 'PHYSICAL' },
        ),
      ).toBe(true);
      expect(
        canIssueBillOrCharge(
          [
            {
              productVariantId: 'v1',
              kitchenStatus: KitchenItemStatus.READY,
            },
            {
              productVariantId: 'v2',
              kitchenStatus: KitchenItemStatus.SENT,
            },
          ],
          { v1: 'PREPARADO', v2: 'PREPARADO' },
        ),
      ).toBe(false);
    });
  });

  describe('selectLinesForKitchenFireReady', () => {
    const fireA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const unit1 = '11111111-1111-1111-1111-111111111111';
    const unit2 = '22222222-2222-2222-2222-222222222222';

    it('selects all ready-able lines of the same fire in the UP', () => {
      const lines = [
        {
          id: 'l1',
          kitchenFireId: fireA,
          productionUnitId: unit1,
          kitchenStatus: KitchenItemStatus.SENT,
        },
        {
          id: 'l2',
          kitchenFireId: fireA,
          productionUnitId: unit1,
          kitchenStatus: KitchenItemStatus.PREPARING,
        },
        {
          id: 'l3',
          kitchenFireId: fireA,
          productionUnitId: unit2,
          kitchenStatus: KitchenItemStatus.SENT,
        },
        {
          id: 'l4',
          kitchenFireId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          productionUnitId: unit1,
          kitchenStatus: KitchenItemStatus.SENT,
        },
      ];
      const selected = selectLinesForKitchenFireReady(lines, fireA, unit1);
      expect(selected.map((l) => l.id)).toEqual(['l1', 'l2']);
    });

    it('does not select READY lines or other UP', () => {
      const lines = [
        {
          id: 'l1',
          kitchenFireId: fireA,
          productionUnitId: unit1,
          kitchenStatus: KitchenItemStatus.READY,
        },
        {
          id: 'l2',
          kitchenFireId: fireA,
          productionUnitId: unit2,
          kitchenStatus: KitchenItemStatus.SENT,
        },
      ];
      expect(selectLinesForKitchenFireReady(lines, fireA, unit1)).toEqual([]);
    });

    it('legacy: fireId equals line.id when kitchenFireId is null', () => {
      const lineId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
      const lines = [
        {
          id: lineId,
          kitchenFireId: null,
          productionUnitId: unit1,
          kitchenStatus: KitchenItemStatus.SENT,
        },
        {
          id: 'other',
          kitchenFireId: null,
          productionUnitId: unit1,
          kitchenStatus: KitchenItemStatus.SENT,
        },
      ];
      expect(effectiveKitchenFireId(lines[0]!)).toBe(lineId);
      expect(selectLinesForKitchenFireReady(lines, lineId, unit1).map((l) => l.id)).toEqual([
        lineId,
      ]);
    });
  });

  describe('countPendingKitchenLines / selectReadyLinesForKitchenFire', () => {
    const fireA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const unit1 = '11111111-1111-1111-1111-111111111111';

    it('counts only SENT/PREPARING in fire+UP', () => {
      const lines = [
        {
          id: 'l1',
          kitchenFireId: fireA,
          productionUnitId: unit1,
          kitchenStatus: KitchenItemStatus.SENT,
        },
        {
          id: 'l2',
          kitchenFireId: fireA,
          productionUnitId: unit1,
          kitchenStatus: KitchenItemStatus.READY,
        },
        {
          id: 'l3',
          kitchenFireId: fireA,
          productionUnitId: unit1,
          kitchenStatus: KitchenItemStatus.PREPARING,
        },
      ];
      expect(countPendingKitchenLines(lines, fireA, unit1)).toBe(2);
    });

    it('selects READY lines of fire+UP for order summary', () => {
      const lines = [
        {
          id: 'l1',
          kitchenFireId: fireA,
          productionUnitId: unit1,
          kitchenStatus: KitchenItemStatus.READY,
        },
        {
          id: 'l2',
          kitchenFireId: fireA,
          productionUnitId: unit1,
          kitchenStatus: KitchenItemStatus.SENT,
        },
        {
          id: 'l3',
          kitchenFireId: fireA,
          productionUnitId: unit1,
          kitchenStatus: KitchenItemStatus.SERVED,
        },
      ];
      expect(selectReadyLinesForKitchenFire(lines, fireA, unit1).map((l) => l.id)).toEqual([
        'l1',
      ]);
    });
  });
});
