import type { Server } from 'socket.io';
import { DiningRealtimePublisher } from '../../dining-realtime.publisher';
import {
  branchDiningRoom,
  kitchenUnitRoom,
  salonRoom,
  type DiningKitchenItemUpdatedPayload,
  type DiningKitchenSnapshotPayload,
  type DiningSessionUpdatedPayload,
} from '../../dining-realtime.types';
import {
  DiningOrderKind,
  DiningOrderStatus,
  KitchenItemStatus,
} from '@modules/dining/domain/dining.enums';

describe('DiningRealtimePublisher', () => {
  let publisher: DiningRealtimePublisher;
  let emit: jest.Mock;
  let to: jest.Mock;
  let server: Pick<Server, 'to'>;

  beforeEach(() => {
    emit = jest.fn();
    to = jest.fn(() => ({ emit }));
    server = { to };
    publisher = new DiningRealtimePublisher();
    publisher.attachServer(server as Server);
  });

  it('salonRoom, branchDiningRoom and kitchenUnitRoom use documented patterns', () => {
    expect(
      salonRoom({
        companyId: 'c1',
        branchId: 'b1',
        salonId: 's1',
      }),
    ).toBe('company:c1:branch:b1:salon:s1');

    expect(
      branchDiningRoom({
        companyId: 'c1',
        branchId: 'b1',
      }),
    ).toBe('company:c1:branch:b1:dining');

    expect(
      kitchenUnitRoom({
        companyId: 'c1',
        unitId: 'u1',
      }),
    ).toBe('company:c1:unit:u1');
  });

  it('emitSessionUpdated targets branch room and salon room when salonId present', () => {
    const payload: DiningSessionUpdatedPayload = {
      companyId: 'c1',
      branchId: 'b1',
      salonId: 'salon-1',
      orderId: 'order-1',
      kind: DiningOrderKind.TABLE,
      status: DiningOrderStatus.OPEN,
      displayLabel: 'Mesa M1',
      diningTableId: 'table-1',
      items: [],
    };

    publisher.emitSessionUpdated(payload);

    expect(to).toHaveBeenCalledWith('company:c1:branch:b1:dining');
    expect(to).toHaveBeenCalledWith('company:c1:branch:b1:salon:salon-1');
    expect(emit).toHaveBeenCalledWith('dining.session.updated', payload);
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it('emitSessionUpdated still targets branch room when salonId is missing', () => {
    const payload: DiningSessionUpdatedPayload = {
      companyId: 'c1',
      branchId: 'b1',
      salonId: null,
      orderId: 'order-1',
      kind: DiningOrderKind.COUNTER,
      status: DiningOrderStatus.OPEN,
      displayLabel: 'Cuenta barra #1',
      items: [],
    };

    publisher.emitSessionUpdated(payload);

    expect(to).toHaveBeenCalledWith('company:c1:branch:b1:dining');
    expect(to).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('dining.session.updated', payload);
  });

  it('emitKitchenItemUpdated targets unit room', () => {
    const payload: DiningKitchenItemUpdatedPayload = {
      companyId: 'c1',
      unitId: 'unit-1',
      orderId: 'order-1',
      lineId: 'line-1',
      kitchenStatus: KitchenItemStatus.SENT,
    };

    publisher.emitKitchenItemUpdated(payload);

    expect(to).toHaveBeenCalledWith('company:c1:unit:unit-1');
    expect(emit).toHaveBeenCalledWith('dining.kitchen.item_updated', payload);
  });

  it('emitKitchenSnapshot targets unit room', () => {
    const payload: DiningKitchenSnapshotPayload = {
      companyId: 'c1',
      unitId: 'unit-1',
      queue: [],
    };

    publisher.emitKitchenSnapshot(payload);

    expect(to).toHaveBeenCalledWith('company:c1:unit:unit-1');
    expect(emit).toHaveBeenCalledWith('dining.kitchen.snapshot', payload);
  });

  it('emitBoardSnapshot targets board room on board server', () => {
    const boardEmit = jest.fn();
    const boardTo = jest.fn(() => ({ emit: boardEmit }));
    publisher.attachBoardServer({ to: boardTo } as unknown as Server);

    publisher.emitBoardSnapshot({
      companyId: 'c1',
      branchId: 'b1',
      preparing: [],
      ready: [],
      updatedAt: '2026-07-22T12:00:00.000Z',
    });

    expect(boardTo).toHaveBeenCalledWith('company:c1:branch:b1:board');
    expect(boardEmit).toHaveBeenCalledWith(
      'dining.board.snapshot',
      expect.objectContaining({ branchId: 'b1' }),
    );
  });
});
