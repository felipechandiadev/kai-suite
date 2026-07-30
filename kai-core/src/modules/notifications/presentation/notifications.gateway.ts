import { HttpException, Logger, UnauthorizedException } from '@nestjs/common';
import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationsRealtimePublisher } from '../application/notifications-realtime.publisher';
import { WsNotificationsTenantService } from './ws-notifications-tenant.service';

@WebSocketGateway({
  namespace: '/realtime/notifications',
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway implements OnGatewayInit {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly publisher: NotificationsRealtimePublisher,
    private readonly wsTenant: WsNotificationsTenantService,
  ) {}

  afterInit() {
    this.publisher.attachServer(this.server);
  }

  async handleConnection(client: Socket) {
    const auth = (client.handshake.auth || {}) as Record<string, string | undefined>;
    try {
      const { activeCompanyId, currentUser } =
        await this.wsTenant.resolveSocketTenant({
          userId: auth.userId ?? auth.token,
          activeCompanyIdHeader:
            auth.activeCompanyId ?? auth['x-active-company-id'],
        });
      client.data.activeCompanyId = activeCompanyId;
      client.data.userId = currentUser.id;
      const room = this.publisher.userRoom(activeCompanyId, currentUser.id);
      await client.join(room);
      this.logger.debug(`WS notifications joined ${room}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`WS notifications rejected: ${msg}`);
      const status = e instanceof HttpException ? e.getStatus() : null;
      if (e instanceof UnauthorizedException || status === 401) {
        try {
          client.emit('auth_error', { reason: 'unauthorized', message: msg });
        } catch {
          // ignore
        }
      }
      client.disconnect(true);
    }
  }
}
