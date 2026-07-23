import {
  DiningOrderKind,
  KitchenItemStatus,
} from '../../domain/dining.enums';
import { buildDiningBoardSnapshot } from '../../application/dining-board-snapshot.util';

describe('buildDiningBoardSnapshot', () => {
  const companyId = 'co-1';
  const branchId = 'br-1';

  it('puts SENT fires in PREPARING and READY fires in READY', () => {
    const snapshot = buildDiningBoardSnapshot({
      companyId,
      branchId,
      orders: [
        {
          id: 'ord-1',
          kind: DiningOrderKind.TAKEAWAY,
          status: 'SENT',
          displayLabel: 'Para llevar #1',
          profile: { customerName: 'Juan' },
          lines: [
            {
              id: 'l1',
              kitchenFireId: 'fire-1',
              kitchenFireNumber: 56,
              kitchenStatus: KitchenItemStatus.SENT,
              sentToKitchenAt: '2026-07-22T12:00:00.000Z',
            },
          ],
        },
        {
          id: 'ord-2',
          kind: DiningOrderKind.COUNTER,
          status: 'READY',
          displayLabel: 'Cuenta barra #2',
          profile: { customerName: 'Ana' },
          lines: [
            {
              id: 'l2',
              kitchenFireId: 'fire-2',
              kitchenFireNumber: 57,
              kitchenStatus: KitchenItemStatus.READY,
              readyAt: '2026-07-22T12:05:00.000Z',
            },
          ],
        },
      ],
    });

    expect(snapshot.preparing).toHaveLength(1);
    expect(snapshot.preparing[0]?.kitchenFireNumber).toBe(56);
    expect(snapshot.preparing[0]?.customerName).toBe('Juan');
    expect(snapshot.ready).toHaveLength(1);
    expect(snapshot.ready[0]?.kitchenFireNumber).toBe(57);
    expect(snapshot.ready[0]?.customerName).toBe('Ana');
  });

  it('includes TABLE fires and excludes SERVED-only fires', () => {
    const snapshot = buildDiningBoardSnapshot({
      companyId,
      branchId,
      orders: [
        {
          id: 'ord-t',
          kind: DiningOrderKind.TABLE,
          status: 'SENT',
          displayLabel: 'Mesa 1',
          lines: [
            {
              id: 'lt',
              kitchenFireId: 'fire-t',
              kitchenFireNumber: 1,
              kitchenStatus: KitchenItemStatus.SENT,
            },
          ],
        },
        {
          id: 'ord-s',
          kind: DiningOrderKind.TAKEAWAY,
          status: 'READY',
          displayLabel: 'Para llevar #3',
          lines: [
            {
              id: 'ls',
              kitchenFireId: 'fire-s',
              kitchenFireNumber: 3,
              kitchenStatus: KitchenItemStatus.SERVED,
            },
          ],
        },
      ],
    });

    expect(snapshot.preparing).toHaveLength(1);
    expect(snapshot.preparing[0]?.customerName).toBe('Mesa 1');
    expect(snapshot.preparing[0]?.kitchenFireNumber).toBe(1);
    expect(snapshot.ready).toHaveLength(0);
  });

  it('keeps fire in PREPARING if any line still pending', () => {
    const snapshot = buildDiningBoardSnapshot({
      companyId,
      branchId,
      orders: [
        {
          id: 'ord-1',
          kind: DiningOrderKind.TAKEAWAY,
          status: 'PARTIAL_READY',
          displayLabel: 'Para llevar #4',
          profile: { customerName: 'Luis' },
          lines: [
            {
              id: 'l1',
              kitchenFireId: 'fire-1',
              kitchenFireNumber: 4,
              kitchenStatus: KitchenItemStatus.READY,
              readyAt: '2026-07-22T12:05:00.000Z',
            },
            {
              id: 'l2',
              kitchenFireId: 'fire-1',
              kitchenFireNumber: 4,
              kitchenStatus: KitchenItemStatus.PREPARING,
            },
          ],
        },
      ],
    });

    expect(snapshot.preparing).toHaveLength(1);
    expect(snapshot.ready).toHaveLength(0);
  });
});
