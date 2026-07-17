import type { Server } from 'socket.io';
import { DiningRealtimePublisher } from '../../dining-realtime.publisher';
import {
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

  it('salonRoom and kitchenUnitRoom use documented patterns', () => {
    expect(
      salonRoom({
        companyId: 'c1',
        branchId: 'b1',
        salonId: 's1',
      }),
    ).toBe('company:c1:branch:b1:salon:s1');

    expect(
      kitchenUnitRoom({
        companyId: 'c1',
        unitId: 'u1',
      }),
    ).toBe('company:c1:unit:u1');
  });

  it('emitSessionUpdated targets salon room', () => {
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

    expect(to).toHaveBeenCalledWith('company:c1:branch:b1:salon:salon-1');
    expect(emit).toHaveBeenCalledWith('dining.session.updated', payload);
  });

  it('emitSessionUpdated skips when salonId is missing', () => {
    publisher.emitSessionUpdated({
      companyId: 'c1',
      branchId: 'b1',
      salonId: null,
      orderId: 'order-1',
      kind: DiningOrderKind.COUNTER,
      status: DiningOrderStatus.OPEN,
      displayLabel: 'Cuenta barra #1',
      items: [],
    });

    expect(to).not.toHaveBeenCalled();
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
});
