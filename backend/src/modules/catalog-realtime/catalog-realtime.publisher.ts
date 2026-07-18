import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import {
  catalogCompanyRoom,
  type CatalogInvalidatedPayload,
} from './catalog-realtime.types';

@Injectable()
export class CatalogRealtimePublisher {
  private readonly logger = new Logger(CatalogRealtimePublisher.name);
  private server?: Server;

  attachServer(server: Server) {
    this.server = server;
  }

  emitInvalidated(payload: CatalogInvalidatedPayload) {
    if (!this.server) {
      this.logger.debug(
        'Catalog realtime: servidor no inicializado, omitiendo emit',
      );
      return;
    }
    if (!payload.kinds?.length) {
      return;
    }
    const room = catalogCompanyRoom(payload.companyId);
    this.server.to(room).emit('catalog:invalidated', payload);
  }
}
