import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { StockUpdatedPayload } from './stock-realtime.types';

@Injectable()
export class StockRealtimePublisher {
  private readonly logger = new Logger(StockRealtimePublisher.name);
  private server?: Server;

  attachServer(server: Server) {
    this.server = server;
  }

  emitStockUpdated(payload: StockUpdatedPayload) {
    if (!this.server) {
      this.logger.debug('Stock realtime: servidor no inicializado, omitiendo emit');
      return;
    }
    const room = `c:${payload.companyId}:s:${payload.storageId}`;
    this.server.to(room).emit('stock:updated', payload);
  }
}
