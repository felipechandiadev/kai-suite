import { HttpException, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { In, Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { Storage } from '@modules/storages/domain/storage.entity';
import { StockRealtimePublisher } from './stock-realtime.publisher';
import { WsStockTenantService } from './ws-stock-tenant.service';

@WebSocketGateway({
  namespace: '/realtime/stock',
  cors: { origin: true, credentials: true },
})
export class StockRealtimeGateway implements OnGatewayInit {
  private readonly logger = new Logger(StockRealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly publisher: StockRealtimePublisher,
    private readonly wsTenant: WsStockTenantService,
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`WS stock rechazado: ${msg}`);
      const status = e instanceof HttpException ? e.getStatus() : null;
      if (e instanceof UnauthorizedException || status === 401) {
        try {
          client.emit('auth_error', { reason: 'unauthorized', message: msg });
        } catch {
          // ignore emit failures on half-open socket
        }
      }
      client.disconnect(true);
    }
  }

  @SubscribeMessage('subscribeStorages')
  async subscribeStorages(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { storageIds?: string[] },
  ) {
    const companyId = client.data.activeCompanyId as string | undefined;
    if (!companyId) {
      return { ok: false, error: 'unauthorized' };
    }
    const ids = Array.isArray(body?.storageIds)
      ? body.storageIds.filter((x): x is string => typeof x === 'string')
      : [];
    if (ids.length === 0) {
      return { ok: true, joined: [] as string[] };
    }

    const storages = await this.storageRepo.find({
      where: { id: In(ids), companyId },
      select: { id: true },
    });
    const allowed = new Set(storages.map((s) => s.id));

    for (const room of [...client.rooms]) {
      if (room !== client.id && room.startsWith(`c:${companyId}:s:`)) {
        await client.leave(room);
      }
    }

    const joined: string[] = [];
    for (const sid of ids) {
      if (!allowed.has(sid)) {
        continue;
      }
      const room = `c:${companyId}:s:${sid}`;
      await client.join(room);
      joined.push(sid);
    }
    return { ok: true, joined };
  }
}
