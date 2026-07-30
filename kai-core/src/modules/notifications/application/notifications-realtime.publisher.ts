import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { NotificationDeliveryWsPayload } from './notification-realtime.types';

@Injectable()
export class NotificationsRealtimePublisher {
  private readonly logger = new Logger(NotificationsRealtimePublisher.name);
  private server?: Server;

  attachServer(server: Server) {
    this.server = server;
  }

  userRoom(companyId: string, userId: string): string {
    return `c:${companyId}:u:${userId}`;
  }

  emitDelivery(payload: NotificationDeliveryWsPayload) {
    if (!this.server) {
      this.logger.debug('Notifications realtime: server not ready, skip emit');
      return;
    }
    const room = this.userRoom(payload.companyId, payload.userId);
    this.server.to(room).emit('notification:delivery', payload);
  }
}
