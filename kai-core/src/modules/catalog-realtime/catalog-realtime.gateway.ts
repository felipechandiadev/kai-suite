import { HttpException, Logger, UnauthorizedException } from '@nestjs/common';
import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsStockTenantService } from '@modules/stock-realtime/ws-stock-tenant.service';
import { CatalogRealtimePublisher } from './catalog-realtime.publisher';
import { catalogCompanyRoom } from './catalog-realtime.types';

@WebSocketGateway({
  namespace: '/realtime/catalog',
  cors: { origin: true, credentials: true },
})
export class CatalogRealtimeGateway implements OnGatewayInit {
  private readonly logger = new Logger(CatalogRealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly publisher: CatalogRealtimePublisher,
    private readonly wsTenant: WsStockTenantService,
  ) {}

  afterInit() {
    this.publisher.attachServer(this.server);
  }

  async handleConnection(client: Socket) {
    const auth = (client.handshake.auth || {}) as Record<
      string,
      string | undefined
    >;
    try {
      const { activeCompanyId, currentUser } =
        await this.wsTenant.resolveSocketTenant({
          userId: auth.userId ?? auth.token,
          activeCompanyIdHeader:
            auth.activeCompanyId ?? auth['x-active-company-id'],
        });
      client.data.activeCompanyId = activeCompanyId;
      client.data.currentUser = currentUser;
      await client.join(catalogCompanyRoom(activeCompanyId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`WS catalog rechazado: ${msg}`);
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
