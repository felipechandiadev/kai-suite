import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import {
  branchDiningRoom,
  kitchenUnitRoom,
  salonRoom,
  type DiningKitchenItemUpdatedPayload,
  type DiningKitchenSnapshotPayload,
  type DiningSessionUpdatedPayload,
} from './dining-realtime.types';

@Injectable()
export class DiningRealtimePublisher {
  private readonly logger = new Logger(DiningRealtimePublisher.name);
  private server?: Server;

  attachServer(server: Server) {
    this.server = server;
  }

  emitSessionUpdated(payload: DiningSessionUpdatedPayload) {
    if (!this.server) {
      this.logger.debug(
        'Dining realtime: servidor no inicializado, omitiendo session.updated',
      );
      return;
    }

    const branchRoom = branchDiningRoom({
      companyId: payload.companyId,
      branchId: payload.branchId,
    });
    this.server.to(branchRoom).emit('dining.session.updated', payload);

    if (payload.salonId) {
      const room = salonRoom({
        companyId: payload.companyId,
        branchId: payload.branchId,
        salonId: payload.salonId,
      });
      this.server.to(room).emit('dining.session.updated', payload);
    }
  }

  emitKitchenItemUpdated(payload: DiningKitchenItemUpdatedPayload) {
    if (!this.server) {
      this.logger.debug(
        'Dining realtime: servidor no inicializado, omitiendo kitchen.item_updated',
      );
      return;
    }
    const room = kitchenUnitRoom({
      companyId: payload.companyId,
      unitId: payload.unitId,
    });
    this.server.to(room).emit('dining.kitchen.item_updated', payload);
  }

  emitKitchenSnapshot(payload: DiningKitchenSnapshotPayload) {
    if (!this.server) {
      this.logger.debug(
        'Dining realtime: servidor no inicializado, omitiendo kitchen.snapshot',
      );
      return;
    }
    const room = kitchenUnitRoom({
      companyId: payload.companyId,
      unitId: payload.unitId,
    });
    this.server.to(room).emit('dining.kitchen.snapshot', payload);
  }
}
