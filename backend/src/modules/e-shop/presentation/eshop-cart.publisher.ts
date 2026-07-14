import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { EShopCartUpdatedPayload } from '../application/types/eshop-cart.types';

@Injectable()
export class EShopCartPublisher {
  private readonly logger = new Logger(EShopCartPublisher.name);
  private server?: Server;

  attachServer(server: Server) {
    this.server = server;
  }

  emitCartUpdated(cartId: string, payload: EShopCartUpdatedPayload) {
    if (!this.server) {
      this.logger.debug('Cart realtime: servidor no inicializado, omitiendo emit');
      return;
    }
    this.server.to(`cart:${cartId}`).emit('cart.updated', payload);
  }
}
