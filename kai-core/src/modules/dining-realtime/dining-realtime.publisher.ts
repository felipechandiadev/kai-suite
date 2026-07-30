import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { DiningBoardSnapshotDto } from '@modules/dining/application/dining-board-snapshot.util';
import {
  branchDiningRoom,
  boardBranchRoom,
  kitchenUnitRoom,
  salonRoom,
  type DiningKitchenItemUpdatedPayload,
  type DiningKitchenSnapshotPayload,
  type DiningSessionUpdatedPayload,
} from './dining-realtime.types';

@Injectable()
export class DiningRealtimePublisher {
  private readonly logger = new Logger(DiningRealtimePublisher.name);
  /** Namespace `/realtime/dining` (staff). */
  private diningServer?: Server;
  /** Namespace `/realtime/dining-board` (público). */
  private boardServer?: Server;

  attachServer(server: Server) {
    this.diningServer = server;
  }

  attachBoardServer(server: Server) {
    this.boardServer = server;
  }

  emitSessionUpdated(payload: DiningSessionUpdatedPayload) {
    if (!this.diningServer) {
      this.logger.debug(
        'Dining realtime: servidor no inicializado, omitiendo session.updated',
      );
      return;
    }

    const branchRoom = branchDiningRoom({
      companyId: payload.companyId,
      branchId: payload.branchId,
    });
    this.diningServer.to(branchRoom).emit('dining.session.updated', payload);

    if (payload.salonId) {
      const room = salonRoom({
        companyId: payload.companyId,
        branchId: payload.branchId,
        salonId: payload.salonId,
      });
      this.diningServer.to(room).emit('dining.session.updated', payload);
    }
  }

  emitKitchenItemUpdated(payload: DiningKitchenItemUpdatedPayload) {
    if (!this.diningServer) {
      this.logger.debug(
        'Dining realtime: servidor no inicializado, omitiendo kitchen.item_updated',
      );
      return;
    }
    const room = kitchenUnitRoom({
      companyId: payload.companyId,
      unitId: payload.unitId,
    });
    this.diningServer.to(room).emit('dining.kitchen.item_updated', payload);
  }

  emitKitchenSnapshot(payload: DiningKitchenSnapshotPayload) {
    if (!this.diningServer) {
      this.logger.debug(
        'Dining realtime: servidor no inicializado, omitiendo kitchen.snapshot',
      );
      return;
    }
    const room = kitchenUnitRoom({
      companyId: payload.companyId,
      unitId: payload.unitId,
    });
    this.diningServer.to(room).emit('dining.kitchen.snapshot', payload);
  }

  emitBoardSnapshot(payload: DiningBoardSnapshotDto) {
    if (!this.boardServer) {
      this.logger.debug(
        'Dining realtime: board server no inicializado, omitiendo board.snapshot',
      );
      return;
    }
    const room = boardBranchRoom({
      companyId: payload.companyId,
      branchId: payload.branchId,
    });
    this.boardServer.to(room).emit('dining.board.snapshot', payload);
    this.boardServer.to(room).emit('dining.board.updated', payload);
  }
}
